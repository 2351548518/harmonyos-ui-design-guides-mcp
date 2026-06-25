#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getStore, readDoc, type DocMeta } from "./data.js";
import { search } from "./search.js";

const store = getStore();

const server = new McpServer({
  name: "harmonyos-ui-design-guides",
  version: "0.1.0",
});

const SEP = " / ";

/**
 * Normalize a category path for tolerant prefix matching: strip full/half-width
 * parenthetical qualifiers from each segment, e.g.
 * "媒体 / Media Kit（媒体服务）" -> "媒体 / Media Kit".
 * Lets users drill down without knowing the exact parenthetical suffix.
 */
function normPath(p: string): string {
  return p
    .split(SEP)
    .map((seg) => seg.replace(/[(（][^)）]*[)）]/g, "").trim())
    .join(SEP)
    .trim();
}

/* ------------------------------------------------------------------ *
 * Tool 1: search_design_guides
 * ------------------------------------------------------------------ */
server.tool(
  "search_design_guides",
  "检索鸿蒙 UI 设计指南(Full-text search over 166 HarmonyOS UI design guide docs). " +
    "用于查设计规范、视觉风格、控件设计、交互规范、多设备适配设计. 输入设计主题/控件/规范关键词(中英文均可, " +
    "如 '底部页签 导航'、'色彩 暗色模式'、'弹窗 设计规范'、'折叠屏 适配'). " +
    "返回最相关的设计指南列表(含标题、分类路径). 拿到 docId 后用 get_design_guide 读全文.",
  {
    query: z.string().describe("检索关键词,设计主题/控件/规范"),
    limit: z.number().int().positive().max(30).default(8).describe("返回条数,默认 8"),
  },
  async ({ query, limit }) => {
    const hits = search(store, query, limit);
    if (hits.length === 0) {
      return text(`未找到与 "${query}" 相关的设计指南。可尝试更换关键词,或用 list_design_guides_by_topic 浏览分类。`);
    }
    const lines = hits.map((h, i) => `${i + 1}. ${h.docId} — ${h.title}\n   路径: ${h.path}`);
    return text(
      `命中 ${hits.length} 篇(按相关度排序):\n\n${lines.join("\n\n")}\n\n` +
        `提示: 用 get_design_guide({name:"<docId>"}) 读全文.`
    );
  }
);

/* ------------------------------------------------------------------ *
 * Tool 2: get_design_guide
 * ------------------------------------------------------------------ */
server.tool(
  "get_design_guide",
  "读取指定 UI 设计指南的完整 Markdown 正文(Read full markdown of a design guide by its docId/fileName). " +
    "docId 即文件名(不含 .md),如 bottomtab-0000001956787789、color-0000001776857164.",
  {
    name: z.string().describe("文档标识 docId(即文件名,不含 .md)"),
  },
  async ({ name }) => {
    const body = readDoc(store.docsDir, name);
    if (body === null) {
      return text(`设计指南 "${name}" 不存在。请确认 docId,可通过 search_design_guides 或 list_design_guides_by_topic 获取。`);
    }
    return text(body);
  }
);

/* ------------------------------------------------------------------ *
 * Tool 3: list_design_guides_by_topic (支持多级下钻)
 * ------------------------------------------------------------------ */
server.tool(
  "list_design_guides_by_topic",
  "按分类路径浏览鸿蒙 UI 设计指南(Browse design guides by topic path, supports drilling down). " +
    "不传 topic 时返回所有顶级类及文档数; 传入 topic 时返回该路径下所有文档(支持前缀匹配下钻, " +
    "如 '控件' 返回控件类全部, '控件 / 导航类' 进一步下钻). " +
    "顶级类: 通用设计基础、控件、针对多设备设计、系统特性&能力、应用设计最佳实践、元服务设计、人机交互、应用 UX 体验标准 等.",
  {
    topic: z
      .string()
      .optional()
      .describe("分类路径(顶级或任意前缀)。省略则返回所有顶级类。"),
  },
  async ({ topic }) => {
    if (!topic) {
      const rows = [...store.topics.entries()]
        .map(([t, ids]) => ({ t, n: ids.length }))
        .sort((a, b) => b.n - a.n || a.t.localeCompare(b.t));
      return text(
        `共 ${store.topics.size} 个顶级类,${store.docs.size} 篇设计指南:\n\n` +
          rows.map((r) => `- ${r.t} (${r.n})`).join("\n") +
          `\n\n用 list_design_guides_by_topic({topic:"<类名>"}) 下钻查看该类下文档.`
      );
    }
    // Prefix match: path === topic OR path startsWith "topic / ".
    // Tolerant of parenthetical qualifiers (Media Kit（媒体服务） -> Media Kit),
    // so users can drill down without the exact parenthetical suffix.
    const prefix = topic.trim();
    const normPrefix = normPath(prefix);
    const matched: DocMeta[] = [];
    for (const meta of store.docs.values()) {
      if (meta.path === prefix || meta.path.startsWith(prefix + SEP)) {
        matched.push(meta);
      } else if (normPrefix && (normPath(meta.path) === normPrefix || normPath(meta.path).startsWith(normPrefix + SEP))) {
        matched.push(meta);
      }
    }
    if (matched.length === 0) {
      return text(
        `未找到路径 "${prefix}"。顶级类: ${[...store.topics.keys()].sort().join("、")}`
      );
    }
    matched.sort((a, b) => a.path.localeCompare(b.path));
    const rows = matched.map((m) => `- ${m.docId} — ${m.path}`);
    return text(`路径 "${prefix}" 下 ${matched.length} 篇:\n\n${rows.join("\n")}`);
  }
);

/* ------------------------------------------------------------------ */
function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[harmonyos-ui-design-guides-mcp] fatal:", err);
  process.exit(1);
});
