---
name: pf-review
description: "多 persona 并行代码审查，置信度门控，Fix 分类路由。基于 verify 的证据做正式 gate，并决定后续是 qa 还是 ship。"
layer: decision
owner: review
inputs:
  - diff
  - plan_document
  - verification_report
outputs:
  - review_report
  - findings
  - review_verdict
entry_modes:
  - build-ready
  - release-ready
---

# Review

## 一句话定义

证据进入正式质量关口——并行多 persona 审查 + 置信度门控 + Fix 分类路由，并决定后续是否需要 qa。

## 为什么这个 skill 存在

没有 review，agent 会把"我觉得代码没问题"当作质量结论。verify 给的是证据，review 给的是判断——这两件事不能合并。review 的存在是为了在有验证证据之后，用多个视角系统地检查"这段代码可以信任"，而不是"这段代码看起来可以信任"。

## 定位

当有证据（verify 报告）需要做正式质量判断时，进入 review。

当只想收集更多信息（那是 verify 的事），不要进入 review。

如果 diff 触及团队已反复出现的模式问题，可先轻量检索 `docs/solutions/`，复用已有 review 经验和已知风险模式。

## 不干什么

- review 不做代码实现
- review 不重跑原始检查（那是 verify 的事）
- review 不做方向决策（那是 roundtable 的事）

## 与 qa 的关系

- `review` 决定当前变更是否可以继续收口
- `review` 不等于 `qa`
- `qa` 只在存在用户路径、浏览器交互、关键集成链路或高风险运行时行为时启用

当前协议里：

- `qa_required = true` → review 通过后进入 `qa`
- `qa_required = false` → review 通过后直接进入 `ship`

要求：

- `qa_required` 必须在 review 结束前明确为 `true` 或 `false`
- 不再使用 `auto` 作为中间状态
- 拿不准时，优先判为 `true`

## Persona 池

### Always-on（每个 review 都跑）

| Persona | 职责 |
|---------|------|
| `correctness-reviewer` | 逻辑错误、边缘情况、状态 bug |
| `testing-reviewer` | 覆盖率缺口、弱断言、脆弱测试 |
| `maintainability-reviewer` | 耦合、复杂度、命名、死代码 |
| `project-standards-reviewer` | CLAUDE.md/AGENTS.md 合规性 |

### 条件激活（按 diff 内容选择）

| Persona | 触发条件 |
|---------|---------|
| `security-reviewer` | 触及 auth、public endpoints、用户输入、权限 |
| `performance-reviewer` | 触及 DB 查询、缓存、异步操作 |
| `data-migrations-reviewer` | 触及迁移文件、schema 变更 |
| `reliability-reviewer` | 触及错误处理、重试、超时、后台任务 |
| `adversarial-reviewer` | diff >= 50 行非测试变更，或触及 auth/支付/数据变更 |

## 工作流

### 模式选择

Review 有三种模式，由用户或调用者指定：

| 模式 | 何时用 | auto_fix | 退出条件 |
|------|--------|----------|---------|
| `report-only` | 快速扫描，仅需了解风险概况，不做修改 | 不应用 | 报告产出即结束 |
| `autofix` | 已知风险可控，授权自动修复 safe_auto 类问题 | 应用 safe_auto | 修复完成，报告残余工作 |
| `interactive` | 高风险变更，需要逐项确认 | 按项确认后应用 | 全部确认后结束 |

> 若未指定模式，默认 `interactive`

## 合规锚点

> **置信度 < 0.60 的 finding 必须丢弃，不是"降级"。包括 P0 在内，也不做低阈值例外。** 一个不自信的 finding 比没有 finding 更危险，因为它会分散修复资源，还不一定是真问题。
>
> **`qa_required` 必须在 review 结束前明确为 true 或 false，不允许留空。** 拿不准时，写 `true`。留空等于把这个决策推给不了解上下文的 orchestrate。
>
> **一个自信的错误 finding 比没有 finding 更有害。** 你的任务不是最大化 findings 数量，而是只报告你有足够证据支撑的结论。
>
> **没有 fresh evidence 就不应该进入 review。** 如果 verify 还没完成，先回 verify 补证据。

## 前置条件检查

- [ ] 已有 verify 产出的 fresh evidence
- [ ] 当前变更的 plan_document 可读
- [ ] `qa_required` 已明确

### Interactive 模式执行步骤

interactive 模式由 agent 逐项展示 findings，用户（或调用者）确认后处理：

```
步骤 1：展示当前 P0 findings
  → 用户确认：[接受/拒绝/修改]
  → 若接受：gated_auto 转为 safe_auto，agent 执行修复
  → 若拒绝：记录拒绝理由，保留原状

步骤 2：展示当前 P1 findings
  → 同上流程

步骤 3：展示当前 P2 findings
  → 用户确认：[接受/跳过]
  → 若接受：agent 执行修复
  → 若跳过：记为 advisory

步骤 4：展示 P3 findings
  → 仅告知，不阻塞，可批量跳过

退出条件：所有 P0/P1 已确认处理完毕
```

> 确认权归用户或明确的调用者。agent 不自行判断 P0/P1 的"可接受"标准。

### 步骤 1：范围检测

```bash
# 计算 diff 范围
_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "HEAD~10")
echo "BASE: $_BASE"

_FILE_COUNT=$(git diff --name-only $_BASE | wc -l | tr -d ' ')
_FILES=$(git diff --name-only $_BASE | head -20)
echo "Changed files: $_FILES"
echo "Changed file count: $_FILE_COUNT"

_LINES=$(git diff --numstat $_BASE | awk '{sum += $1 + $2} END {print sum}')
echo "Total changed lines: $_LINES"
```

### 步骤 2：Select Reviewers

根据 diff 内容选择 persona：

```
Review team（示例）：
- correctness (always)
- testing (always)
- maintainability (always)
- project-standards (always)
- security -- diff touches auth/endpoint
- data-migrations -- diff adds migration file
```

### 步骤 3：并行派遣 Persona

所有 always-on persona 并行运行。条件激活的 persona 按需追加。

每个 persona 返回结构化 findings：

```json
{
  "reviewer": "[persona-name]",
  "findings": [
    {
      "file": "[file:line]",
      "issue": "[问题描述]",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["证据1", "证据2"],
      "autofix_class": "safe_auto|gated_auto|manual|advisory"
    }
  ],
  "residual_risks": [],
  "testing_gaps": []
}
```

### 步骤 4：置信度门控

```bash
# 置信度 < 0.60 的 findings 全部丢弃
# 不为 P0 设单独阈值例外；严重度不替代证据质量
```

### 步骤 5：去重

```bash
# 指纹计算：normalize(file) + line_bucket(line, ±3) + normalize(title)
# 指纹相同的 findings 合并，保留最高 severity + 最高 confidence
# 2+ 个独立 persona 同时标记同一问题 → confidence +0.10（上限1.0）
```

### 步骤 6：Fix 分类

| autofix_class | owner | 含义 |
|---------------|-------|------|
| `safe_auto` | review（自apply） | 本地确定性修复，review skill 内自动应用 |
| `gated_auto` | downstream-resolver | 有具体修复方案但改变行为，需审批 |
| `manual` | human | 需要交接的可操作工作 |
| `advisory` | human/release | 仅报告用途，如学习笔记 |

### 步骤 7：Severity 校准

| 级别 | 含义 |
|------|------|
| P0 | 严重破坏、可利用漏洞、数据丢失——合并前必须修复 |
| P1 | 高影响缺陷，正常使用很可能触发——应该修复 |
| P2 | 中等问题——简单则修复 |
| P3 | 低影响、窄范围——用户自行决定 |

### 步骤 8：QA 路由判断

在输出 verdict 的同时，明确后继：

- 存在用户路径、浏览器交互、关键集成链路、高风险运行时行为 → `qa_required = true`
- 纯内部脚本、小型重构、非交互式后端修复 → `qa_required = false`
- 拿不准 → `qa_required = true`
- 拿不准且缺少足够把握 → 直接写 `qa_required = true`

## Review 报告格式

```markdown
## Review 报告

**Scope**: [files changed]
**Intent**: [变更目的，1-2句话]
**Reviewer team**: [persona列表]
**Mode**: [interactive/autofix/report-only]

### P0 — Critical

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|-------------|-------|

### P1 — High

[同上格式]

### P2 — Moderate

[同上格式]

### P3 — Low

[同上格式]

### Applied Fixes
- [已自动修复的内容]

### Residual Work
- [尚未处理的后续工作]

### Verdict
- **pass** — 无 P0/P1，可合并
- **pass_with_risks** — 有 P2/P3，需披露
- **blocked** — 有 P0/P1，必须修复

### QA Routing
- **qa_required**: [true / false]
- **reason**: [为什么需要 / 不需要 qa]
```

## Decision 契约

**decision**: review-pass
**confidence**: 0.9
**rationale**: verify 证据已存在，P0/P1 已处理或不存在，且 qa_required 已判断
**fallback**: 如果 blocked，下一步是 implement 修复
**escalate**: false
**next_skill**: `qa` 或 `ship`，取决于 qa_required

> decision = review-pass-with-risks：confidence = 0.85，有 P2/P3 披露，next_skill 仍取决于 qa_required
> decision = review-blocked：有 P0/P1 未解决，confidence = 0.9，next_skill = implement

## 状态更新

```bash
_REVIEW_RESULT="${REVIEW_RESULT:?set REVIEW_RESULT to pass|pass_with_risks|blocked}"
_REVIEW_DECISION="${REVIEW_DECISION:?set REVIEW_DECISION to review-pass|review-pass-with-risks|review-blocked}"
_QA_REQUIRED="${QA_REQUIRED:?set QA_REQUIRED to true|false}"
_REVIEW_REPORT_PATH="${REVIEW_REPORT_PATH:-}"

if [ -n "$_REVIEW_REPORT_PATH" ] && [ ! -f "$_REVIEW_REPORT_PATH" ]; then
  echo "review_report not found: $_REVIEW_REPORT_PATH"
  exit 1
fi

_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "review" >/dev/null
$_PF_CLI state set review_result "$_REVIEW_RESULT" >/dev/null
$_PF_CLI state set qa_required "$_QA_REQUIRED" >/dev/null
$_PF_CLI state set last_decision "$_REVIEW_DECISION" >/dev/null
if [ -n "$_REVIEW_REPORT_PATH" ]; then
  $_PF_CLI state set artifacts.review_report "$_REVIEW_REPORT_PATH" >/dev/null
fi

# Exit Protocol
case "$_REVIEW_RESULT" in
  pass)
    if [ "$_QA_REQUIRED" = "true" ]; then
      _EXIT_NEXT="qa"
    else
      _EXIT_NEXT="ship"
    fi
    _EXIT_CODE="ok"
    _EXIT_REASON="审查通过，进入后续流程"
    ;;
  pass_with_risks)
    if [ "$_QA_REQUIRED" = "true" ]; then
      _EXIT_NEXT="qa"
    else
      _EXIT_NEXT="ship"
    fi
    _EXIT_CODE="ok"
    _EXIT_REASON="审查通过（有风险披露），进入后续流程"
    ;;
  blocked)
    _EXIT_NEXT="implement"
    _EXIT_CODE="ok"
    _EXIT_REASON="审查驳回，需要修复"
    ;;
esac
$_PF_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"review\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_REVIEW_DECISION\",\"confidence\":0.9,\"review_result\":\"$_REVIEW_RESULT\",\"qa_required\":$_QA_REQUIRED,\"findings_p0\":${FINDINGS_P0:-0},\"findings_p1\":${FINDINGS_P1:-0},\"autofix_applied\":${AUTOFIX_APPLIED:-0}}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 每个 finding 是具体的、可操作的（不是"consider"式表述）
- [ ] Severity 校准正确（漏洞 P0，风格 P3）
- [ ] 行号与文件内容核对
- [ ] 置信度门控生效（<0.60 已丢弃）
- [ ] 去重已执行
- [ ] Fix 路由合理（safe_auto 已自动应用）
- [ ] qa_required 已明确
