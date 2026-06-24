# HarmonyOS UI 设计指南 MCP 服务器

把鸿蒙 UI 设计指南(166 篇,设计规范/视觉风格/控件设计/交互/多设备适配)封装成 MCP 检索服务,供 Claude Code / opencode / Cursor / Cline 等客户端在开发时查设计规范。**文档随包发布,装包即用、零配置。**

与姊妹项目分工:
- **本服务(ui-design-guides)**:查**设计怎么做**(视觉/交互/控件设计规范)
- [`harmonyos-guides-mcp`](https://github.com/2351548518/harmonyos-guides-mcp):查 **API 用法**(代码层面)
- [`harmonyos-api-references-mcp`](https://github.com/2351548518/harmonyos-api-references-mcp):查**接口精确定义**
- [`harmonyos-best-practices-mcp`](https://github.com/2351548518/harmonyos-best-practices-mcp):查**场景最佳实践 + 参考代码**

配合:先本服务定设计规范,再用 guides/api-references 查实现该设计的 API。

## 提供的工具

| 工具 | 作用 |
|------|------|
| `search_design_guides({query, limit?})` | 全文检索设计指南(中文友好),返回相关度排序的文档列表(含标题、分类路径) |
| `get_design_guide({name})` | 读取指定设计指南(docId)的完整 Markdown 正文 |
| `list_design_guides_by_topic({topic?})` | 按分类路径浏览;支持多级下钻(如 `控件` → `控件 / 导航类`) |

数据规模:166 篇设计指南,9 个顶级类——控件(49)、针对多设备设计(26)、通用设计基础(23)、系统特性&能力(22)、应用设计最佳实践(14)、元服务设计(12)、人机交互(11)、应用 UX 体验标准(8)、变更说明(1)。

## 安装(最终用户)

无需 clone 本仓库,直接配置客户端(以 Claude Code / opencode `.mcp.json` 为例):

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

或全局安装:`npm install -g harmonyos-ui-design-guides-mcp`。任何支持 stdio 的 MCP 客户端同样配置。

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `BP_DOCS_DIR` | 包内 `data/docs` | 文档目录(一般无需改) |

## 更新

设计指南和服务器会持续更新(版本号见 `package.json`)。

**更新服务器**:

```bash
# npx -y 方式:无需手动操作,每次启动自动拉最新版
# 全局安装方式:手动更新
npm update -g harmonyos-ui-design-guides-mcp
# 或锁定最新版
npm install -g harmonyos-ui-design-guides-mcp@latest
```

更新后**重启 AI 客户端**(Claude Code / opencode / Cursor 等),让新进程加载新版 MCP。

**更新文档**:166 篇设计指南随包内置(`data/docs/`),更新 npm 包即同步更新,无需单独操作。纯文档,无代码包。

**查看版本**:
```bash
npm view harmonyos-ui-design-guides-mcp version   # 最新发布版
npm ls -g harmonyos-ui-design-guides-mcp          # 本地已装版本
```
或看客户端 MCP 面板里服务器的 `version` 字段。

## 开发与发布(维护者)

```bash
cd harmonyos-ui-design-guides-mcp
npm install
npm run build          # 编译
npm run prepack        # 拷文档到 data/ + 编译(发布前自动)
npm run selfcheck      # 自检三个工具
npm publish
```

包内含:`dist/` + `data/`(文档+索引) + README。源码 `src/` 不随包。

## 验证

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## 许可

设计指南文档源自华为 HarmonyOS 官方文档,版权归华为所有,此处仅作开发辅助检索用途。MCP 服务器代码(MIT)见 `package.json`。
