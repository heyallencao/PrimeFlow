---
name: pf-brief
description: "轻量任务简报器。把模糊输入压成可进入 roundtable 或 writing-plan 的一页 brief，不替代方向裁决。"
layer: decision
owner: brief
inputs:
  - task_description
  - context
  - constraints
outputs:
  - brief_document
  - suggested_next_skill
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
---

# Brief

## 一句话定义

轻量任务简报器——先把散乱输入压成一页可执行简报，再交给现有决策主链继续处理。

## 为什么这个 skill 存在

当用户输入散乱时，agent 最容易犯的错误是"从最具体的那句话开始执行"，把一个 context 问题错认为 execution 问题。brief 的存在是为了在进入决策和执行之前，先把"这轮到底在做什么"压成一句清楚的话。压不出来，说明还需要 roundtable；压出来了，才能保证后面的工作建立在正确的前提上。

## 定位

当用户给出的需求还很散、信息分布在多句话里，或需要先快速整理“这轮到底在做什么”时，进入 brief。

当问题本身已经需要方向收敛时，brief 只做整理，不替代 `roundtable`。

当方向已经清楚，只差定义当前块时，brief 可把输入压给 `writing-plan`，但不替代计划本身。

## 职责边界

### 负责什么

- 把用户原始输入压成一页 brief
- 提炼任务目标、约束、未知项、成功标准
- 推荐后继进入 `roundtable` 或 `writing-plan`
- 降低从自然语言描述进入 PrimeFlow 的摩擦

### 不负责什么

- brief 不做最终方向裁决
- brief 不写 execution plan
- brief 不做代码实现
- brief 不替代 `roundtable`、`writing-plan`

## 何时进入

适合进入 brief 的情况：

- 用户一下说了很多背景，但没有明确当前目标
- 用户知道想做什么，但还没压成清楚议题
- 团队要先对齐“这轮在做什么”，再进入正式决策

不适合进入 brief 的情况：

- 已经明确要 `roundtable`
- 已经明确要 `writing-plan`
- 已经是 `build-ready` / `release-ready`

## Agent 差异注意事项

- Claude / Codex / Gemini 统一使用 `/pf-brief`
- 不同 agent 可以有不同展示或补全体验，但公开入口统一为 `/pf-*`
- 不同 agent 可以有不同提示语气，但 `next_skill` 只能指向 `roundtable` 或 `writing-plan`

## 输出目标

brief 的目标是产出一页足够短、足够清楚的工作输入，至少包含：

- 这轮要解决什么
- 为什么现在做
- 已知约束是什么
- 还缺什么信息
- 下一步更适合进哪个 skill

## Brief 文档格式

```markdown
## Brief

**任务**：[一句话描述这轮要做什么]
**背景**：[必要背景，2-4句]
**目标**：[这轮最想达成什么]
**非目标**：[明确这轮不做什么]
**约束**：[时间、技术、协作、发布等约束]
**未知项**：[还没确认、可能影响方向的点]
**建议下一步**：[roundtable / writing-plan]
**为什么**：[为什么从这个 skill 继续最合理]
```

## 合规锚点

> **如果一句话压不出来，不要假装已经压出来。** 在"任务"字段里写不出一句清晰话，是进入 roundtable 的信号，不是继续往下写 brief 的理由。
>
> **brief 不是 roundtable 的替代品。** 如果你在 brief 里发现自己开始讨论方向、权衡路径，停下来，推荐去 roundtable。
>
> **未知项必须写出来，不得省略。** 一个没有"未知项"的 brief 不是好的 brief，它只是一份假装没有问题的文档。

## 路由规则

- 如果问题还没压成一个明确议题，`next_skill = roundtable`
- 如果方向其实已经清楚，只差压成当前块，`next_skill = writing-plan`
- 如果信息仍明显不足，允许在 brief 中标出未知项，但不要伪装成已收敛

## 工作流

### 步骤 1：去噪

- 去掉重复背景
- 去掉和当前轮次无关的信息
- 保留会影响方向或范围判断的约束

### 步骤 2：压一句话任务

- 把输入压成一句“这轮真正要做什么”
- 如果压不出来，说明更适合 `roundtable`

### 步骤 3：补齐最小结构

- 任务
- 背景
- 目标
- 非目标
- 约束
- 未知项

### 步骤 4：交回主链

- 需要方向收敛 → `roundtable`
- 方向已清楚 → `writing-plan`

## 输出格式

```markdown
## Brief

**任务**：[一句话任务]
**背景**：[2-4句]
**目标**：[本轮目标]
**非目标**：[本轮不做什么]
**约束**：[关键约束]
**未知项**：[仍未确认的点]
**建议下一步**：[roundtable / writing-plan]
**原因**：[为什么]
```

## 最小输出示例

```markdown
## Brief

**任务**：给现有设置页补一个通知开关，并明确这轮最小闭环。
**背景**：用户已经提出需求，但当前输入混合了背景、实现想法和后续扩展点。现在先把这轮真正要做的事情压清楚。
**目标**：明确当前任务、边界和建议后继 skill。
**非目标**：这轮不扩展通知系统整体架构。
**约束**：不能影响现有设置页其他行为；需要保持收口诚实。
**未知项**：通知开关是否涉及后端持久化尚未确认。
**建议下一步**：`roundtable`
**原因**：当前仍有技术和范围上的未决问题，适合先做方向收敛。
```

## Decision 契约

**decision**: brief-defined
**confidence**: 0.9
**rationale**: 已将原始输入压成可继续推进的一页 brief，并明确说明应进入 roundtable 还是 writing-plan
**fallback**: 如果简报后仍看不清真正议题，回到 roundtable 做方向收敛
**escalate**: false
**next_skill**: roundtable 或 writing-plan
**next_action**: 按 brief 建议进入下一步决策 skill

## 状态更新

```bash
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set last_decision "brief-defined" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.latest_brief_status "defined" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"brief\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"brief-defined\",\"next_skill\":\"${NEXT_SKILL:-roundtable}\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 没有把 brief 写成小号 roundtable
- [ ] 没有把 brief 写成小号 writing-plan
- [ ] 已明确下一步该进哪个 skill
- [ ] 已标出未知项，没有假装问题已经收敛
