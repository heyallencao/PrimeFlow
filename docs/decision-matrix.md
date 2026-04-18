# PrimeFlow Decision Matrix

这份文档的目标是把 PrimeFlow 常用 skill 的退出语义收成一张公共对照表。

它回答的是：

- 一个 skill 结束时，稳定的 `decision` 应该是什么
- 正常情况下，`next_skill` 应该指向哪里
- 如果失败或不成立，应该回到哪里

这份文档不替代各自的 `SKILL.md`，但它提供了一份跨 agent 实现时可以共享的公共基线。

## 使用方式

当你在做 Claude / Codex / Gemini 的 agent 实现时：

- 展示方式可以不同
- 提示语可以不同
- 入口形态可以不同

但下面这些最好不要漂：

- `decision`
- `next_skill`
- `fallback`

## 高频直达 Skill

| Skill | 稳定 decision | 正常 next_skill | fallback / 回退原则 |
|------|---------------|-----------------|----------------------|
| `help` | `help-guided` | `orchestrate` 或当前最匹配的现有 skill | 无法可靠判断时默认回 `orchestrate` |
| `brief` | `brief-defined` | `roundtable` 或 `writing-plan` | 如果议题仍不清楚，回 `roundtable` |
| `bug-triage` | `triage-complete` | `writing-plan` / `diagnose` / `ship` | 后续证据推翻当前分流时，重回 `bug-triage` 或直进更合适的 skill |
| `pr-prep` | `pr-context-ready` | `ship` 或 `release` | review / verify 结论变化时，重生成上下文 |
| `docs-writer` | `docs-draft-ready` | `release` / `knowledge` / `DONE` | 缺少事实依据时，回 verify / review / release 补信息 |

## 主链 Skill

| Skill | 稳定 decision | 正常 next_skill | fallback / 回退原则 |
|------|---------------|-----------------|----------------------|
| `orchestrate` | `route-*` | 路由目标 skill | 路由循环或不确定性过高时 `escalate = true` |
| `roundtable` | `roundtable-aligned` | `writing-plan` | 信息不足或分歧无法裁决时保持 deferred / escalate |
| `writing-plan` | `block-defined` | `test-first`；低风险例外可 `implement` | 范围失真时回 `writing-plan` 重写 |
| `test-first` | `test-contract-ready` | `implement` | 行为边界不清时回 `writing-plan` |
| `implement` | `implement-complete` | `verify` | 范围或风险判断失真时回 `writing-plan` / `test-first` |
| `verify` | `verify-pass` / `verify-fail-bug` / `verify-fail-spec` | `review` / `diagnose` / `writing-plan` | 不冒充质量判断；只按证据分流 |
| `review` | `review-pass` / `review-pass-with-risks` / `review-blocked` | `qa` / `ship` / `implement` | P0/P1 未处理完不应伪装放行 |
| `qa` | `qa-pass` / `qa-partial` / `qa-fail` | `ship` / `release` / `diagnose` | 覆盖不完整时必须显式标注 partial |
| `ship` | `ship-advisory` / `ship-done` / `ship-failed` | `release` / `diagnose` | 缺少项目显式适配时默认 advisory |
| `release` | `release-full` / `release-gradual` / `release-paused` / `release-rollback` | `knowledge` / `ship` / `DONE` | 风险超阈值时 pause / rollback |
| `knowledge` | `knowledge-skip` / `knowledge-update` / `knowledge-create` | `DONE` | 高重叠时 update，不重复堆文档 |

## 关键不变量

下面这些不变量跨 agent 最好严格保持：

### 1. `help` 不直接拥有路由权

- `help` 可以推荐入口
- 但真正的正式路由仍属于 `orchestrate` 或现有 stage skill

### 1.5 `orchestrate` 是正式路由，不是唯一首用入口

- `orchestrate` 负责 entry mode 判断和主链推进
- 但用户第一次接触 PrimeFlow 时，可以先从 `help`、`brief`、`bug-triage` 这类轻量入口进入
- 这些入口负责降低起步摩擦，不负责替代 `orchestrate` 的正式路由权

### 2. `brief` 只压输入，不做方向裁决

- `brief` 的价值是降低起步摩擦
- 不是把 `roundtable` 悄悄吃掉

### 3. `bug-triage` 只分流，不查根因

- `triage-complete` 不等于 root cause found
- 根因仍属于 `diagnose`

### 4. `pr-prep` 和 `docs-writer` 都是 sidecar

- 它们帮助收口
- 但不替代 `review`、`release`、`knowledge`

## 跨 Agent 实现建议

当某个 agent 实现这些 skill 时，建议最少做这三件事：

1. 对齐 `decision`
2. 对齐 `next_skill`
3. 对齐失败时的回退说明

如果这三项都对齐了，展示风格即使不同，用户感受到的 PrimeFlow 仍然会是一套系统。

## 与其他文档的关系

- skill 边界：看 `SKILL.md`
- Agent 调用方式：看 [agent-invocations.md](./agent-invocations.md)
- 跨 agent 一致性原则：看 [agent-implementation.md](./agent-implementation.md)
