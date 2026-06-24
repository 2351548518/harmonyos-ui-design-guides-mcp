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

function scoreAgainst(queryTf: Map<string, number>, fieldTokens: string[], weight: number): number {
  if (weight === 0) return 0;
  const fieldTf = termFreq(fieldTokens);
  let s = 0;
  for (const [term, qf] of queryTf) {
    const f = fieldTf.get(term);
    if (f) s += weight * qf * Math.min(f, 3);
  }
  return s;
}

export interface SearchHit {
  docId: string;
  title: string;
  path: string;
  score: number;
}

/** score = 5*title + 3*path + 3*headings + 1*body(first 200 lines, capped). */
export function search(store: DataStore, query: string, limit = 8): SearchHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const qTf = termFreq(qTokens);

  const hits: SearchHit[] = [];
  for (const meta of store.docs.values()) {
    let score = 0;
    score += scoreAgainst(qTf, tokenize(meta.title), 5);
    score += scoreAgainst(qTf, tokenize(meta.path), 3);
    score += scoreAgainst(qTf, tokenize(meta.headings), 3);
    score += scanBody(store.docsDir, meta.docId, qTf, 200);
    if (score <= 0) continue;
    hits.push({ docId: meta.docId, title: meta.title, path: meta.path, score });
  }

  hits.sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId));
  return hits.slice(0, limit);
}

function scanBody(docsDir: string, docId: string, qTf: Map<string, number>, maxLines: number): number {
  const file = path.join(docsDir, `${docId}.md`);
  let content: string;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return 0;
  }
  const lines = content.split(/\r?\n/, maxLines);
  const bodyTf = termFreq(tokenize(lines.join("\n")));
  let s = 0;
  for (const [term, qf] of qTf) {
    const f = bodyTf.get(term);
    if (f) s += qf * Math.min(f, 5);
  }
  return s;
}
