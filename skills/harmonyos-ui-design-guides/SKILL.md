---
name: harmonyos-ui-design-guides
description: 查 HarmonyOS UI 设计规范、视觉风格(色彩/字体/图标)、控件设计规范(底部页签/标题栏/弹窗等)、交互规范、多设备适配设计时触发(如 "底部页签怎么设计""暗色模式色彩规范""弹窗设计规范""折叠屏适配设计""应用图标规范")。对应 harmonyos-ui-design-guides-mcp 的 search_design_guides / get_design_guide / list_design_guides_by_topic 工具,检索 166 篇 UI 设计指南。注意:这是查"设计怎么做"(视觉/交互/控件设计规范),若查 API 用法请用 harmonyos-guides,查接口定义用 harmonyos-api-references,查场景最佳实践用 harmonyos-best-practices。
---

# 鸿蒙 UI 设计指南 检索指引

本地有 166 篇 HarmonyOS UI 设计指南(设计规范、视觉风格、控件设计、交互、多设备适配),通过 `harmonyos-ui-design-guides` MCP 检索。**在为用户做 UI 设计决策、选控件样式、定视觉规范时,先检索官方设计指南,遵循鸿蒙设计语言,不要凭印象套用其他平台规范。**

## 何时用本 Skill(而非 guides/api-references/best-practices)

- ✅ 用本指南:查**设计怎么做**——视觉规范(色彩/字体/图标/圆角/间距)、控件设计(底部页签/标题栏/弹窗/按钮的样式与状态)、交互规范(手势/动效/转场)、多设备适配设计(折叠屏/平板/一多布局)、应用 UX 体验标准。例:"底部页签设计规范""暗色模式色彩""弹窗样式""折叠屏适配""应用图标"。
- ❌ 用 guides:查 **API 怎么用**(代码层面调用)。
- ❌ 用 api-references:查**接口精确定义**(参数/枚举)。
- ❌ 用 best-practices:查**场景最佳实践 + 参考代码**。
- 配合:先本指南定设计规范,再用 guides/api-references 查实现该设计的 API。

## 检索流程

1. **检索**:`search_design_guides`,用 `设计主题/控件/规范` 关键词(中英文均可,如 `底部页签 导航`、`色彩 暗色模式`、`弹窗 设计规范`、`折叠屏 适配`)。返回按相关度排序的设计指南列表(含标题、分类路径)。

2. **读全文**:对最相关的命中调 `get_design_guide({name:"<docId>"})` 读完整设计指南,理解规范要求、尺寸参数、状态定义、示例。

3. **依据规范设计**:按官方设计语言实现,色彩/尺寸/间距/控件状态以指南为准,不套用其他平台(iOS Material)规范。

## 辅助

- 不确定某主题归哪类时,用 `list_design_guides_by_topic()` 看顶级类(通用设计基础/控件/针对多设备设计/系统特性&能力/应用设计最佳实践/元服务设计/人机交互/应用 UX 体验标准),再 `list_design_guides_by_topic({topic:"控件"})` 下钻,支持传完整路径前缀(如 `控件 / 导航类`)进一步缩小。
- docId 即文件名(不含 .md),如 `bottomtab-0000001956787789`、`color-0000001776857164`(含数字后缀,原样使用)。

## 反模式(避免)

- ❌ 不查设计指南就定 UI,套用 iOS/Material/Web 规范——鸿蒙有独立设计语言(HarmonyOS Design)。
- ❌ 凭印象定色彩/尺寸/圆角/间距——这些有明确规范值,需查证。
- ❌ 把设计指南当 API 文档用——它讲"设计成什么样",不讲"代码怎么写"(那看 guides/api-references)。
