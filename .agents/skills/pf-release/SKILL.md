---
name: pf-release
description: "当 ship 已完成，现在需要决定能发布什么、声明什么、披露什么时使用。诚实收口。"
layer: operation
owner: release
inputs:
  - ship_result
  - deployment_status
  - review_report
  - qa_report
outputs:
  - release_decision
  - release_statement
entry_modes:
  - release-ready
---

# Release

## 一句话定义

诚实收口——说清楚能发什么、不能说什么、哪些验证做了、哪些没做、风险怎么披露。

## 为什么这个 skill 存在

"列出做了什么"和"披露跳过了什么"是完全不同的两件事。一个只列出已完成步骤的 release 声明，会让读者误以为所有验证都已完成。release 的存在是为了强制在发布结论里同时包含"我们没有做的事情"——因为用户和团队有权利知道这轮发布的真实风险边界。

## 定位

当 ship 报告已完成部署（ship_result = done），现在需要做最终发布决策时，进入 release。

当 ship 还在进行中时（那是 ship 的事），不要进入 release。

当发现新的需要修复的问题时（那是 diagnose 的事），不要进入 release。

## 不干什么

- release 不重开工程工作（除非发现严重问题）
- release 不做代码实现（那是 implement 的事）
- release 不做质量判断（那是 review 的事）

## 合规锚点

> **"列出做了什么"≠ 披露跳过了什么。** Release 声明必须同时包含两部分：已执行的验证，和未执行的验证（及原因）。只有前者，不是诚实的 release。
>
> **`pass_with_risks` 不能在 release 里写成"无风险发布"。** 有 P2/P3 风险必须在"已披露风险"中列出，即使这些风险不阻塞发布。
>
> **没有回滚方案，不得完成 release。** 如果回滚方案未知，先补充，再收口。"出了问题我们会处理"不是回滚方案。
>
> **P0 风险存在时，release 必须是 paused 或 rollback，不得是 full 或 gradual。** 不存在"带着 P0 先发了再说"的合法路径。

## Honest Exit 规则

- 没做过的验证，不能写成“已验证”
- 跳过的 QA，必须披露跳过依据
- `qa_result = partial`，必须披露覆盖不完整
- `pass_with_risks` 不能写成“无风险发布”

## 发布决策类型

| 决策 | 条件 |
|------|------|
| **全量发布** | 无 P0/P1 已知风险，或风险已有缓解方案 |
| **灰度发布** | 有 P2 及以下风险，小比例放量观察 |
| **暂停发布** | 有 P0/P1 未解决风险，需人工决策 |
| **回滚发布** | 发现严重问题（数据丢失、安全漏洞），需立即撤销 |

## 重开工程工作的"严重"标准

以下任一情况出现，可绕过"不重开工程工作"规则：

| 级别 | 条件 | 处置 |
|------|------|------|
| **P0** | 数据丢失或损坏、用户信息泄露、未授权访问 | 立即回滚 + 修复 + 重新测试 |
| **P1** | 核心功能完全不可用、严重性能退化（延迟 > 10x） | 修复后重新 ship |
| **非紧急** | 已知风险可缓解、有 workaround | 按正常流程下个版本修复，不阻塞当前发布 |

## 风险量化阈值

发布风险由 review 报告的 findings 严重度决定：

| 剩余 P0 | 剩余 P1 | 决策 |
|---------|---------|------|
| 0 | 0 | 全量发布 |
| 0 | ≥1 | 灰度发布（有 P1 风险需披露） |
| ≥1 | 任何 | 暂停发布，escalate = true |

> P2/P3 不影响发布决策，但必须在"已披露风险"中列出。

## Release 声明格式

```markdown
## Release 声明

**版本**：[版本号]
**发布时间**：[时间戳]
**决策**：[灰度/全量/回滚]

### 已验证
- [通过 QA 的功能列表]
- [通过测试的变更]

### 未执行或部分执行的验证
- [例如：QA 跳过 / QA partial / 仅做基础健康检查]
- [为什么可以接受]

### 已披露风险
- [已知但未解决的风险]
- [潜在影响]

### 未包含
- [这个版本不包含的功能，原因]

### 发布说明
[面向用户的变更说明]

### 回滚方案
[如果需要回滚，怎么操作]
```

## 前置条件检查

- [ ] ship 已完成（ship_result = done）
- [ ] 有 ship 报告
- [ ] 有 review 报告
- [ ] 若 `qa_required = true`，则有 QA 报告；否则需要有跳过 QA 的依据
- [ ] Pre-ship checklist 已完成

## Decision 契约

**decision**: release-full
**confidence**: 0.9
**rationale**: ship 已完成，已执行的验证与未执行的验证都已如实披露，当前风险在可接受范围内
**fallback**: 如发布后异常，通过回滚方案快速回退
**escalate**: false
**next_skill**: knowledge
**next_action**: 进入 knowledge，归档本次发布

### 分支决策

| 情况 | decision | escalate | next_skill |
|------|---------|---------|-----------|
| 全量发布 | `release-full` | false | knowledge |
| 灰度发布 | `release-gradual` | false | knowledge |
| 暂停发布 | `release-paused` | true | orchestrate（人工确认后决定） |
| 回滚发布 | `release-rollback` | true | ship（执行回滚） |

## 状态更新

```bash
_RELEASE_DECISION="${RELEASE_DECISION:?set RELEASE_DECISION to release-full|release-gradual|release-paused|release-rollback}"

# 根据实际决策设置 release_escalate 标志（供 orchestrate 读取）
_jq_escalate=false
_exit_next="knowledge"
_exit_code="ok"
_exit_reason="发布决策【$_RELEASE_DECISION】已确认"

case "$_RELEASE_DECISION" in
  release-paused)
    _jq_escalate=true
    _exit_code="escalate"
    _exit_next=""
    _exit_reason="发布暂停，需人工确认"
    ;;
  release-rollback)
    _jq_escalate=true
    _exit_code="escalate"
    _exit_next="ship"
    _exit_reason="需要回退，等待人工确认"
    ;;
esac

_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "release" >/dev/null
$_PF_CLI state set last_decision "$_RELEASE_DECISION" >/dev/null
$_PF_CLI state set release_escalate "$_jq_escalate" >/dev/null

# Exit Protocol
$_PF_CLI state set exit_code "$_exit_code" >/dev/null
$_PF_CLI state set exit_reason "$_exit_reason" >/dev/null
$_PF_CLI state set next_skill "$_exit_next" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"release\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_RELEASE_DECISION\",\"confidence\":0.9,\"release_escalate\":$_jq_escalate,\"risks_disclosed\":2}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 说清楚了能发什么
- [ ] 说清楚了不能说什么（诚实）
- [ ] 有风险披露
- [ ] 有未执行或部分执行验证的披露
- [ ] 有回滚方案
- [ ] 不是过度承诺
