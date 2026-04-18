# SKILL.md 英文化标准模板

> 参考模板说明：本文是英文化模板草稿，不是当前 agent 契约定义来源。
> 当前真实 agent 契约：Claude / Codex / Gemini 统一使用 `/pf-*`，公共 skill 位于 `.agents/skills/pf-*`。

> 用于指导将现有 SKILL.md 从中英混排升级为国际可分享的英文版本

---

## 设计原则

1. **保留方法论深度**：英文化不是删减，是用英文重新表达同等深度的内容
2. **章节名完全英文**：不留中文章节标题，降低国际受众的认知摩擦
3. **中文内容可保留但要有英文摘要**：如果某些细节只需要中文用户理解，可以加 `> [Chinese]` 标注后附在英文之后
4. **Frontmatter 必须全英文**：这是机器可读的部分，必须标准化

---

## 标准模板

```markdown
---
name: [skill-name]
description: "[One-line: what it does + when to invoke it]"
layer: [orchestration | decision | execution | operation | support]
owner: [skill-name]
inputs: [comma-separated list]
outputs: [comma-separated list]
entry_modes: [from-scratch | aligned-offline | plan-ready | build-ready | release-ready | incident]
---

## What This Skill Does

[One sentence definition — direct and concrete. No hedging.]

**Example trigger**: [A real scenario where this skill is the right entry point]

---

## When to Enter

- [Clear condition 1]
- [Clear condition 2]
- [Clear condition 3]

## When NOT to Enter

- [Explicit exclusion 1 — what this skill does NOT do]
- [Explicit exclusion 2]
- [Explicit exclusion 3]

---

## Prerequisites

Before starting, verify:

- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]
- [ ] [Prerequisite 3]

If any prerequisite is unmet → **do not proceed**, route to [correct prior skill].

---

## How It Works

### [Mode / Step Name 1]

[Description of what happens in this mode/step]

**Inputs**: [what you need]  
**Output**: [what you produce]

### [Mode / Step Name 2]

[Description]

---

## Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field_name` | string | yes | What it means |
| `field_name` | boolean | no | What it means |

## Outputs

| Field | Values | Description |
|-------|--------|-------------|
| `output_field` | `value-a` \| `value-b` | What it means |
| `next_skill` | skill name | Where to go next |

---

## Decision Contract

```yaml
decision: [stable-label]           # e.g., "roundtable-aligned", "verify-pass"
confidence: 0.0–1.0                # 0.9+ confident | 0.5-0.6 uncertain | <0.5 escalate
rationale: |
  [2-3 sentences explaining why this decision was reached]
fallback: |
  [What to do if this decision proves wrong]
escalate: false                    # true = pause, wait for human
next_skill: [skill-name | DONE]
next_action: |
  [One concrete sentence: what to do immediately after this skill]
```

**Confidence thresholds**:
- `>= 0.90` → proceed autonomously
- `0.60–0.89` → proceed with a note in rationale
- `0.50–0.59` → note uncertainty, consider asking
- `< 0.50` → set `escalate: true`, wait for human input

---

## State Update

After this skill completes, update `.primeflow/state.json`:

```bash
./primeflow state set current_stage "[stage-name]"
./primeflow state set last_skill "[skill-name]"
# Add skill-specific fields as needed:
# ./primeflow state set verify_result "pass"
# ./primeflow state set risk_level "medium"
```

---

## Telemetry

Emit one event to `.primeflow/telemetry/events/YYYY-MM.jsonl`:

```bash
echo "{\"skill\":\"[skill-name]\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"[decision-label]\",\"confidence\":[0.0-1.0]}" \
  >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

**Optional fields** (add when available):
- `"block_name": "..."` — current execution block
- `"risk_level": "low|medium|high"` — task risk level
- `"qa_required": true|false` — whether QA gate is needed
- `"root_cause": "..."` — for diagnose skill
- `"test_pass": N, "test_fail": N` — for verify/test-first skills

---

## Quality Checklist

Before declaring this skill complete:

- [ ] Decision contract is filled with a real `decision` label (not placeholder)
- [ ] `confidence` is a number, not vague ("high", "confident")
- [ ] `next_skill` is a valid skill name or `DONE`
- [ ] State has been updated via `./primeflow state set`
- [ ] Telemetry event has been emitted
- [ ] If `escalate: true`, you have paused and explained why to the human
```

---

## 章节映射表（中文 → 英文）

| 原中文章节 | 英文对应 |
|-----------|---------|
| 一句话定义 | `## What This Skill Does` |
| 定位 / 何时进入 | `## When to Enter` |
| 不干什么 | `## When NOT to Enter` |
| 职责边界 | Part of `## When NOT to Enter` |
| 前置条件检查 | `## Prerequisites` |
| 工作方式 / 三种模式 | `## How It Works` |
| 入参 / 出参 | `## Inputs` / `## Outputs` |
| Decision 契约 | `## Decision Contract` |
| 状态更新 | `## State Update` |
| Telemetry | `## Telemetry` |
| 质量检查清单 | `## Quality Checklist` |

---

## 英文化顺序建议

按照用户使用频率排序，高频技能先英文化。当前共 **18个技能**，全部已落地：

### Round 1（最高频 - 立即开始）
1. `orchestrate` — 全局路由枢纽
2. `review` — 最常用的质量门
3. `implement` — 核心执行技能
4. `verify` — 验证证据收集
5. `diagnose` — Bug 根因调查

### Round 2（高频独立入口）
6. `help` — 新手引导 / 场景分流
7. `brief` — 模糊需求压缩为简报
8. `bug-triage` — Bug 快速分类路由
9. `pr-prep` — PR 上下文整理
10. `docs-writer` — 结果压成稳定文档

### Round 3（主链中频）
11. `writing-plan` — 计划生成
12. `test-first` — TDD 起点
13. `roundtable` — 方向对齐

### Round 4（主链收口）
14. `ship` — 发布流程
15. `release` — 发布声明
16. `qa` — QA 验证
17. `handoff` — 会话冻结与恢复
18. `knowledge` — 知识沉淀

---

## 示例：orchestrate 英文化对比

### 现在（中英混排）

```markdown
## 一句话定义

全局调度枢纽——读 state，判断入场模式，路由到下一技能。

## 不干什么

- 不执行具体的工程任务
- 不替代 roundtable 做方向裁决
```

### 英文化后

```markdown
## What This Skill Does

Global dispatch hub — reads current state, determines the appropriate entry mode, and routes to the next skill.

**Example trigger**: You have a new task and don't know which skill to start with.

## When NOT to Enter

- Do NOT use orchestrate to execute engineering work — it only routes
- Do NOT use orchestrate to make direction decisions — that's roundtable's job
- Do NOT invoke orchestrate mid-flow unless you genuinely don't know the current state
```

**英文化的关键**：不只是翻译，而是更直接、更有行动力的表达。

---

## 质量检验标准

一个技能的英文化达标，需要满足：

1. **可理解性**：英文母语工程师能在3分钟内理解这个技能的用途
2. **可操作性**：知道在什么情况下用、用完后做什么
3. **完整性**：所有章节都有内容，没有占位符
4. **一致性**：frontmatter 格式与其他技能一致
5. **深度保留**：原版的方法论精髓没有在翻译过程中丢失
