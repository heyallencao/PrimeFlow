---
name: pf-orchestrate
description: "全局调度中枢。先判断任务从哪里接入，再决定当前请求该交给哪个 skill，管理状态流转；当用户明确要求会话交接时，路由到 handoff。始终可用。"
layer: orchestration
owner: orchestrate
inputs:
  - task_description
  - context
  - constraints
outputs:
  - routing_decision
  - state_snapshot
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
  - build-ready
  - release-ready
  - incident
request_kinds:
  - handoff
---

# Orchestrate

## 一句话定义

全局调度中枢——先判断任务从哪里接入，再决定下一步去哪。

## 为什么这个 skill 存在

没有 orchestrate，agent 会凭直觉跳进第一个看起来合理的 skill，绕过了接入模式判断，结果是"从错误的阶段开始，沿错误的路径推进，最后得出一个貌似完成的结论"。orchestrate 的存在是为了让每一次进入都有根据，每一次流转都有状态，每一次卡死都能上报而不是静默走错。

## 定位

当不确定当前请求该交给哪个 skill 时，进入 orchestrate。
当需要暂停/切换会话时，进入 orchestrate（路由到 `handoff`）。
当需要恢复会话时，进入 orchestrate（路由到 `handoff`）。
当任务不是从零开始，而是从中间阶段接入时，进入 orchestrate。

## 职责边界

### 负责什么
- 判断接入模式（entry mode）
- 分析当前状态
- 判断下一步 skill
- 路由决策（自主，不需要用户确认）
- 会话交接路由（到 `handoff`）

### 不负责什么
- 不做深度分析（那是其他 skill 的职责）
- 不做具体实现
- 不做质量判断
- 不把所有任务都强行拉回 roundtable

## handoff 边界

handoff 已拆成独立 skill：

- 路径：`~/.agents/skills/PrimeFlow/orchestration/handoff/SKILL.md`
- 由 handoff 负责 `handoff out / handoff in <id|latest> / handoff list`
- orchestrate 只负责识别这是一次交接请求，并路由到 handoff

## Preamble：状态检测

```bash
echo "=== Orchestrate Preamble ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 检测分支
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch: $_BRANCH"

# 检测工作区状态
_STATUS=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Pending changes: $_STATUS"

# 推荐：通过 PrimeFlow CLI 管理状态
# 若已全局安装，可把下行替换为 primeflow
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"

# 加锁写入（防止并发 skill 同时修改 state.json）
_lock_file() {
  local _f="$1"
  local _maxwait=5
  local _waited=0
  while [ -f "${_f}.lock" ] && [ "$_waited" -lt "$_maxwait" ]; do
    sleep 1
    _waited=$((_waited + 1))
  done
  touch "${_f}.lock"
}

_unlock_file() {
  rm -f "${1}.lock"
}

if [ ! -f ".primeflow/state.json" ]; then
  echo "No state file, initializing..."
  $_PF_CLI state init >/dev/null
fi

echo "Loaded state from: $($_PF_CLI state get current_stage 2>/dev/null | tr -d '\"')"

# handoff 为独立 skill，不在 orchestrate 内直接执行
```

## 进入条件

- [ ] 用户发起新请求
- [ ] 需要路由决策
- [ ] 需要会话切换（handoff）
- [ ] 需要会话恢复（recovery）

## 退出条件

- [ ] 路由决策已做出（decision 字段）
- [ ] 置信度已评估（confidence 字段）
- [ ] 下一步已确定（escalate=false）或上报人类（escalate=true）
- [ ] 状态已更新

## 接入模式矩阵

| entry_mode | 说明 | 默认进入 | 置信度 |
|-----------|------|---------|--------|
| `from-scratch` | 从零开始，需要探索与对齐 | `roundtable` | 0.9 |
| `aligned-offline` | 线下已对齐，只差补正式动作 | `writing-plan` | 0.9 |
| `plan-ready` | 方案已定，只差实现推进 | `test-first` 或 `implement` | 0.85 |
| `build-ready` | 代码已有，只差验证和审查 | `verify` | 0.9 |
| `release-ready` | 已接近发布，只差最终收口 | 已有 `verify/review` 证据时到 `qa? / ship`，否则先补 `verify / review` | 0.85 |
| `incident` | 线上异常或故障 | `diagnose` | 0.9 |

## 风险等级默认口径

| risk_level | 默认特征 |
|-----------|---------|
| `low` | 小型文案/配置调整、纯内部脚本、小范围无行为变更修正 |
| `medium` | 一般功能修改、接口调整、已有方案上的差量实现 |
| `high` | 用户路径、行为变更、数据变更、发布相关、线上问题、多人协作高影响改动 |

## 阶段路由矩阵

| 当前状态 | 条件 | 路由到 |
|---------|------|--------|
| `roundtable` | 方向已收敛 | `writing-plan` |
| `writing-plan` | full-plan / delta-plan / execution-card 已产出 | `test-first` 或 `implement` |
| `test-first` | 风险要求的行为锁定已完成 | `implement` |
| `implement` | 当前块完成 | `verify` |
| `verify` | 符合 Spec | `review` |
| `verify` | 发现 bug | `diagnose` |
| `verify` | 偏离 Spec | `writing-plan` |
| `review` | pass / pass_with_risks 且需要运行时验证 | `qa` |
| `review` | pass / pass_with_risks 且无需运行时验证 | `ship` |
| `review` | blocked | `implement` 或 `roundtable` |
| `qa` | 测试通过 | `ship` |
| `qa` | 发现 bug | `diagnose` |
| `ship` | 部署完成 | `release` |
| `ship` | 部署失败或 canary 失败 | `diagnose` |
| `release` | 决策完成 | `knowledge` |
| `knowledge` | 归档完成 | 等待新任务 |

## 工作流

### 步骤 1：读取当前状态

```bash
_CURRENT_STAGE=$($_PF_CLI state get current_stage 2>/dev/null | tr -d '"')
_CURRENT_BLOCK=$($_PF_CLI state get current_block 2>/dev/null | tr -d '"')
_LAST_SKILL=$($_PF_CLI state get last_skill 2>/dev/null | tr -d '"')
_ENTRY_MODE=$($_PF_CLI state get entry_mode 2>/dev/null | tr -d '"')
_RISK_LEVEL=$($_PF_CLI state get risk_level 2>/dev/null | tr -d '"')
_PLAN_DOC=$($_PF_CLI state get artifacts.plan_document 2>/dev/null | tr -d '"')
echo "Stage: $_CURRENT_STAGE"
echo "Block: $_CURRENT_BLOCK"
echo "Last Skill: $_LAST_SKILL"
echo "Entry mode: $_ENTRY_MODE"
echo "Risk level: $_RISK_LEVEL"
echo "Plan doc: $_PLAN_DOC"
```

### 步骤 2：先判断接入模式

```bash
echo ""
echo "=== 接入模式判断 ==="

# 入口判断优先于阶段路由
# 这些字段可以来自 state.json、用户输入、现有 artifacts、线下结论
# 目标不是强迫从头开始，而是明确“当前处于哪个阶段”
# risk_level 默认由 orchestrate 给出，后续 skill 可在发现新证据时调整，但必须写明理由

_REQUEST_TEXT="$(printf '%s' "${TASK_DESCRIPTION:-${task_description:-}}" | tr '[:upper:]' '[:lower:]')"
_IS_HANDOFF_REQUEST=false

case "$_REQUEST_TEXT" in
  *"handoff out"*|*"handoff in "*|*"handoff list"*|*"会话交接"*|*"切换会话"*|*"恢复上一轮"*|*"恢复最近一次"*|*"列出最近 handoff"*|*"暂停一下"*|*"先存一下现场"*)
    _IS_HANDOFF_REQUEST=true
    ;;
esac
```

### 步骤 3：路由决策

```bash
echo ""
echo "=== 路由决策 ==="

# 循环检测：防止同 stage 反复路由
_ROUTING_COUNT=$($_PF_CLI state get routing_count 2>/dev/null | tr -d '"')
_NEW_COUNT=$((_ROUTING_COUNT + 1))
if [ "$_NEW_COUNT" -gt 5 ]; then
  echo "循环检测触发：routing_count = $_NEW_COUNT > 5，上报人工"
  _ESCALATE=true
  _ROUTING="escalate"
  _REASONING="同一 stage 反复路由超过5次，疑似循环路由或状态卡死，需要人工介入"
  _CONFIDENCE=0.3
else
  echo "Routing count: $_ROUTING_COUNT → $_NEW_COUNT"

  if [ "$_IS_HANDOFF_REQUEST" = "true" ]; then
    _ROUTING="handoff"
    _REASONING="检测到会话交接请求，优先交由独立 handoff skill 处理"
    _CONFIDENCE=0.95
  else
    case "$_CURRENT_STAGE" in
      init)
        case "$_ENTRY_MODE" in
          aligned-offline)
            _ROUTING="writing-plan"
            _REASONING="线下已对齐，先补正式计划或执行卡"
            _CONFIDENCE=0.9
            ;;
          plan-ready)
            if [ "$_RISK_LEVEL" = "low" ]; then
              _ROUTING="implement"
              _REASONING="方案已定且风险较低，可直接进入实现，后续在 verify 补 fresh evidence"
              _CONFIDENCE=0.8
            else
              _ROUTING="test-first"
              _REASONING="方案已定，进入风险分层的行为锁定"
              _CONFIDENCE=0.85
            fi
            ;;
          build-ready)
            _ROUTING="verify"
            _REASONING="代码已有，先补验证证据"
            _CONFIDENCE=0.9
            ;;
          release-ready)
            _VERIFY_RESULT=$($_PF_CLI state get verify_result 2>/dev/null | tr -d '"')
            _REVIEW_RESULT=$($_PF_CLI state get review_result 2>/dev/null | tr -d '"')
            _QA_REQUIRED=$($_PF_CLI state get qa_required 2>/dev/null | tr -d '"')
            [ "$_VERIFY_RESULT" = "null" ] && _VERIFY_RESULT="missing"
            [ "$_REVIEW_RESULT" = "null" ] && _REVIEW_RESULT="missing"
            [ "$_QA_REQUIRED" = "null" ] && _QA_REQUIRED="missing"
            if [ "$_VERIFY_RESULT" != "missing" ] && [ "$_REVIEW_RESULT" != "missing" ]; then
              if [ "$_QA_REQUIRED" = "true" ]; then
                _ROUTING="qa"
                _REASONING="已有 verify/review 证据，且任务需要真实运行时验证，进入 QA"
                _CONFIDENCE=0.85
              elif [ "$_QA_REQUIRED" = "false" ]; then
                _ROUTING="ship"
                _REASONING="已有 verify/review 证据，进入最终收口"
                _CONFIDENCE=0.85
              else
                _ROUTING="review"
                _REASONING="已有 verify/review 证据，但 qa_required 缺失，先补齐 review 的 QA 判断"
                _CONFIDENCE=0.5
              fi
            else
              _ROUTING="verify"
              _REASONING="接近发布但缺少收口证据，先补 verify/review"
              _CONFIDENCE=0.85
            fi
            ;;
          incident)
            _ROUTING="diagnose"
            _REASONING="线上问题优先诊断与止损"
            _CONFIDENCE=0.9
            ;;
          *)
            _ROUTING="roundtable"
            _REASONING="默认从 roundtable 开始"
            _CONFIDENCE=0.9
            ;;
        esac
        ;;

      roundtable)
        _ROUTING="writing-plan"
        _REASONING="方向已收敛，进入计划阶段"
        _CONFIDENCE=0.9
        ;;

      writing-plan)
        # 安全检查：排除 null 字符串、空字符串、及文件不存在三种情况
        if [ "$_PLAN_DOC" != "null" ] && [ -n "$_PLAN_DOC" ] && [ -f "$_PLAN_DOC" ]; then
          if [ "$_RISK_LEVEL" = "low" ]; then
            _ROUTING="implement"
            _REASONING="计划已产出，且当前风险较低，可直接进入实现，后续在 verify 补 fresh evidence"
            _CONFIDENCE=0.85
          else
            _ROUTING="test-first"
            _REASONING="计划已产出，且风险等级要求先做行为锁定，进入 test-first"
            _CONFIDENCE=0.9
          fi
        else
          _ROUTING="writing-plan"
          _REASONING="plan_document 尚未产出或文件不可读，停留在 writing-plan"
          _CONFIDENCE=0.8
        fi
        ;;

      test-first)
        _ROUTING="implement"
        _REASONING="测试合同已锁定，进入实现"
        _CONFIDENCE=0.9
        ;;

      implement)
        _ROUTING="verify"
        _REASONING="代码已产出，进入验证"
        _CONFIDENCE=0.9
        ;;

      verify)
        # verify 会更新 state.json 中的 verify_result
        _VERIFY_RESULT=$($_PF_CLI state get verify_result 2>/dev/null | tr -d '"')
        [ "$_VERIFY_RESULT" = "null" ] && _VERIFY_RESULT="missing"
        case "$_VERIFY_RESULT" in
          pass)
            _ROUTING="review"
            _REASONING="验证通过，进入审查"
            _CONFIDENCE=0.9
            ;;
          fail_bug)
            _ROUTING="diagnose"
            _REASONING="验证失败，发现 bug，需要诊断根因"
            _CONFIDENCE=0.85
            ;;
          fail_spec)
            _ROUTING="writing-plan"
            _REASONING="验证失败，偏离规格，需要重新对齐"
            _CONFIDENCE=0.85
            ;;
          missing)
            _ROUTING="verify"
            _REASONING="verify_result 缺失，不能默认放行到 review，需要补齐 fresh evidence"
            _CONFIDENCE=0.4
            ;;
          *)
            _ESCALATE=true
            _ROUTING="escalate"
            _REASONING="verify_result 未知，不能默认放行到 review，需要人工确认或补齐 verify 状态"
            _CONFIDENCE=0.3
            ;;
        esac
        ;;

      review)
        # review 会更新 state.json 中的 review_result
        _REVIEW_RESULT=$($_PF_CLI state get review_result 2>/dev/null | tr -d '"')
        _QA_REQUIRED=$($_PF_CLI state get qa_required 2>/dev/null | tr -d '"')
        [ "$_REVIEW_RESULT" = "null" ] && _REVIEW_RESULT="missing"
        [ "$_QA_REQUIRED" = "null" ] && _QA_REQUIRED="missing"
        case "$_REVIEW_RESULT" in
          pass|pass_with_risks)
            if [ "$_QA_REQUIRED" = "true" ]; then
              _ROUTING="qa"
              _REASONING="审查通过，且任务需要真实运行时验证，进入 QA"
              _CONFIDENCE=0.9
            elif [ "$_QA_REQUIRED" = "false" ]; then
              _ROUTING="ship"
              _REASONING="审查通过，且任务无需 QA，直接进入 ship"
              _CONFIDENCE=0.85
            else
              _ESCALATE=true
              _ROUTING="escalate"
              _REASONING="review 已通过，但 qa_required 缺失，不能默认进入 ship，需要先补齐 QA 判断"
              _CONFIDENCE=0.4
            fi
            ;;
          blocked)
            _ROUTING="implement"
            _REASONING="审查驳回，返回修复"
            _CONFIDENCE=0.9
            ;;
          *)
            _ESCALATE=true
            _ROUTING="escalate"
            _REASONING="review_result 未知，不能默认放行到 ship，需要人工确认或补齐 review 状态"
            _CONFIDENCE=0.4
            ;;
        esac
        ;;

      diagnose)
        # diagnose 会更新 state.json 中的 diagnose_result
        _DIAGNOSE_RESULT=$($_PF_CLI state get diagnose_result 2>/dev/null | tr -d '"')
        _DIAGNOSE_LOOPS=$($_PF_CLI state get diagnose_loops 2>/dev/null | tr -d '"')
        [ "$_DIAGNOSE_RESULT" = "null" ] && _DIAGNOSE_RESULT="missing"
        case "$_DIAGNOSE_RESULT" in
          found)
            _ROUTING="implement"
            _REASONING="根因已定位，返回修复"
            _CONFIDENCE=0.9
            ;;
          rollback)
            _ROUTING="ship"
            _REASONING="需要回退，执行 ship 回滚"
            _CONFIDENCE=0.9
            ;;
          unknown)
            if [ "$_DIAGNOSE_LOOPS" -ge 3 ]; then
              _ESCALATE=true
              _ROUTING="escalate"
              _REASONING="根因不明且超过3次循环，需要人工介入"
              _CONFIDENCE=0.5
            else
              _ROUTING="diagnose"
              _REASONING="根因仍不明确，继续停留在 diagnose 补证据，不直接进入实现"
              _CONFIDENCE=0.55
            fi
            ;;
          missing)
            _ROUTING="diagnose"
            _REASONING="diagnose_result 缺失，继续停留在 diagnose，不能在没有结论时进入实现"
            _CONFIDENCE=0.4
            ;;
          *)
            _ESCALATE=true
            _ROUTING="escalate"
            _REASONING="diagnose_result 未知，不能默认进入实现，需要人工确认或补齐诊断状态"
            _CONFIDENCE=0.3
            ;;
        esac
        ;;

      qa)
        _QA_RESULT=$($_PF_CLI state get qa_result 2>/dev/null | tr -d '"')
        [ "$_QA_RESULT" = "null" ] && _QA_RESULT="missing"
        case "$_QA_RESULT" in
          pass)
            _ROUTING="ship"
            _REASONING="QA 通过，进入发布"
            _CONFIDENCE=0.9
            ;;
          partial)
            _ROUTING="ship"
            _REASONING="QA 测试覆盖不完整（降级模式），带已知限制进入发布，需在 release 中披露"
            _CONFIDENCE=0.7
            ;;
          fail)
            _ROUTING="diagnose"
            _REASONING="QA 发现问题，进入诊断"
            _CONFIDENCE=0.85
            ;;
          missing)
            _ROUTING="qa"
            _REASONING="qa_result 缺失，继续停留在 qa，不能默认进入 ship"
            _CONFIDENCE=0.4
            ;;
          *)
            _ESCALATE=true
            _ROUTING="escalate"
            _REASONING="qa_result 未知，不能默认放行到 ship，需要人工确认或补齐 QA 状态"
            _CONFIDENCE=0.3
            ;;
        esac
        ;;

      ship)
        _SHIP_RESULT=$($_PF_CLI state get ship_result 2>/dev/null | tr -d '"')
        [ "$_SHIP_RESULT" = "null" ] && _SHIP_RESULT="missing"
        case "$_SHIP_RESULT" in
          done)
            _ROUTING="release"
            _REASONING="部署完成，canary 验证通过，进入发布决策"
            _CONFIDENCE=0.9
            ;;
          canary_failed)
            _ROUTING="diagnose"
            _REASONING="Canary 验证失败，进入根因诊断"
            _CONFIDENCE=0.8
            ;;
          failed)
            _ESCALATE=true
            _ROUTING="escalate"
            _REASONING="部署失败，需要人工决策"
            _CONFIDENCE=0.7
            ;;
          missing)
            _ROUTING="ship"
            _REASONING="ship_result 缺失，继续停留在 ship，不能默认进入 release"
            _CONFIDENCE=0.4
            ;;
          *)
            _ESCALATE=true
            _ROUTING="escalate"
            _REASONING="ship_result 未知，不能默认进入 release，需要人工确认或补齐 ship 状态"
            _CONFIDENCE=0.3
            ;;
        esac
        ;;

      release)
        # 检查 release 是否要求 escalate（暂停发布、灰度发布需人工决策）
        _RELEASE_ESCALATE=$($_PF_CLI state get release_escalate 2>/dev/null | tr -d '"')
        _RELEASE_DECISION=$($_PF_CLI state get last_decision 2>/dev/null | tr -d '"')
        [ "$_RELEASE_ESCALATE" = "null" ] && _RELEASE_ESCALATE="false"
        [ "$_RELEASE_DECISION" = "null" ] && _RELEASE_DECISION="release-full"
        if [ "$_RELEASE_ESCALATE" = "true" ]; then
          _ESCALATE=true
          _ROUTING="PAUSED"
          _REASONING="发布决策为【$_RELEASE_DECISION】，需人工确认后才能归档"
          _CONFIDENCE=0.7
          echo "=== ESCALATE: 发布暂停，需要人工确认 ==="
          echo "决策: $_RELEASE_DECISION"
          echo "下一步由人工决定（继续灰度/全量，或回退，或重新进入工程流程）"
        else
          _ROUTING="knowledge"
          _REASONING="发布决策【$_RELEASE_DECISION】已确认，进入归档"
          _CONFIDENCE=0.9
          echo "Tip: 这次解决问题过程中有哪些值得沉淀的经验？可运行 /knowledge 归档。"
        fi
        ;;

      knowledge)
        _ROUTING="DONE"
        _REASONING="任务完成，知识已归档"
        _CONFIDENCE=1.0
        ;;

      *)
        _ESCALATE=true
        _ROUTING="escalate"
        _REASONING="未知状态 $_CURRENT_STAGE，不能默认重置到 roundtable，需要人工确认或修正 state"
        _CONFIDENCE=0.2
        ;;
    esac
  fi
fi

# 循环检测生效
if [ "$_ESCALATE" = "true" ]; then
  echo "=== ESCALATE: 流水线暂停，等待人工决策 ==="
  echo "当前状态: $_CURRENT_STAGE"
  echo "暂停原因: $_REASONING"
  echo "置信度: $_CONFIDENCE"
  echo ""
  echo "人工决策选项："
  echo "  → roundtable    重新对齐方向"
  echo "  → diagnose       继续诊断根因"
  echo "  → implement      直接修复"
  echo "  → ship           执行回滚"
  echo "  → [其他 skill]   按需选择"
else
  echo "路由决策: $_ROUTING"
  echo "决策理由: $_REASONING"
  echo "置信度: $_CONFIDENCE"
fi
```

### 步骤 3：交接请求路由（如需要）

当用户明确触发 handoff 时：

```bash
_ROUTING="handoff"
_REASONING="检测到会话交接请求，交由独立 handoff skill 处理"
_CONFIDENCE=0.95
```

### 步骤 4：状态更新（原子写入）

```bash
# 加锁保护，防止并发 skill 同时写入
_lock_file ".primeflow/state.json"

# 更新状态（含循环计数）
# _STAGE_BEFORE = 更新前的 current_stage（从 state.json 读取）
_STAGE_BEFORE=$($_PF_CLI state get current_stage 2>/dev/null | tr -d '"')
# 如果 stage 有推进（_STAGE_BEFORE != _ROUTING），重置计数；否则递增
if [ "$_STAGE_BEFORE" != "$_ROUTING" ]; then
  _NEW_COUNT=0
else
  _NEW_COUNT=$((_ROUTING_COUNT + 1))
fi

# 推荐：通过 CLI 逐字段写入，避免把 jq 暴露为首用入口
$_PF_CLI state set previous_stage "$_STAGE_BEFORE" >/dev/null
$_PF_CLI state set current_stage "$_ROUTING" >/dev/null
$_PF_CLI state set last_skill "orchestrate" >/dev/null
$_PF_CLI state set last_decision "$_ROUTING 路由决定" >/dev/null
$_PF_CLI state set confidence "$_CONFIDENCE" >/dev/null
$_PF_CLI state set routing_count "$_NEW_COUNT" >/dev/null

# Exit Protocol（orchestrate 作为路由中枢）
if [ "$_ESCALATE" = "true" ]; then
  $_PF_CLI state set exit_code "escalate" >/dev/null
  $_PF_CLI state set exit_reason "$_REASONING" >/dev/null
  $_PF_CLI state set next_skill "" >/dev/null
else
  $_PF_CLI state set exit_code "ok" >/dev/null
  $_PF_CLI state set exit_reason "$_REASONING" >/dev/null
  $_PF_CLI state set next_skill "$_ROUTING" >/dev/null
fi

_unlock_file ".primeflow/state.json"
echo "状态已更新"
```

### 步骤 5：Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"orchestrate\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_ROUTING\",\"confidence\":$_CONFIDENCE,\"exit_code\":\"$([ "$_ESCALATE" = "true" ] && echo "escalate" || echo "ok")\",\"reasoning\":\"$_REASONING\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## Decision 契约

**decision**: `route-$_ROUTING`
**confidence**: `$_CONFIDENCE`
**rationale**: `$_REASONING`
**fallback**: 如果状态缺失或未知，优先补齐当前阶段证据；必要时 escalate，而不是默认放行
**escalate**: `$_ESCALATE`（默认 false）
**next_skill**: `$_ROUTING`
**next_action**: 执行 `$_ROUTING` skill

> **Escalate 说明**：escalate 不是 skill。当 `escalate = true` 时，自动化流水线暂停，由人类决定下一步。
> orchestrate 输出当前状态摘要，人类可选择：继续到某 skill、直接返回 roundtable、或执行其他操作。

## Handoff 使用场景

- 会话即将结束但工作未完成
- 需要切换给其他 AI 或人类
- 长时间等待用户输入前
- 系统提示上下文即将溢出
- 需要冻结当前现场，保证下一会话不追问背景就能继续

## 合规锚点

> **escalate 不是失败，是诚实。** 当流程卡死、状态不一致、循环超过上限，正确的行为是上报，而不是猜一个"最可能"的下一步并静默继续。
>
> **路由计数是强制约束，不是建议。** 同一 stage 路由超过 5 次，必须 escalate，不得因为"感觉快要通了"而继续尝试。
>
> **handoff 请求必须路由到 handoff skill，不得在 orchestrate 内处理。** orchestrate 只识别、不执行。

## 常见陷阱

| 陷阱 | 信号 | 修复 |
|------|------|------|
| 状态不一致 | state.json 与实际不符 | 读取实际文件，重新同步 |
| 循环路由 | 反复在两个 state 间跳 | 设置最大循环次数（5次），超限上报 |
| Handoff 协议漂移 | 交接逻辑分散在多个 skill 中 | handoff 作为独立 skill 统一维护 |
| Handoff 过轻 | 下一会话知道 stage，但不知道怎么继续干 | handoff skill 负责 8 槽交接包，`snapshot.json` 只负责结构化恢复 |

## 质量检查清单

- [ ] 状态检测完整（所有字段已读取）
- [ ] 路由决策已做出（不是"待定"）
- [ ] 置信度已评估
- [ ] 决策理由已记录
- [ ] 状态已更新到 state.json
- [ ] Handoff 文件已生成（如需要）
- [ ] Telemetry 已写入
- [ ] 下一步 skill 已明确
