---
name: pf-test-first
description: "当前块默认应先经过的行为锁定阶段。先写失败测试，再写实现；仅少数低风险例外可跳过。"
layer: execution
owner: test-first
inputs:
  - plan_document
  - current_block
  - risk_level
outputs:
  - test_contract
  - failed_tests
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
---

# Test-First

## 一句话定义

行为边界锁定器——默认先用失败测试定义”完成长什么样”，再进入实现。

## 为什么这个 skill 存在

没有 test-first，agent 会先写实现，然后再补测试让测试通过。这个顺序的问题是：实现本身定义了”什么叫正确”，测试只是在验证实现，而不是在验证需求。test-first 的存在是为了先把”完成的样子”锁定成红色测试，让实现必须向行为对齐，而不是让行为向实现妥协。

## 定位

当 plan 已产出，当前块的范围和停线已清楚，需要确保行为被测试锁定时，进入 test-first。

当块的边界还不清楚时（那是 writing-plan 的事），不要进入 test-first。

当 `writing-plan` 明确把当前块标记为低风险受控例外，并写清楚为什么可以跳过时，可以不进入 test-first，直接去 implement。

## 不干什么

- test-first 不写实现代码
- test-first 不做功能实现（那是 implement 的事）
- test-first 不替代 writing-plan 做风险判断

## 执行模式说明

test-first 是**工作流 skill**，不是可执行脚本。它定义"TDD 红→绿→重构循环"的工作步骤，由调用它的 agent 在具体代码库上执行。

每个步骤中的 `[写失败测试]`、`[运行测试]` 等是**步骤标注**，不是实际命令。实际命令因项目测试框架而异：
- Python: `pytest -k "[scenario]"`
- Java: `./gradlew test --tests "[ClassName]"` 或 `mvn -Dtest=[ClassName] test`
- Shell: `bats tests/[case].bats`
- Node: `jest --testNamePattern="[scenario]"` 或 `npx playwright test --grep "[scenario]"`

test-first 的职责是确保这些步骤被正确执行、测试场景被完整覆盖，不跳步。
- test-first 不验证实现（那是 verify 的事）

## 默认规则与例外

默认规则：

- 只要进入正式实现，默认先过 `test-first`
- 默认假设是：大部分任务都应先锁行为，再写实现

受控例外：

- 纯文案修改
- 纯配置调整且无行为变化
- 很小的内部脚本修正
- 已有非常强的外部约束，本次只是机械性落地

如果属于例外，应该在 `writing-plan` 里提前写清楚，而不是到实现阶段临时跳过。

## 合规锚点

> **在看到测试 FAILED 之前，不得写任何实现代码，哪怕只是一行。** "红"阶段不只是建议，它是协议的一部分。跳过红阶段意味着你没有 test-first，你只是在写测试。
>
> **"这个功能太简单了，不需要测试"不是跳过 test-first 的理由。** 跳过的理由只有一个：writing-plan 已经明确声明这是低风险受控例外，并写清楚了原因。没有 writing-plan 的授权，不得跳过。
>
> **test_contract 必须真实落盘才能写入 state，不得用占位路径。** 如果文件不存在，`exit 1`。

## 红→绿→重构循环

```
红：写一个必定失败的测试
   ↓
绿：写最小实现让测试通过
   ↓
重构：在测试保护下改进代码结构
   ↓
重复：直到 test_contract 完成
```

每个循环必须完成才能进入下一个。不跳过"红"的阶段。

## Test Contract 格式

```markdown
# Test Contract：[任务块名称]

## 范围
[测试覆盖的范围]

## 测试场景

### 场景1：[名称]
- **Given**：前置条件
- **When**：触发动作
- **Then**：期望结果
- **测试函数**：`test_scenario_1`

### 场景2：[名称]
[同上格式]

## 边界条件
[边缘情况列表]

## 失败条件
[什么情况下测试应该失败]
```

## 前置条件检查

- [ ] plan_document 存在，范围清楚
- [ ] 当前块有明确的停线（done criteria）
- [ ] 项目有可执行的测试框架（pytest/junit/jest/bats 等）
- [ ] 当前块不是已在 writing-plan 里声明的低风险受控例外

如果项目没有测试框架，先建议用户初始化测试框架，或在 test_contract 里注明依赖。

## 风险分层口径

| 风险等级 | test-first 要求 |
|---------|----------------|
| `high` | 必须先有失败测试或明确行为锁定 |
| `medium` | 默认先走 test-first，不建议跳过 |
| `low` | 仍默认建议 test-first；只有在 writing-plan 已明确写成受控例外时，才允许直接 implement |

## Decision 契约

**decision**: test-contract-ready
**confidence**: 0.9
**rationale**: 当前块默认需要先锁行为边界；核心停线已覆盖，边界条件已定义，失败测试可执行
**fallback**: 如果测试写不出来，说明停线定义有问题，回 writing-plan 重新定义
**escalate**: false
**next_skill**: implement
**next_action**: 进入 implement，执行红→绿循环

## 状态更新

```bash
_TEST_CONTRACT_PATH="${TEST_CONTRACT_PATH:?set TEST_CONTRACT_PATH to the actual test contract path}"
[ -f "$_TEST_CONTRACT_PATH" ] || { echo "test_contract not found: $_TEST_CONTRACT_PATH"; exit 1; }
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"

$_PF_CLI state set current_stage "test-first" >/dev/null
$_PF_CLI state set last_decision "test-contract-produced" >/dev/null
$_PF_CLI state set artifacts.test_contract "$_TEST_CONTRACT_PATH" >/dev/null
# Exit Protocol
$_PF_CLI state set exit_code "ok" >/dev/null
$_PF_CLI state set exit_reason "test_contract 已锁定，核心停线已覆盖" >/dev/null
$_PF_CLI state set next_skill "implement" >/dev/null
```

## Telemetry

```bash
_SCENARIO_COUNT="${SCENARIO_COUNT:-0}"
echo "{\"skill\":\"test-first\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"test-contract-produced\",\"confidence\":0.9,\"scenario_count\":$_SCENARIO_COUNT}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 每个停线都有对应测试
- [ ] 失败测试已写（红阶段完成）
- [ ] 边界条件有测试覆盖
- [ ] 测试函数名称清楚
- [ ] 不跳过红→绿循环
- [ ] 如果当前块本可作为低风险例外，已在 writing-plan 写明，而不是在这里临时跳过
