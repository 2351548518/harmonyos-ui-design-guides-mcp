import * as fs from "node:fs";
import * as path from "node:path";
import { type DocMeta, type DataStore } from "./data.js";

/**
 * Tokenizer friendly to both Latin and CJK text.
 * - Latin: runs of [a-z0-9_] as one token (lowercased).
 * - CJK: each char is a token, plus adjacent 2-char bigrams for phrase recall.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  const re = /[a-z0-9_]+|[一-鿿]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    const seg = m[0];
    if (/^[a-z0-9_]+$/.test(seg)) {
      tokens.push(seg);
    } else {
      for (const ch of seg) tokens.push(ch);
      for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2));
    }
  }
  return tokens;
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

// BM25 parameters.
const K1 = 1.2; // tf saturation rate
const B = 0.75; // length normalization strength
// Down-weight CJK single-char tokens. The tokenizer emits each CJK char as a
// token (for recall) plus bigrams; single chars are noisy (启/动/组/件 match
// thousands of docs) and pile up across body lines. Cap their contribution so
// bigrams/Latin terms (the real discriminators) dominate ranking.
const CJK_SINGLE_WEIGHT = 0.3;
// Down-weight CJK bigram tokens. Bigrams are formed for EVERY adjacent CJK
// char pair, including pairs that span a real word boundary (e.g. 运动模糊 ->
// 动模, 启动模式 -> 动模). These spurious cross-boundary bigrams create false
// matches between unrelated docs. Keeping bigrams (for real phrase recall like
// 播放视频) but at reduced weight removes the spurious-match noise while
// preserving phrase signal.
const CJK_BIGRAM_WEIGHT = 0.5;

/** True for a single CJK character token (noise); Latin words pass through.
 *  The character class is the CJK Unified Ideographs range U+4E00..U+9FFF
 *  (here written with literal boundary chars; 一鿿 in source). */
function isCjkSingle(term: string): boolean {
  return term.length === 1 && /[一-鿿]/.test(term);
}

/** True for a 2-char CJK bigram token (cross-boundary noise possible). */
function isCjkBigram(term: string): boolean {
  return term.length === 2 && /[一-鿿]/.test(term);
}

/** Per-token weight: damp CJK single chars and bigrams; Latin words full weight. */
function tokenWeight(term: string): number {
  if (isCjkSingle(term)) return CJK_SINGLE_WEIGHT;
  if (isCjkBigram(term)) return CJK_BIGRAM_WEIGHT;
  return 1;
}

/* ------------------------------------------------------------------ *
 * Domain synonym expansion
 *
 * BM25 is lexical: query "弹窗" can't match a doc titled "弹出框" (no shared
 * chars/bigrams). A HarmonyOS/ArkUI synonym dictionary closes that gap: at
 * search time each query token that is a known synonym expands to its
 * group-mates (tokenized) at a reduced weight, so a "弹窗" query also scores
 * "弹出框/对话框/dialog" docs — a soft OR. Only bigram/Latin tokens are used as
 * keys (single chars would over-trigger, e.g. 弹 -> 弹性布局).
 *
 * The dictionary lives in data/synonyms.json (data-driven, editable without
 * code changes). Loaded once at first use; on any read/parse failure we fall
 * back to an empty dictionary (search still works, just without synonyms).
 * ------------------------------------------------------------------ */

// Weight applied to synonym-expanded query terms (vs 1.0 for original terms).
const SYNONYM_WEIGHT = 0.5;

/** Resolve data/ dir: sibling of dist/ (compiled) or src/ (dev) -> <pkgroot>/data. */
function dataDir(): string {
  const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
  return path.resolve(here, "..", "data");
}

/** Parse data/synonyms.json -> array of synonym groups. Returns [] on any error. */
function loadSynonymGroups(): string[][] {
  const file = path.join(dataDir(), "synonyms.json");
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const groups = Array.isArray(raw) ? raw : raw.groups;
    if (!Array.isArray(groups)) return [];
    return groups.filter((g) => Array.isArray(g) && g.length > 1).map((g) => g.map(String));
  } catch {
    return [];
  }
}

/**
 * Map a token (bigram or Latin word) -> synonym words to expand to.
 * Lazy-loaded once from the dictionary file.
 */
let _expansion: Map<string, string[]> | null = null;
function synonymExpansion(): Map<string, string[]> {
  if (_expansion) return _expansion;
  const map = new Map<string, string[]>();
  for (const group of loadSynonymGroups()) {
    for (const word of group) {
      // Only meaningful tokens (bigrams + Latin) are keys — never single chars.
      const toks = tokenize(word).filter((t) => !isCjkSingle(t));
      const others = group.filter((w) => w !== word);
      for (const tok of toks) {
        const arr = map.get(tok);
        if (arr) for (const o of others) if (!arr.includes(o)) arr.push(o);
        else map.set(tok, [...others]);
      }
    }
  }
  _expansion = map;
  return map;
}

/**
 * Add synonym-expanded terms to the query term-frequency map.
 * For each ORIGINAL query token that is a known synonym key, tokenize its
 * group-mates and merge them in at SYNONYM_WEIGHT. One level only (no
 * recursion through expanded terms). Mutates and returns qTf.
 */
function expandSynonyms(qTf: Map<string, number>): Map<string, number> {
  const expansion = synonymExpansion();
  for (const tok of [...qTf.keys()]) {
    const syns = expansion.get(tok);
    if (!syns) continue;
    for (const syn of syns) {
      for (const st of tokenize(syn)) {
        qTf.set(st, (qTf.get(st) || 0) + SYNONYM_WEIGHT);
      }
    }
  }
  return qTf;
}

/** BM25 IDF, always >= 0 (the +1 inside ln prevents negatives for very common terms). */
function bm25Idf(N: number, df: number): number {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

/**
 * BM25 score of one field, length-normalized against avgLen.
 * avgLen <= 0 disables length normalization (used for body, which is read lazily
 * and whose global average would require an extra full-corpus pass).
 */
function scoreField(
  queryTf: Map<string, number>,
  fieldTokens: string[],
  weight: number,
  idf: Map<string, number>,
  avgLen: number
): number {
  if (weight === 0) return 0;
  const fieldTf = termFreq(fieldTokens);
  const len = fieldTokens.length;
  const lenNorm = avgLen > 0 ? 1 - B + B * (len / avgLen) : 1;
  let s = 0;
  for (const [term, qf] of queryTf) {
    const tf = fieldTf.get(term);
    if (!tf) continue;
    const sat = (tf * (K1 + 1)) / (tf + K1 * lenNorm);
    s += weight * qf * (idf.get(term) ?? 0) * sat * tokenWeight(term);
  }
  return s;
}

export interface SearchHit {
  docId: string;
  title: string;
  path: string;
  score: number;
}

/**
 * Rank docs against a free-text query using BM25 (tf saturation + length
 * normalization + IDF), with per-field weights.
 *
 * Why BM25: a naive tf-weighted score lets common terms (播放/视频) that match
 * hundreds of docs pile up a large "floor" score and bury a rare discriminator
 * (e.g. "avplayer"). BM25 saturates tf so extra occurrences barely help, and
 * length-normalizes so long docs (many headings/body lines) don't win by bulk.
 *
 * score = 5*title + 3*path + 3*headings + 1*body(first 200 lines),
 * df & avgLen counted over metadata fields only (body read lazily per doc, b=0).
 */
export function search(store: DataStore, query: string, limit = 8): SearchHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const qTf = expandSynonyms(termFreq(qTokens));

  const N = store.docs.size;

  // Pass 1 (metadata only, no file IO): document frequency + avg field lengths.
  const df = new Map<string, number>();
  for (const t of qTf.keys()) df.set(t, 0);
  let sumT = 0, sumP = 0, sumH = 0;
  for (const meta of store.docs.values()) {
    const tt = tokenize(meta.title);
    const pt = tokenize(meta.path);
    const ht = tokenize(meta.headings);
    sumT += tt.length;
    sumP += pt.length;
    sumH += ht.length;
    const seen = new Set<string>([...tt, ...pt, ...ht]);
    for (const t of qTf.keys()) if (seen.has(t)) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, bm25Idf(N, d));
  const avgT = sumT / N, avgP = sumP / N, avgH = sumH / N;

  const hits: SearchHit[] = [];
  for (const meta of store.docs.values()) {
    let score = 0;
    score += scoreField(qTf, tokenize(meta.title), 5, idf, avgT);
    score += scoreField(qTf, tokenize(meta.path), 3, idf, avgP);
    score += scoreField(qTf, tokenize(meta.headings), 3, idf, avgH);
    score += scanBody(store.docsDir, meta.docId, qTf, idf);
    if (score <= 0) continue;
    hits.push({ docId: meta.docId, title: meta.title, path: meta.path, score });
  }

  hits.sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId));
  return hits.slice(0, limit);
}

/** BM25 body scan (first ~maxLines lines), weight 1, no length normalization (b=0). */
function scanBody(
  docsDir: string,
  docId: string,
  qTf: Map<string, number>,
  idf: Map<string, number>
): number {
  const file = path.join(docsDir, `${docId}.md`);
  let content: string;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return 0;
  }
  const lines = content.split(/\r?\n/, 200);
  const bodyTf = termFreq(tokenize(lines.join("\n")));
  let s = 0;
  for (const [term, qf] of qTf) {
    const tf = bodyTf.get(term);
    if (!tf) continue;
    const sat = (tf * (K1 + 1)) / (tf + K1); // b=0 -> lenNorm=1
    s += qf * (idf.get(term) ?? 0) * sat * tokenWeight(term);
  }
  return s;
}
