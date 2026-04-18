# PrimeFlow Agent Compatibility Matrix

这份文档不再定义新协议。

它只做一件事：

> 验证当前 `primeflow.manifest.json` 是否已经足够支撑 Claude、Codex、Gemini 三边生成一致入口。

这里的“一致”不是指 UI 长得一样，而是指：

- 推荐入口逻辑一致
- section 分组一致
- skill 名称和展示顺序一致
- 调用形态差异来自 agent 能力，而不是另一套 workflow

## 当前结论

按当前 manifest，PrimeFlow 已经能稳定表达：

- 用户意图到 skill 的推荐映射：`recommendedByIntent`
- section 级菜单顺序：`menuOrder`
- agent 默认展示风格：`presentationDefaults`
- skill 的公共分组：`entry_class`
- 同一分组内的稳定排序：`class_priority`

这意味着 agent 侧不需要再手写一套自己的入口分类表。

注意：这份矩阵只验证 manifest 是否能表达一致入口，不代替真实 agent 调用验证。对外发布前，仍需要在当前 Claude、Codex、Gemini 版本里各跑一次 `/pf-help`。

## Claude

### 期望消费方式

- 调用风格：`slash-command`
- 优先高亮 section：
  - `primaryEntry`
  - `highFrequency`
  - `closeout`

### 入口示例

```text
Primary Entry:
- /pf-help
- /pf-orchestrate
- /pf-handoff

High Frequency:
- /pf-help
- /pf-brief
- /pf-bug-triage
- /pf-pr-prep
- /pf-docs-writer

Closeout:
- /pf-review
- /pf-pr-prep
- /pf-ship
- /pf-release
- /pf-docs-writer
- /pf-knowledge
```

### 一致性判断

- Claude 可以把 slash command 作为主要交互入口
- 但 `help` 仍然只是推荐入口，不拥有正式路由权
- `orchestrate` 仍然是正式路由中枢，不应被菜单文案包装成“唯一入口”

## Codex

### 期望消费方式

- 调用风格：`slash-command`
- 优先高亮 section：
  - `primaryEntry`
  - `highFrequency`
  - `mainline`

### 入口示例

```text
Primary Entry:
- /pf-help
- /pf-orchestrate
- /pf-handoff

High Frequency:
- /pf-brief
- /pf-bug-triage
- /pf-pr-prep
- /pf-docs-writer

Mainline:
- /pf-orchestrate
- /pf-roundtable
- /pf-writing-plan
- /pf-test-first
- /pf-implement
- /pf-verify
- /pf-review
- /pf-qa
- /pf-ship
- /pf-release
- /pf-knowledge
```

### 一致性判断

- Codex 现在和 Claude 一样直接使用 `/pf-*`
- `mainline` 的顺序直接来自 `menuOrder`，不需要 agent 自己猜测
- 同类兜底排序可以使用 `entry_class + class_priority`

## Gemini

### 期望消费方式

- 调用风格：`slash-command`
- 优先高亮 section：
  - `primaryEntry`
  - `highFrequency`
  - `mainline`

### 一致性判断

- Gemini 当前和 Codex 共用同一套 `/pf-*` 调用与菜单逻辑
- 如果后续 Gemini 要高亮 `closeout` 或 `incident`，可以只改 `presentationDefaults`，不用重写技能协议

## 当前协议边界

这轮演练也验证了几个边界已经足够清楚：

- `recommendedByIntent` 管推荐，不管 section 排序
- `menuOrder` 是 section 级权威顺序
- `class_priority` 只在同一 `entry_class` 内生效
- agent 展示差异优先通过 `presentationDefaults` 表达

## 还没做的事

这份协议现在已经足够支撑入口展示，但还没有定义：

- agent 侧搜索关键词
- 每个 skill 的短标题 / badge / icon
- 更细粒度的“面向新手”与“面向老手”展示文案

这些都可以后续再加，但不属于当前 v1 必须项。
