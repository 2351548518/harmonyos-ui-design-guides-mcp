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
const dstDocs = path.join(pkgRoot, "data", "docs");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

if (!fs.existsSync(srcDocs)) {
  if (fs.existsSync(dstDocs) && fs.existsSync(path.join(dstDocs, "index_log.txt"))) {
    console.log(`[copy-data] 数据源不存在(${srcDocs}), 但 data/ 已有产物, 跳过拷贝。`);
    process.exit(0);
  }
  console.error(`[copy-data] 源文档目录不存在且 data/ 无产物: ${srcDocs}`);
  process.exit(1);
}

rmrf(path.join(pkgRoot, "data"));
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
  fs.copyFileSync(srcLog, path.join(dstDocs, "index_log.txt"));
  count++;
}
if (fs.existsSync(srcIndex)) {
  fs.copyFileSync(srcIndex, path.join(pkgRoot, "data", "INDEX.md"));
}

console.log(`[copy-data] 已拷贝 ${count} 个文件到 ${path.relative(projectRoot, dstDocs)}`);
