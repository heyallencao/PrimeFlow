---
name: pf-implement
description: "当当前块已清楚，现在的工作就是完成它时使用。默认接 test-first，少数低风险受控例外可直接进入。"
layer: execution
owner: implement
inputs:
  - current_block
  - plan_document
  - test_contract
outputs:
  - implementation_result
entry_modes:
  - plan-ready
  - build-ready
---

# Implement

## 一句话定义

当前任务块的执行者——默认把 test-first 的失败测试落实为通过的实现；若为低风险受控例外，则直接按照 plan 的范围完成代码。

## 为什么这个 skill 存在

implement 是整个工作流里最容易滑坡的地方：范围会蔓延，"顺手修一下"会积累，"只是一个小调整"会带来连锁变更。implement 的存在是为了给实现阶段一个明确的边界——不是"我觉得差不多了"，而是"test_contract 里的测试全部通过，且没有引入额外改动"。

## 定位

当 `test-first` 已产出 `test_contract`，现在的工作就是完成当前块时，进入 implement。

当 `writing-plan` 已明确批准低风险受控例外，并写清楚为什么可以跳过 `test-first` 时，也可以直接进入 implement。

当当前块范围还不清楚时（那是 writing-plan 的事），不要进入 implement。

当根因不明时（那是 diagnose 的事），不要进入 implement。

## 不干什么

- implement 不扩范围（额外功能去找 writing-plan）
- implement 不做方向决策
- implement 不替代 writing-plan 批准跳过 test-first
- implement 不在没有依据时自行跳过测试
- implement 不做质量判断（那是 verify/review 的事）
- implement 不把补丁伪装成调查（那是 diagnose 的事）

## 合规锚点

> **发现计划外的需求时，记录它，不要实现它。** "顺手做了"的改动是 scope creep，即使它看起来很小。把它记录在 implement 完成后的提示里，让用户决定下一步。
>
> **"根因清楚但还没有 writing-plan 授权修复"不是进入 implement 的理由。** 如果根因是在 diagnose 里发现的，需要先通过 diagnose 的输出（root_cause_report + next_skill = implement）才能进入。
>
> **implement 的完成标准是测试通过，不是"代码写完了"。** 在看到所有 test_contract 测试 PASSED 之前，不得宣称 implement 完成。

## 执行原则

### 默认路径与受控例外

- 默认路径：基于 `plan_document + test_contract` 实现当前块
- 受控例外：仅在 `writing-plan` 已批准时，可基于 `plan_document` 直接实现

不管哪条路径，implement 都只完成当前任务块，不扩范围。

### 范围纪律

如果在实现过程中发现计划外的需求：
- 记录下来
- 不要自己做
- 在 implement 完成后提示用户

### Done Criteria

实现完成的标准是：
1. 默认路径下，`test_contract` 里的所有测试通过（绿阶段完成）
2. 受控例外下，代码实现与 `plan_document` 范围一致，且 verify 可对 done criteria 逐项取证
3. 没有引入新的编译错误
4. 没有破坏现有测试

## 红→绿→重构循环（默认路径）

implement 是**工作流 skill**，不是可执行脚本。它定义 TDD 循环的工作步骤，由调用它的 agent 在具体代码库上执行。

```bash
# 红：确认测试失败
[PROJECT_TEST_CMD_FOR_SCENARIO]
# 必须看到 FAILED，才进入绿阶段

# 绿：写最小实现（只看 test_contract，不看其他需求）
# [实现代码由 agent 在具体项目中编写]

# 重构：在测试保护下改进代码质量
[PROJECT_TEST_CMD]
# 必须看到 PASSED
```

> 每个项目的实际命令因语言和测试框架而异：例如 Python 用 `pytest`，Java 用 `./gradlew test` 或 `mvn test`，Shell 用 `bats`，Node 用 `jest` / `vitest` / `npm test`。

## 受控例外执行要求

如果当前块是跳过 `test-first` 的低风险受控例外：

- 必须能指出 `writing-plan` 中的批准依据
- 不得借此夹带行为变化、接口变化、数据变化
- 必须提前知道 verify 将如何补 fresh evidence

## 前置条件检查

- [ ] plan_document 存在，范围清楚
- [ ] `test_contract` 存在，或 `writing-plan` 已明确批准本次低风险受控例外
- [ ] 当前块是自己，不是其他人的块

## Decision 契约

**decision**: implement-complete
**confidence**: 0.9
**rationale**: 默认路径下已完成红→绿→重构循环；若为受控例外，也已严格限制在 approved 范围内，并准备好在 verify 补 fresh evidence
**fallback**: 如果实现中发现范围或风险判断不成立，回 writing-plan 或 test-first
**escalate**: false
**next_skill**: verify
**next_action**: 进入 verify，取 fresh evidence

## 状态更新

```bash
_CURRENT_BLOCK="${CURRENT_BLOCK:?set CURRENT_BLOCK to current block title}"
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "implement" >/dev/null
$_PF_CLI state set current_block "$_CURRENT_BLOCK" >/dev/null
$_PF_CLI state set last_decision "implement-complete" >/dev/null
# Exit Protocol
$_PF_CLI state set exit_code "ok" >/dev/null
$_PF_CLI state set exit_reason "红→绿→重构循环完成" >/dev/null
$_PF_CLI state set next_skill "verify" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"implement\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"implement-complete\",\"confidence\":0.9,\"block_name\":\"$_CURRENT_BLOCK\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 没有扩范围
- [ ] 默认路径下，test_contract 全部测试通过；例外路径下，approved 理由可追溯
- [ ] 没有引入编译错误
- [ ] 没有破坏现有测试
- [ ] 有发现计划外需求，已记录（不自行处理）
