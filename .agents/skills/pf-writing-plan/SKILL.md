---
name: pf-writing-plan
description: "当方向已清楚，需要把方向压成可执行块时使用。产出 full-plan / delta-plan / execution-card，并同步校正 risk_level。"
layer: decision
owner: writing-plan
inputs:
  - direction_decision
  - roundtable_report
outputs:
  - plan_document
  - current_block
  - plan_type
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
---

# Writing Plan

## 一句话定义

把方向结论压成可执行块——有范围、有停线、有入口，并把后续应该怎么走写清楚。

## 为什么这个 skill 存在

没有 writing-plan，agent 会把"模糊的方向"直接带进实现，结果是无边界的范围蔓延和无法验证的完成标准。一个没有停线的计划，就是在邀请 agent 永远推进却永远不收口。writing-plan 的存在是为了在第一行代码写出来之前，先把"什么叫完成"定义清楚。

## 定位

方向已定，但还不知道具体要做什么、做到什么程度时，进入 writing-plan。

当方向还不清楚时，不要进入 writing-plan。先去 roundtable。

如果当前任务与历史方案高度相似，可先轻量检索 `docs/solutions/`，避免重复规划已经被证明无效的路径。

## 不干什么

- writing-plan 不做方向决策（那是 roundtable 的事）
- writing-plan 不写代码实现
- writing-plan 不做技术设计细节（那是 implement 里的事）
- writing-plan 不做测试（那是 test-first 的事）

## 前置条件检查

- [ ] 方向已清楚（来自 roundtable 或用户明确表述）
- [ ] 没有技术路线未决（如果有，先在脑子/草稿里想清楚再进）

进入后自问一句：**"这个方向里有没有我还没做的技术决策？"**

如果有且影响范围，先把技术决策补进去，再继续。不要假装没有。

## 核心原则

产出**唯一当前块**，不是任务列表。

如果计划里有 3 个并列支线，说明方向还不够清楚——回 roundtable。

默认情况下，`writing-plan` 的后继 skill 是 `test-first`。

只有在下面这种受控例外里，才允许直接进 `implement`：

- 当前块是低风险修正
- 无行为变化、无接口变化、无数据变化
- 验证方式非常清楚
- 计划里明确写出为什么可以跳过 `test-first`

也就是说：

> `test-first` 是默认路径，直接 `implement` 是受控例外。

## 合规锚点

> **输出任务列表不是 writing-plan 的产物。** 如果你发现自己写出了"1. 做 A，2. 做 B，3. 做 C"，这不是 plan，是 todo list。停下来，把它收成一个块。
>
> **跳过 test-first 必须在 plan 文档里写明理由，不是在实现阶段口头决定。** "这个看起来很简单"不是理由。理由是：无行为变化 + 无接口变化 + 无数据变化 + 验证方式已知。
>
> **停线必须可观察可验证，不是形容词。** "代码干净"不是停线。"覆盖率 ≥ 80%"是停线。写完停线后问自己：这个标准，在实现完成后能用具体方法检验吗？

## 三种计划产物

| 类型 | 何时用 |
|------|-------|
| `full-plan` | 从需求到执行都需要完整展开 |
| `delta-plan` | 线下或上游方案已定，只补缺口、依赖、风险 |
| `execution-card` | 当前块很小，只需要定义这一段怎么做 |

### 快速选择表

| 条件 | 推荐类型 |
|------|---------|
| 全新功能、范围较大、还需要完整展开 | `full-plan` |
| 方案主体已定，只补当前缺口或差量实现 | `delta-plan` |
| 当前块很小、范围和停线都很清楚 | `execution-card` |

### `current_block` 定义

- `current_block` 必须是唯一当前块，不是并列任务列表
- 推荐写成短标题，例如“billing webhook retry”或“补齐 OAuth 登录错误提示”
- 不要求 slug，但要能被 handoff 和后续 skill 直接读懂

## Plan 文档格式

```markdown
# Plan：[任务块名称]

## 计划类型
[full-plan / delta-plan / execution-card]

## 方向来源
[来自 roundtable 的结论或用户原始表述]

## 当前块
[一句清楚的话，说清楚这个块要做什么]

## 范围

### 包含
- [具体文件/模块]
- [具体功能点]

### 不包含（Scope Boundaries）
- [明确不在这个块里的东西]
- [避免范围蔓延的边界]

## 停线（Done Criteria）
[具体的可验证标准，完成时必须满足]

## 进入条件
[做这个块之前必须已满足什么]

## 风险分级
- **risk_level**: [low / medium / high]
- **为什么是这个等级**: [1-2句话]

## TDD 路由
- **默认后继**: [test-first / implement]
- **如果直接 implement，理由是**: [仅在低风险例外时填写]

## QA 预期
- **qa_required**: [true / false]
- **依据**: [是否存在用户路径 / 浏览器交互 / 关键集成链路]

## 技术决策（如涉及）
- [决策1]：[选了什么方案，为什么]
- [决策2]：[选了什么方案，为什么]

## 依赖
- [依赖什么外部条件或模块]

## 下一步
**下一 skill**：[默认 test-first；低风险受控例外可为 implement]
```

## 范围判断的黄金问题

如果不确定一个东西该不该包含在当前块里，问自己：

> "如果我不做这个，这个块还能算完成吗？"

- 能 → 不包含
- 不能 → 包含

## 停线（Done Criteria）的写法

停线必须是**可观察、可验证**的：

| 不好的写法 | 改进写法 |
|-----------|---------|
| "代码质量要好" | "所有新函数有单元测试，覆盖率不低于80%" |
| "性能要提升" | "P95 延迟从 500ms 降到 100ms" |
| "要安全" | "通过 OWASP Top 10 自查，无高风险漏洞" |

## 风险分级口径

| 风险等级 | 默认特征 |
|---------|---------|
| `low` | 小型文案/配置调整、纯内部脚本、小范围无行为变更修正 |
| `medium` | 一般功能修改、接口调整、已有方案上的差量实现 |
| `high` | 用户路径、行为变更、数据变更、发布相关、线上问题、高影响协作改动 |

判断规则：

- 拿不准时，不要往 `low` 压，先按 `medium`
- 只要存在行为边界不清、接口变化、用户路径影响，默认不是 `low`
- 如果计划中发现风险高于当前 state，必须把 `risk_level` 上调写回状态

## 后继路由规则

- 默认：`next_skill = test-first`
- 仅当 `risk_level = low` 且计划中明确写出“为什么可以跳过 test-first”时，才允许 `next_skill = implement`
- 如果执行中发现原判断过低，立即回 `test-first` 或重开 `writing-plan`

## Decision 契约

**decision**: block-defined
**confidence**: 0.9
**rationale**: 范围已精确到可执行块，停线可观测，进入条件明确，后继路由与风险等级一致
**fallback**: 做的时候发现范围有问题，回到 writing-plan 重新对齐
**escalate**: false
**next_skill**: 默认 test-first；仅低风险受控例外时为 implement
**next_action**: 默认进入 test-first，先锁行为边界；若为受控例外，直接实现并在 verify 补 fresh evidence

## 状态更新

```bash
mkdir -p docs/primeflow/plans
# 先提供真实值，再生成 plan 文档路径
_BLOCK_TITLE="${BLOCK_TITLE:?set BLOCK_TITLE to current block title}"
_PLAN_TYPE="${PLAN_TYPE:?set PLAN_TYPE to full-plan|delta-plan|execution-card}"
_RISK_LEVEL="${RISK_LEVEL:?set RISK_LEVEL to low|medium|high}"
_NEXT_SKILL="${NEXT_SKILL:?set NEXT_SKILL to test-first|implement}"
_QA_REQUIRED="${QA_REQUIRED:?set QA_REQUIRED to true|false}"
_PLAN_SLUG=$(printf '%s' "$_BLOCK_TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -d '.,!?')
_PLAN_PATH="docs/primeflow/plans/$(date +%Y%m%d)-$_PLAN_SLUG.md"
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"

# 只有在计划文件真实落盘后，才允许把路径写入 state
[ -f "$_PLAN_PATH" ] || { echo "plan_document not found: $_PLAN_PATH"; exit 1; }

$_PF_CLI state set current_stage "writing-plan" >/dev/null
$_PF_CLI state set current_block "$_BLOCK_TITLE" >/dev/null
$_PF_CLI state set last_decision "block-defined" >/dev/null
$_PF_CLI state set risk_level "$_RISK_LEVEL" >/dev/null
$_PF_CLI state set qa_required "$_QA_REQUIRED" >/dev/null
$_PF_CLI state set artifacts.plan_document "$_PLAN_PATH" >/dev/null
$_PF_CLI state set artifacts.plan_type "$_PLAN_TYPE" >/dev/null
$_PF_CLI state set artifacts.next_skill_hint "$_NEXT_SKILL" >/dev/null

# Exit Protocol
case "$_NEXT_SKILL" in
  implement)
    if [ "$_RISK_LEVEL" != "low" ]; then
      echo "invalid next_skill=$_NEXT_SKILL for risk_level=$_RISK_LEVEL"
      exit 1
    fi
    _EXIT_CODE="ok"
    _EXIT_NEXT="implement"
    _EXIT_REASON="低风险受控例外，直接进入实现"
    ;;
  test-first)
    _EXIT_CODE="ok"
    _EXIT_NEXT="test-first"
    _EXIT_REASON="计划要求先做行为锁定"
    ;;
  *)
    echo "invalid next_skill=$_NEXT_SKILL"
    exit 1
    ;;
esac
$_PF_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"writing-plan\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"block-defined\",\"confidence\":0.85,\"risk_level\":\"$_RISK_LEVEL\",\"block_name\":\"$_BLOCK_TITLE\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 有唯一当前块，不是任务列表
- [ ] plan 类型已经明确（full-plan / delta-plan / execution-card）
- [ ] 范围包含和不包含都写清楚了
- [ ] 停线是可观察可验证的
- [ ] 进入条件是具体的前置
- [ ] risk_level 已判断，并与当前块相符
- [ ] 如果是低风险直进 implement，理由已写清楚
- [ ] qa_required 已判断
- [ ] 如果有技术决策，已记录理由
- [ ] scope 没有模糊地带
- [ ] 下一步默认指向 test-first；若例外，已明确说明
