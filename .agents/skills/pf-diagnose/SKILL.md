---
name: pf-diagnose
description: "当系统坏了、测试挂了或行为异常，但根因还不清楚时使用。铁律：没有调查就不修。"
layer: execution
owner: diagnose
inputs:
  - failure_description
  - verify_report
outputs:
  - root_cause_report
  - diagnose_result
---

# Diagnose

## 一句话定义

根因定位器——系统坏了但原因不清楚时，先查根因，再决定修复策略。不把补丁伪装成调查。

## 为什么这个 skill 存在

当系统出问题时，agent 最危险的行为是"先修了再说"——即在不理解根因的情况下施加一个看起来合理的补丁。这个补丁可能治标不治本，也可能掩盖更大的问题。diagnose 的存在是为了在修复之前，先用证据证明"我知道为什么坏了"，而不是"我有一个感觉能修好的方案"。

## 定位

当 verify 报告发现了 bug 但根因还不清楚时，进入 diagnose。

当 verify 报告偏离 spec（那是 writing-plan 的事），不要进入 diagnose。

当根因已经清楚（那是 implement 的事），不要进入 diagnose。

如果怀疑这是重复性故障，可先轻量检索 `docs/solutions/` 中的历史故障文档，优先复用已知根因和排查顺序。

## 不干什么

- diagnose 不把补丁伪装成调查（先有根因，再有修复）
- diagnose 不做质量判断
- diagnose 不重写测试（那是 test-first 的事）

## 执行模式说明

diagnose 是**工作流 skill**，定义根因调查的步骤，由 agent 在具体代码库上执行。步骤中的 `[运行测试]`、`[查看日志]` 等是步骤标注，不是实际命令。

## 诊断铁律

**没有调查就不修。**

最多循环 3 次假设验证。如果 3 次之后仍然无解，上报。

## 合规锚点

> **"我觉得是 X 原因，我来修一下"不是调查，是猜测加行动。** 在提出假设之前，必须先收集异常证据。没有证据的假设不算第一步，算第零步。
>
> **进入第 2 次循环时，必须明确说出：当前在第 2/3 次循环。** 这不是格式要求，是防止 agent 在无意识中进入第 4、5 次循环而没有触发 escalate。
>
> **第 3 次循环结束后仍无根因，必须 escalate，不得再试一次。** "再试一次"的诱惑会导致无限循环。3 次是约定，不是参考。
>
> **假设被推翻是有价值的信息，不是失败。** 记录"这个方向不对，因为..."和记录"根因是..."同样重要。

## 诊断循环

```
第1次循环：提出假设 → 验证假设
第2次循环：提出假设 → 验证假设
第3次循环：提出假设 → 验证假设
    ↓
3次后仍无解 → escalate = true
```

## 诊断四步法

### 步骤 1：收集异常证据

```bash
# 运行失败的测试，获取完整错误信息
[PROJECT_FAILING_TEST_CMD] 2>&1 | tee /tmp/test-error.log

# 查看相关代码的上下文
# 使用 Grep 找相关错误模式

# 检查最近是否有相关变更
git log --oneline -10 -- [affected_file]
```

### 步骤 2：提出假设

基于证据，提出最可能的根因假设。

典型假设方向：
- 最近的变更引入了这个 bug
- 一个变量在某个边界条件下的值不符合预期
- 异步操作时序问题
- 并发竞态条件
- 数据序列化/反序列化问题

### 步骤 3：验证假设

设计一个测试或检查来验证或推翻假设。

```bash
# 如果假设是"变量X在Y条件下是错的"，写一个针对性测试或最小复现实验
# 然后运行对应命令验证假设
# 例如：
#   Python: pytest -k "[scenario]"
#   Java: ./gradlew test --tests "[ClassName]"
#   Shell: bats tests/[case].bats
#   Node: jest --testNamePattern="[scenario]"
```

### 步骤 4：得出结论

- 假设被证实 → 根因已定位
- 假设被推翻 → 回步骤 2，提出新假设

## Root Cause Report 格式

```markdown
## Root Cause 报告

**问题**：verify 报告的 bug 描述
**诊断时间**：[时间戳]
**循环次数**：N/3

### 异常证据
```
[错误日志/测试失败输出]
```

### 调查过程

#### 循环 1/3
- **假设**：[假设内容]
- **验证**：[怎么验证的]
- **结果**：证实/推翻

#### 循环 2/3
[同上]

### 根因
[如果已定位：具体的根因描述]

### 修复策略
- **方案**：[修复方案]
- **回退选项**：[如果修复失败怎么回退]
```

## Decision 契约

**decision**: root-cause-found
**confidence**: 0.9
**rationale**: 证据链完整，假设被验证，修复方案具体可执行
**fallback**: 如果修复后 verify 再次失败，重新进入 diagnose
**escalate**: false（根因已找到）
**next_skill**: implement
**next_action**: 进入 implement，执行修复

> 若根因不明（3次循环后仍无解）：decision = diagnose-unknown，escalate = true，confidence = 0.3
> 若需要回退：decision = rollback-required，confidence = 0.85，next_skill = ship

## 循环计数

```bash
# 统一 runtime 入口
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"

# 读取当前循环次数
_LOOPS=$($_PF_CLI state get diagnose_loops 2>/dev/null | tr -d '"')
if [ "$_LOOPS" = "null" ] || [ -z "$_LOOPS" ]; then
  _LOOPS=0
fi
_NEW_LOOPS=$((_LOOPS + 1))
$_PF_CLI state set diagnose_loops "$_NEW_LOOPS" >/dev/null
echo "Diagnose loop: $_LOOPS → $_NEW_LOOPS/3"
```

## 状态更新

```bash
_DIAGNOSE_RESULT="${DIAGNOSE_RESULT:?set DIAGNOSE_RESULT to found|rollback|unknown}"
_DIAGNOSE_DECISION="${DIAGNOSE_DECISION:?set DIAGNOSE_DECISION to root-cause-found|rollback-required|diagnose-unknown}"
_ROOT_CAUSE="${ROOT_CAUSE:-unknown}"

$_PF_CLI state set current_stage "diagnose" >/dev/null
$_PF_CLI state set diagnose_result "$_DIAGNOSE_RESULT" >/dev/null
$_PF_CLI state set last_decision "$_DIAGNOSE_DECISION" >/dev/null

# Exit Protocol
case "$_DIAGNOSE_RESULT" in
  found)
    _EXIT_CODE="ok"
    _EXIT_NEXT="implement"
    _EXIT_REASON="根因已定位：$_ROOT_CAUSE"
    ;;
  rollback)
    _EXIT_CODE="ok"
    _EXIT_NEXT="ship"
    _EXIT_REASON="需要回退，rollback 协议已触发"
    ;;
  unknown)
    if [ "$_NEW_LOOPS" -ge 3 ]; then
      _EXIT_CODE="escalate"
      _EXIT_NEXT=""
      _EXIT_REASON="3次循环后仍无解，需要人工介入"
    else
      _EXIT_CODE="deferred"
      _EXIT_NEXT="diagnose"
      _EXIT_REASON="根因仍不明确，继续调查"
    fi
    ;;
esac
$_PF_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"diagnose\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_DIAGNOSE_DECISION\",\"confidence\":0.9,\"diagnose_loops\":$_NEW_LOOPS,\"root_cause\":\"$_ROOT_CAUSE\",\"diagnose_result\":\"$_DIAGNOSE_RESULT\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 有实际调查过程，不是一上来就写修复
- [ ] 循环计数正确
- [ ] 根因有具体描述，不是泛泛的"有问题"
- [ ] 有回退选项
- [ ] 3次循环后仍无解时正确上报
