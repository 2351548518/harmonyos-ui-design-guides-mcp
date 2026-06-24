// Self-check: drive the ui-design-guides MCP server over stdio and call each tool.
import { spawn } from "node:child_process";
import * as path from "node:path";

const serverPath = path.resolve("dist/index.js");
const proc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "inherit"] });

let buf = "";
let id = 0;
const pending = new Map();

proc.stdout.on("data", (chunk) => {
  buf += chunk.toString("utf8");
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function send(method, params) {
  const myId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(myId, (msg) => {
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    });
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
  });
}
function notify(method, params) {
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}
function callTool(name, args) {
  return send("tools/call", { name, arguments: args });
}

async function main() {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "selfcheck", version: "1.0" },
  });
  notify("notifications/initialized", {});

  const tl = await send("tools/list", {});
  console.log("=== tools/list ===");
  console.log(tl.tools.map((t) => t.name).join(", "));

  console.log("\n=== list_design_guides_by_topic() ===");
  const r1 = await callTool("list_design_guides_by_topic", {});
  console.log(r1.content[0].text.slice(0, 500));

  console.log("\n=== list_design_guides_by_topic({topic:'控件'}) [前 400 字] ===");
  const r2 = await callTool("list_design_guides_by_topic", { topic: "控件" });
  console.log(r2.content[0].text.slice(0, 400));

  console.log("\n=== search_design_guides('底部页签 导航') ===");
  const r3 = await callTool("search_design_guides", { query: "底部页签 导航" });
  console.log(r3.content[0].text);

  const firstHit = r3.content[0].text.match(/^(\S+)\s+—/m);
  if (firstHit) {
    console.log(`\n=== get_design_guide('${firstHit[1]}') [前 300 字] ===`);
    const r4 = await callTool("get_design_guide", { name: firstHit[1] });
    console.log(r4.content[0].text.slice(0, 300));
  }

  console.log("\n=== get_design_guide(missing) ===");
  const r5 = await callTool("get_design_guide", { name: "no-such-guide" });
  console.log(r5.content[0].text);

  console.log("\n=== ALL CHECKS DONE ===");
  proc.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error("SELFCHECK FAILED:", e);
  proc.kill();
  process.exit(1);
});
