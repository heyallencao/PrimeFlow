---
name: pf-pr-prep
description: "交付信息整理器。把 review 之后的变更压成 PR/merge context，不替代 release 的发布决策。"
layer: operation
owner: pr-prep
inputs:
  - review_report
  - verification_report
  - diff
outputs:
  - pr_summary
  - merge_context
entry_modes:
  - build-ready
  - release-ready
---

# PR Prep

## 一句话定义

交付信息整理器——把变更目的、验证结果、风险披露和 reviewer 需要的信息压成可直接提交的 PR/merge context。

## 为什么这个 skill 存在

一个好的 PR 描述不只是"记录了做什么"，它还需要让 reviewer 在不重新调查整个背景的情况下，判断这个改动是不是可以信任的。pr-prep 的存在是为了把 verify / review 产生的证据链压成 reviewer 能快速消化的格式，而不是让 reviewer 从聊天记录里自己去拼上下文。

## 定位

当实现和验证已经完成，review 也给出了正式质量判断，现在需要把这轮工作的交付信息整理清楚时，进入 pr-prep。

当还没有 verify / review 证据时，不要进入 pr-prep。

当需要做最终发布决策时，去 `release`，不要让 pr-prep 代替它。

## 合规锚点

> **不得在 Validation 字段里写没有实际执行过的验证。** "已运行单元测试"只能在真的运行过之后写。如果还没验证，写"未执行"，不写"已验证"。
>
> **pr-prep 不是 release，不做发布决策。** 如果你发现自己在写"可以发布"或"发布风险低"，停下来，这是 release 的判断。
>
> **Risks 字段不能为空，不能写"无"。** 每一轮改动都有已知风险，即使风险很小。如果你认为真的没有风险，写出你为什么这么认为，而不是留空。

## 职责边界

### 负责什么

- 把这轮变更压成清楚的 PR 摘要
- 组织验证结果、风险披露、未包含项
- 为 merge / reviewer / maintainers 提供最小必要上下文
- 帮用户减少“代码写完了，但 PR 不知道怎么写”的摩擦

### 不负责什么

- pr-prep 不做质量放行
- pr-prep 不做发布决策
- pr-prep 不替代 `review`、`release`
- pr-prep 不承诺没做过的验证

## 何时进入

适合进入 pr-prep：

- review 已通过，准备提 PR
- 需要整理一版给 reviewer 的变更说明
- 需要把测试、风险、未做项清楚写出来

不适合进入 pr-prep：

- 还在实现
- 还没有 fresh evidence
- 还没过 review

## Agent 差异注意事项

- Claude / Codex / Gemini 统一使用 `/pf-pr-prep`
- 不同 agent 可以有不同展示或补全体验，但公开入口统一为 `/pf-*`
- 无论 agent 如何展示，pr-prep 都不能跳过 `verify` / `review` 的前置证据，也不能替代 `release`

## 输出目标

pr-prep 的目标是产出一份可以直接用在 PR 描述、merge note 或 maintainer 上下文里的简洁文档，至少包含：

- 为什么做这次改动
- 做了什么
- 怎么验证的
- 还没验证什么
- 已知风险和未包含项

## PR Summary 格式

```markdown
## Summary
- [1-3条高层变更]

## Why
- [为什么现在做这件事]

## Validation
- [测试/验证证据]

## Risks
- [已知风险或限制]

## Not Included
- [这轮没做的内容]
```

## 工作流

### 步骤 1：压目的

- 用 1-2 句话说明这轮改动要解决什么
- 不复述整个聊天历史

### 步骤 2：压变更

- 提炼 1-3 个最重要的改动点
- 避免变成逐文件 changelog

### 步骤 3：整理验证证据

- 只写真实跑过的测试和验证
- 没做过的检查明确写“未执行”或“未验证”

### 步骤 4：写风险与边界

- 已知风险
- 未包含项
- reviewer 需要额外关注的点

## 输出格式

```markdown
## PR Prep

**目标**：[1句话]

### Summary
- [高层变更]

### Why
- [为什么现在做]

### Validation
- [已执行的验证]

### Risks
- [已知风险]

### Not Included
- [本轮不包含]

### Reviewer Notes
- [reviewer 需要重点看什么]
```

## 最小输出示例

```markdown
## PR Prep

**目标**：整理这轮“新增 help/brief/bug-triage 入口”的交付上下文。

### Summary
- 新增一组高频直达 skill，降低首次进入 PrimeFlow 的摩擦。
- README 和 golden paths 已补齐对应入口说明。

### Why
- 让用户不必先理解整条主链，也能从正确入口开始。

### Validation
- 已运行 `npm run smoke`
- 已检查 manifest 中的新 skill 条目

### Risks
- agent 侧真实入口体验仍可能存在差异，需要后续继续打磨。

### Not Included
- 这轮未实现完整的 agent UI 集成。

### Reviewer Notes
- 重点看新增 skill 是否严格保持边界，没有吞掉现有主链职责。
```

## Decision 契约

**decision**: pr-context-ready
**confidence**: 0.9
**rationale**: 已基于 review 和 verify 证据整理出可交付的 PR/merge context，并保持对未验证项和风险的诚实披露
**fallback**: 如果后续 review 结论变化，重新生成 PR 上下文
**escalate**: false
**next_skill**: ship 或 release
**next_action**: 使用整理后的上下文继续交付收口

## 状态更新

```bash
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set last_decision "pr-context-ready" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.pr_prep_status "ready" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"pr-prep\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"pr-context-ready\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 没有把 pr-prep 写成 release
- [ ] 没有伪装未做过的验证
- [ ] 已明确风险与未包含项
- [ ] 输出适合直接用于 PR 或 merge context
