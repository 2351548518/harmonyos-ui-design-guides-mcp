// prepack: copy bundled UI design guide docs into harmonyos-ui-design-guides-mcp/data/.
// Source: ../Harmonyos_UI_design-guides_docs/*.md + ../index_log.txt + ../INDEX.md
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const projectRoot = path.resolve(pkgRoot, "..");

const srcDocs = path.join(projectRoot, "Harmonyos_UI_design-guides_docs");
const srcLog = path.join(projectRoot, "index_log.txt");
const srcIndex = path.join(projectRoot, "INDEX.md");
const dataDir = path.join(pkgRoot, "data");
const dstDocs = path.join(dataDir, "docs");
const dstLog = path.join(dataDir, "index_log.txt");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

if (!fs.existsSync(srcDocs)) {
  if (fs.existsSync(dstDocs) && fs.existsSync(dstLog)) {
    console.log(`[copy-data] 数据源不存在(${srcDocs}), 但 data/ 已有产物, 跳过拷贝。`);
    process.exit(0);
  }
  console.error(`[copy-data] 源文档目录不存在且 data/ 无产物: ${srcDocs}`);
  process.exit(1);
}

rmrf(dataDir);
fs.mkdirSync(dstDocs, { recursive: true });

let count = 0;
for (const entry of fs.readdirSync(srcDocs, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (entry.name.endsWith(".md")) {
    fs.copyFileSync(path.join(srcDocs, entry.name), path.join(dstDocs, entry.name));
    count++;
  }
}
if (fs.existsSync(srcLog)) {
  fs.copyFileSync(srcLog, dstLog);
}
if (fs.existsSync(srcIndex)) {
  fs.copyFileSync(srcIndex, path.join(dataDir, "INDEX.md"));
}
// Domain synonym dictionary (hand-maintained, lives at project root).
const srcSynonyms = path.join(projectRoot, "synonyms.json");
if (fs.existsSync(srcSynonyms)) {
  fs.copyFileSync(srcSynonyms, path.join(dataDir, "synonyms.json"));
}

console.log(`[copy-data] 已拷贝 ${count} 个文件到 ${path.relative(projectRoot, dstDocs)}`);
console.log(`[copy-data] 日志 -> ${path.relative(projectRoot, dstLog)}`);
