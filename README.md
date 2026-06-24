# HarmonyOS UI 设计指南 MCP 知识库

把华为鸿蒙(HarmonyOS)UI 设计指南(设计规范/视觉风格/控件设计/交互/多设备适配)封装成 MCP 检索服务,供 Claude Code / opencode / Cursor / Cline 等 AI 编程客户端在开发时调用——**做 UI 设计决策、选控件样式、定视觉规范时,先检索官方设计指南,遵循鸿蒙设计语言,不套用其他平台规范**。

## 这是什么

| 组成 | 内容 | 分发方式 |
|------|------|---------|
| **① MCP 服务器** | 检索引擎,3 个工具:设计指南全文检索 / 读指南 / 按分类路径浏览 | npm 包(`npx` 即用) |
| **② Skill** | 引导 AI"做 UI 设计先检索设计指南"的流程说明 | 复制到 skills 目录 |
| **数据源** | 166 篇设计指南 + `index_log.txt`(分类) + `INDEX.md`(目录树) | 文档随包 |

与姊妹项目分工互补:

| | 本项目(ui-design-guides) | guides | api-references | best-practices |
|---|---|---|---|---|
| 查什么 | **设计怎么做**(视觉/交互/控件设计规范) | **API 用法、调用流程** | **接口精确定义**(参数/枚举) | **场景最佳实践 + 参考代码** |
| 数据 | 166 篇设计指南 | 5489 篇指南 | 4495 篇 API 参考 | 452 篇 + 186 代码仓库 |
| 适用 | "底部页签设计规范""暗色模式色彩""折叠屏适配" | "AVPlayer 怎么初始化" | "AudioCapturer 方法签名" | "长列表丢帧优化" |

四者并列:本服务定设计规范、guides 讲 API 用法、api-references 查精确签名、best-practices 给场景实践。

## 快速开始(最终用户)

### 1. 装 MCP 服务器

无需 clone 本仓库。客户端配置(以 Claude Code / opencode 为例):

```json
{
  "mcpServers": {
    "harmonyos-ui-design-guides": {
      "command": "npx",
      "args": ["-y", "harmonyos-ui-design-guides-mcp"]
    }
  }
}
```

> 包名以实际发布为准。任何支持 stdio 的 MCP 客户端同样配置。

### 2. 装 Skill

将 `skills/harmonyos-ui-design-guides/SKILL.md` 复制到 Claude Code 的 skills 目录(如 `~/.claude/skills/`)。这让 AI 在做鸿蒙 UI 设计时自动走"先检索设计指南"的流程。

## 三个 MCP 工具

| 工具 | 作用 |
|------|------|
| `search_design_guides({query, limit?})` | 全文检索设计指南(中文友好),返回相关度排序的文档列表(含标题、分类路径) |
| `get_design_guide({name})` | 读取指定设计指南(docId)的完整 Markdown 正文 |
| `list_design_guides_by_topic({topic?})` | 按分类路径浏览;支持多级下钻(如 `控件` → `控件 / 导航类`) |

数据规模:166 篇设计指南,9 个顶级类——控件(49)、针对多设备设计(26)、通用设计基础(23)、系统特性&能力(22)、应用设计最佳实践(14)、元服务设计(12)、人机交互(11)、应用 UX 体验标准(8)、变更说明(1)。

## 工作流程(开发时)

```
用户:"底部页签怎么设计? 暗色模式色彩规范?"
   │
   ▼  Skill 触发
search_design_guides("底部页签 导航")
   │  → 命中 bottomtab-* 等(含分类路径)
   ▼
get_design_guide("bottomtab-0000001956787789")   ← 读设计规范、尺寸、状态、示例
   │
   ▼
依据鸿蒙设计语言实现(色彩/尺寸/状态以指南为准,不套用 iOS/Material)
```

## 更新

设计指南和服务器会持续更新。

**更新服务器**:`npx -y` 自动拉新版,或 `npm update -g harmonyos-ui-design-guides-mcp`。更新后**重启 AI 客户端**。
**更新文档**:随包内置,更新包即更新。
**查看版本**:`npm view harmonyos-ui-design-guides-mcp version`。

## 目录结构

```
Harmonyos_UI_Design_Guides_MCP/
├── Harmonyos_UI_design-guides_docs/      # 数据源(166 篇,不推 git)
│   ├── *.md                              # 设计指南正文
│   └── index_log.txt                     # 分类(status / docId / 多级路径)
├── INDEX.md                              # 文档目录树
│
├── harmonyos-ui-design-guides-mcp/       # ① MCP 服务器(npm 包)
│   ├── src/                              # TS 源码
│   ├── data/                             # 文档(prepack 拷入,随包)
│   ├── dist/                             # 编译产物
│   ├── scripts/
│   │   ├── copy-data.mjs                 # prepack 拷数据
│   │   └── selfcheck.mjs                 # 自检
│   └── README.md                         # MCP 详细文档
│
└── skills/harmonyos-ui-design-guides/    # ② Skill
    └── SKILL.md
```

## 维护者:开发与发布

详见 [`harmonyos-ui-design-guides-mcp/README.md`](harmonyos-ui-design-guides-mcp/README.md)。要点:

```bash
cd harmonyos-ui-design-guides-mcp
npm install
npm run build        # 编译
npm run prepack      # 拷数据到 data/ + 编译(发布前自动)
npm run selfcheck    # 自检三个工具
npm publish          # 发布到 npm
```

## 设计说明

- **为什么独立 MCP**:设计指南与代码文档(guides/api-references)用途不同——设计指南讲"设计成什么样"(视觉/交互规范),代码文档讲"怎么实现"。独立服务让 AI 能据需求选对检索源,各自的 Skill description 已刻意区分(本服务查"设计"、guides 查"用法"、api-references 查"定义"、best-practices 查"实践")。
- **多级分类路径**:设计指南路径如 `控件 / 导航类 / 底部页签`,`list_design_guides_by_topic` 支持前缀下钻。
- **检索打分**:`5×title + 3×path + 3×headings + 1×正文(前200行)`,标题全文预提取。
- **文档随包**:166 篇仅 1.7M,随 npm 包,装包即用、零配置。纯文档无代码,无需 Release 附件。

## 许可

设计指南文档源自华为 HarmonyOS 官方文档,版权归华为所有,此处仅作开发辅助检索用途。MCP 服务器代码(MIT)见 `harmonyos-ui-design-guides-mcp/package.json`。
