---
name: pf-verify
description: "当需要运行测试、检查行为、确认 claim，但还不到做正式质量关口时使用。收集 fresh evidence，不冒充质量判断。"
layer: execution
owner: verify
inputs:
  - implementation_result
  - plan_document
  - test_contract
outputs:
  - verification_report
  - verify_result
entry_modes:
  - build-ready
  - release-ready
  - plan-ready
---

# Verify

## 一句话定义

证据收集器——用 fresh evidence 确认 claim 是否站得住。不做质量判断（那是 review 的事）。

## 为什么这个 skill 存在

"代码看起来没问题"不是证据。"我觉得应该过了"不是证据。verify 的存在是为了把"我相信这是对的"和"我有证据证明这是对的"区分开来。这个区分是整个 PrimeFlow 工作流诚实性的基础——没有 verify 的结论，就没有 review 的判断依据，就没有 release 的可信度。

## 定位

当 implement 已完成，现在需要验证当前 claim 是否有实际证据支撑时，进入 verify。

当想做一个正式质量关口（那是 review 的事），不要进入 verify。

当根因不明时（那是 diagnose 的事），不要进入 verify。

## 不干什么

- verify 不做质量判断（那是 review 的事）
- verify 不重跑原始检查（只验证当前 claim）
- verify 不修复问题（那是 implement 或 diagnose 的事）

## 合规锚点

> **看代码不算验证，运行才算。** diff 是输入，fresh evidence 是输出。在没有实际运行测试或实际观察行为之前，verify 的结论是空的。
>
> **缓存的结论不算 fresh evidence。** "上次跑通了"不算。"刚才跑通了"算。每次进入 verify，必须重新取证。
>
> **fail_bug 和 fail_spec 的区分不是文字游戏，它决定了下一步去哪。** 判断错了，后面的路也就走错了。先问那句话：保持当前 spec 不变，这个问题是否仍然应该被修成原来定义的样子？

## Honest Exit 规则

- 没有 fresh evidence，不得宣称验证通过
- 只复述代码或只看 diff，不算完成验证
- 如果当前块是 `writing-plan` 批准的低风险例外而跳过了 `test-first`，verify 必须补足对应的行为证据

## 执行模式说明

verify 是**工作流 skill**，定义证据收集的步骤，由 agent 在具体代码库上执行。步骤中的 `[运行测试]`、`[检查日志]` 等是步骤标注，不是实际命令。

## 证据优先级

优先收集这些 fresh evidence：

1. 自动化测试结果
2. 针对当前块停线的手动复现或脚本验证
3. 日志、控制台、接口返回、关键状态变化
4. 对关键用户路径或运行时行为的实际观察

如果 `test_contract` 不存在，只能发生在 `writing-plan` 已明确批准的低风险受控例外。这时 verify 必须直接对 `plan_document` 的 done criteria 逐项取证。

## 三种验证结果

| 结果 | 含义 | 路由到 |
|------|------|--------|
| **符合 Spec** | 实现符合 plan 的停线 | review |
| **偏离 Spec** | 实现与 plan 停线不符 | writing-plan（修范围） |
| **发现 Bug** | 行为不符合预期，不是 spec 问题 | diagnose |

### `fail_bug` vs `fail_spec` 判定规则

- 用 `fail_bug`
  当前 plan / done criteria 本身仍然成立，但实现、行为、测试结果或运行时表现没有达到它
- 用 `fail_spec`
  取证过程中发现当前 plan / done criteria 写错了、漏了、过期了，继续按原 spec 实现反而会把任务做偏

快速判断时，先问这句话：

> 如果保持当前 spec 不变，问题是否仍然应该被修成现在定义的样子？

- 是 → `fail_bug`
- 否 → `fail_spec`

常见例子：

- 测试失败，且失败说明实现没满足已批准停线 → `fail_bug`
- 测试失败，但进一步检查发现停线本身和当前业务目标不一致 → `fail_spec`
- 接口字段名写错、边界条件漏处理、运行时异常 → 通常 `fail_bug`
- plan 范围写大了、done criteria 少了前提、线下结论与当前代码现实冲突 → 通常 `fail_spec`

## Verification Report 格式

```markdown
## Verification 报告

**当前块**：[块名称]
**验证时间**：[时间戳]

### 测试运行
- 总数：N
- 通过：N
- 失败：N

### 实际行为检查

| 停线 | 期望 | 实际 | 结果 |
|------|------|------|------|
| [停线1] | [期望] | [实际] | PASS/FAIL |

### 断言
- [具体的 claim 和 evidence]

### 结论
**verify_result**: [pass|fail_bug|fail_spec]
```

## 前置条件检查

- [ ] implement 已完成
- [ ] 有 `test_contract`，或 `writing-plan` 已明确批准本次跳过 `test-first`

如果没有 `test_contract` 且也没有来自 `writing-plan` 的受控例外说明，不要继续 verify，先回到 `writing-plan` 或 `test-first`。

## 无 `test_contract` 时的验证格式

```markdown
### Done Criteria Evidence
- [停线1]：[证据]
- [停线2]：[证据]
- [停线3]：[证据]
```

## Decision 契约

**decision**: verify-pass
**confidence**: 0.9
**rationale**: 当前 claim 由 fresh evidence 支撑；若无 test_contract，也已按 done criteria 逐项取证
**fallback**: fail_bug → diagnose；fail_spec → writing-plan
**escalate**: false
**next_skill**: review（verify_result = pass 时）

> verify 不输出合并/阻塞 verdict，只输出证据结论。正式放行是 review 的职责。
> 若结果不是通过：decision 分别使用 `verify-fail-bug` 或 `verify-fail-spec`。
**next_action**: [具体下一步动作]

## 状态更新

```bash
_VERIFY_RESULT="${VERIFY_RESULT:?set VERIFY_RESULT to pass|fail_bug|fail_spec}"
_VERIFY_DECISION="${VERIFY_DECISION:?set VERIFY_DECISION to verify-pass|verify-fail-bug|verify-fail-spec}"
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "verify" >/dev/null
$_PF_CLI state set verify_result "$_VERIFY_RESULT" >/dev/null
$_PF_CLI state set last_decision "$_VERIFY_DECISION" >/dev/null
# Exit Protocol
case "$_VERIFY_RESULT" in
  pass)
    _EXIT_NEXT="review"
    _EXIT_REASON="符合 spec，fresh evidence 充足"
    ;;
  fail_bug)
    _EXIT_NEXT="diagnose"
    _EXIT_REASON="发现 bug，根因待定位"
    ;;
  fail_spec)
    _EXIT_NEXT="writing-plan"
    _EXIT_REASON="偏离 spec，需要重新对齐范围"
    ;;
esac
$_PF_CLI state set exit_code "ok" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
_TEST_PASS="${TEST_PASS:-0}"
_TEST_FAIL="${TEST_FAIL:-0}"
echo "{\"skill\":\"verify\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_VERIFY_DECISION\",\"confidence\":0.9,\"test_pass\":$_TEST_PASS,\"test_fail\":$_TEST_FAIL,\"verify_result\":\"$_VERIFY_RESULT\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 运行了实际测试，不是只看代码
- [ ] 证据是 fresh 的，不是缓存的口头结论
- [ ] 每个停线都有对应的验证记录
- [ ] verify_result 判断合理
- [ ] 不冒充 review（不输出 pass/blocked verdict）
