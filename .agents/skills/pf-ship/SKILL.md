---
name: pf-ship
description: "进入生产前的交付收口层。接收 review 通过后的变更，在 qa 完成或不需要 qa 的前提下执行检查、生成执行建议，并在项目已显式适配时执行 merge/deploy/canary。"
layer: operation
owner: ship
inputs:
  - review_report
  - qa_report
outputs:
  - deployment_result
  - ship_result
entry_modes:
  - build-ready
  - release-ready
---

# Ship

## 一句话定义

从 review/qa 通过到生产验证的交付收口层——pre-ship checklist → 测试/覆盖率 → 执行建议或项目适配执行 → canary verify。

## 为什么这个 skill 存在

review 通过不等于可以上线。在合并代码和生产验证之间，还有一段"如果这里出问题，怎么恢复"的责任。ship 的存在是为了在真正执行交付动作之前，确认回滚方案已知、依赖已就绪、监控已配置——把"可以上线"从一个感觉变成一个核查过的结论。

## 定位

当 review 已通过，且满足下面任一条件时，进入 ship：

- `qa_required = false`
- `qa_required = true` 且 `qa_result = pass / partial`

当还在等待 QA 结果时（那是 qa 的事），不要进入 ship。

当发现严重问题需要回滚时（那是 diagnose 的事），不要进入 ship。

## 不干什么

- ship 不做代码审查（那是 review 的事）
- ship 不做 QA 测试（那是 qa 的事）
- ship 不做发布决策（那是 release 的事，ship 是执行）
- ship 不默认假设主干分支名、合并策略或部署平台

## 进入条件

- [ ] review_result = pass 或 pass_with_risks
- [ ] `qa_required = false`，或
- [ ] `qa_required = true` 且 `qa_result = pass / partial`

如果 `qa_required = true` 且还没有 `qa_result`，不要进入 ship。

## 合规锚点

> **不得猜测目标分支名或部署命令。** 如果 `SHIP_TARGET_BRANCH` 或 `PROJECT_DEPLOY_CMD` 未设置，停留在 advisory 模式，生成执行建议，等待用户提供。猜错分支名比不合并更危险。
>
> **advisory 模式下，不得写入 `ship_result = done`。** ship_result 只在真正执行了部署并通过 canary 之后才写入。advisory 的决策结果是 `ship-advisory`，不是 `ship-done`。
>
> **跳过 QA 或 QA 为 partial 时，必须在 Ship 报告里明确写出。** 这不是可选项，它是给 release 做诚实披露的输入。

## 执行模式

ship 有两种模式：

- `advisory`（默认）：做检查、收集上下文、生成下一步执行建议，不直接 merge / push / deploy
- `project-adapted`：只有项目显式提供分支、测试、覆盖率、部署命令时，才执行真实动作

进入 `project-adapted` 的最低条件：

- `SHIP_TARGET_BRANCH` 已明确
- `PROJECT_TEST_CMD` 已明确
- `PROJECT_COVERAGE_CMD` 已明确
- `PROJECT_DEPLOY_CMD` 已明确

缺任一项时，默认停留在 `advisory`，不要猜。

## Pre-Ship Checklist

在执行部署之前，必须完成以下检查：

```bash
echo "=== Pre-Ship Checklist ==="

# 1. 检查是否有未合并的依赖
echo "[1] 检查依赖..."
# 确认所有依赖 PR 已合并

# 2. 数据迁移安全性
echo "[2] 检查迁移..."
# 如果有数据迁移，确认回滚方案

# 3. 配置变更披露
echo "[3] 检查配置..."
# 如果有配置变更，确认已记录

# 4. 监控指标
echo "[4] 检查监控..."
# 确认生产监控已配置

# 5. 回滚方案
echo "[5] 回滚方案..."
# 确认回滚命令已记录

echo "Pre-ship checklist complete"
```

### Pre-Ship Checklist 详细项

| 检查项 | 具体内容 | 状态 |
|--------|---------|------|
| 依赖已合并 | 所有相关模块 PR 已合并 | □ |
| 数据迁移安全 | 有回滚方案，已测试 | □ |
| 配置变更记录 | 配置变更已文档化 | □ |
| 监控已配置 | 关键指标已上线监控 | □ |
| 回滚方案已记录 | 回滚命令可用 | □ |

如果有任何项未完成，暂停并解决后再继续。

如果 QA 被跳过或仅有 `partial` 结果，必须在 Ship 报告里明确写出，供 release 披露。

## Ship 流水线

### 步骤 1：收集交付上下文

```bash
_BRANCH=$(git branch --show-current)
_TARGET_BRANCH="${SHIP_TARGET_BRANCH:-}"

echo "Current branch: $_BRANCH"
echo "Target branch: ${_TARGET_BRANCH:-unset}"

if [ -z "$_TARGET_BRANCH" ]; then
  echo "ship mode: advisory (missing SHIP_TARGET_BRANCH)"
else
  echo "ship mode candidate: project-adapted"
fi
```

### 步骤 2：运行测试

```bash
# 运行项目自己的完整测试命令
# 例如：
#   Python: pytest
#   Java: ./gradlew test 或 mvn test
#   Node: npm test / pnpm test / yarn test
#   Go: go test ./...
#   Shell: bats tests/
_TEST_CMD="${PROJECT_TEST_CMD:-}"
[ -n "$_TEST_CMD" ] || { echo "PROJECT_TEST_CMD is required for executable ship"; exit 1; }
eval "$_TEST_CMD" 2>&1 | tee /tmp/ship-tests.log

# 检查测试结果
if grep -q "FAIL" /tmp/ship-tests.log; then
  echo "Tests failed, aborting ship"
  exit 1
fi
```

### 步骤 3：覆盖率审计

```bash
# 运行项目自己的覆盖率命令
# 例如：
#   Python: pytest --cov
#   Java: ./gradlew jacocoTestReport / mvn test jacoco:report
#   Node: npm run coverage / pnpm coverage / yarn coverage
#   Go: go test ./... -coverprofile=coverage.out
_COVERAGE_CMD="${PROJECT_COVERAGE_CMD:-}"
[ -n "$_COVERAGE_CMD" ] || { echo "PROJECT_COVERAGE_CMD is required for executable ship"; exit 1; }
eval "$_COVERAGE_CMD" 2>&1 | tee /tmp/ship-coverage.log
_THRESHOLD=$(cat .primeflow/coverage_threshold 2>/dev/null || echo "80")

# 提取覆盖率数字（兼容 jest/vitest/coverage/pytest/jacoco/go test 等多框架）
# 策略：多模式 grep，取第一个非空数值
_COVERAGE=""
for _PATTERN in \
  "All files[^0-9]*[0-9]+%" \
  "coverage:[^0-9]*[0-9]+%" \
  "Total:[^0-9]*[0-9]+%" \
  "total[^0-9]*statements[^0-9]*[0-9]+%" \
  "TOTAL[^0-9]*[0-9]+%" \
  "%\s*[0-9]+\s*$" \
  "[0-9]+\.[0-9]+%" \
  "^COVERAGE:\s*[0-9]+"
do
  _COVERAGE=$(grep -iE "$_PATTERN" /tmp/ship-coverage.log | head -1 | grep -oE "[0-9]+\.?[0-9]*%" | tr -d '%' | awk '{print int($1)}')
  [ -n "$_COVERAGE" ] && break
done

if [ -z "$_COVERAGE" ] || [ "$_COVERAGE" -eq 0 ] 2>/dev/null; then
  echo "Coverage extraction failed (unknown format), recording as unknown"
  _COVERAGE="unknown"
fi

if [ "$_COVERAGE" != "unknown" ] && [ "$_COVERAGE" -lt "$_THRESHOLD" ]; then
  echo "Coverage below threshold: $_COVERAGE% (threshold: $_THRESHOLD%)"
  echo "Coverage failure recorded as known failure in ship report"
  # 覆盖率不足算已知失败，在 Ship 报告中明确记录，不阻止流程但不可隐瞒
  # 阈值说明：80% 只是常见经验值，不是统一标准。
  # 适用于 API 服务、控制台、工具库等中等复杂度项目。
  # 高复杂度核心模块建议 85%+，简单脚本项目可降至 70%。
  # 如需调整，在项目根目录放置 .primeflow/coverage_threshold 文件，
  # 内容为整数阈值百分比，ship 会优先读取该文件。
fi
```

### 步骤 4：生成合并建议，必要时执行

```bash
echo "Recommended merge command:"
echo "  git checkout ${SHIP_TARGET_BRANCH:-<target-branch>}"
echo "  git merge ${_BRANCH:-<current-branch>} --no-ff"

if [ -n "${SHIP_TARGET_BRANCH:-}" ] && [ "${SHIP_EXECUTE:-false}" = "true" ]; then
  git fetch origin
  git checkout "$SHIP_TARGET_BRANCH"
  git pull origin "$SHIP_TARGET_BRANCH"
  git merge "$_BRANCH" --no-ff -m "Merge $_BRANCH"
else
  echo "ship mode: advisory (set SHIP_EXECUTE=true to run merge)"
fi
```

### 步骤 5：生成部署建议，必要时执行

```bash
_DEPLOY_STATUS="not-run"
_DEPLOY_CMD="${PROJECT_DEPLOY_CMD:-}"

if [ -z "$_DEPLOY_CMD" ]; then
  echo "Recommended deploy command: export PROJECT_DEPLOY_CMD='<real deploy command>'"
  echo "ship mode: advisory (missing PROJECT_DEPLOY_CMD)"
elif [ "${SHIP_EXECUTE:-false}" = "true" ]; then
  echo "Running deploy command..."
  eval "$_DEPLOY_CMD" 2>&1 | tee /tmp/ship-deploy.log
  _DEPLOY_STATUS="deployed"
else
  echo "Recommended deploy command: $_DEPLOY_CMD"
  echo "ship mode: advisory (set SHIP_EXECUTE=true to run deploy)"
fi
```

> `ship` 不假设你使用某一种语言、主干分支、平台或部署方式。测试命令、覆盖率命令、目标分支和部署命令都应由当前项目显式提供。

### 步骤 6：Canary 验证

```bash
echo "=== Canary 验证 ==="

if [ "${SHIP_EXECUTE:-false}" != "true" ] || [ "$_DEPLOY_STATUS" != "deployed" ]; then
  echo "ship mode: advisory，跳过 canary；等待真实部署后再写 ship_result"
  exit 0
fi

# 等待部署生效（给服务启动留出缓冲时间）
sleep 30

# 收集 canary 指标
_CANARY_PASS=true
_CANARY_ERRORS=""
_NODE_BIN="${NODE_BIN:-node}"

# 检测指标来源（按优先级尝试）
# 优先级1：应用自身健康端点（如 /health, /status）
# 优先级2：Grafana/Prometheus 等监控 API（通过 GRAFANA_URL 环境变量）
# 优先级3：Vercel 部署状态（通过 vercel inspect）

# --- 端点检查 ---
if [ "$_CANARY_PASS" = "true" ]; then
  _HEALTH_URL="${HEALTH_URL:-}"
  _HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-10}"

  if [ -z "$_HEALTH_URL" ]; then
    echo "  未提供 HEALTH_URL，跳过端点检查"
  else
    echo "检查健康端点: $_HEALTH_URL"
    _HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$_HEALTH_TIMEOUT" "$_HEALTH_URL" 2>/dev/null || echo "000")

    if [ "$_HEALTH_STATUS" = "200" ] || [ "$_HEALTH_STATUS" = "204" ]; then
      echo "  健康端点返回: $_HEALTH_STATUS → PASS"
    elif [ "$_HEALTH_STATUS" = "000" ]; then
      echo "  健康端点不可达（$_HEALTH_URL），跳过端点检查"
    else
      echo "  健康端点异常: $_HEALTH_STATUS"
      _CANARY_PASS=false
      _CANARY_ERRORS="${_CANARY_ERRORS}health_endpoint=${_HEALTH_STATUS};"
    fi
  fi
fi

# --- 错误率检查（通过监控 API）---
if [ "$_CANARY_PASS" = "true" ] && [ -n "$GRAFANA_URL" ] && [ -n "$GRAFANA_API_KEY" ]; then
  echo "从 Grafana 查询错误率..."
  _ERROR_RATE=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "$GRAFANA_URL/api/datasources/proxy/1/query" \
    --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[5m])' \
    --data-urlencode 'epoch=now' \
    -o /tmp/grafana_response.json 2>/dev/null)

  if [ -s /tmp/grafana_response.json ]; then
    _ERR_COUNT=$("$_NODE_BIN" -e 'const fs=require("fs"); try { const data=JSON.parse(fs.readFileSync("/tmp/grafana_response.json","utf8")); const value=data?.data?.result?.[0]?.values?.[0]?.[1] ?? "0"; process.stdout.write(String(value)); } catch { process.stdout.write("0"); }')
    # 错误率 > 5% 算异常
    _ERR_THRESHOLD=5
    if "$_NODE_BIN" -e 'const value=Number(process.argv[1]); const threshold=Number(process.argv[2]); process.exit(value > threshold ? 0 : 1)' "$_ERR_COUNT" "$_ERR_THRESHOLD"; then
      echo "  错误率异常: ${_ERR_COUNT}%（阈值: ${_ERR_THRESHOLD}%）"
      _CANARY_PASS=false
      _CANARY_ERRORS="${_CANARY_ERRORS}error_rate=${_ERR_COUNT};"
    else
      echo "  错误率: ${_ERR_COUNT}% → PASS"
    fi
  fi
fi

# --- 延迟检查 ---
if [ "$_CANARY_PASS" = "true" ] && [ -n "$GRAFANA_URL" ] && [ -n "$GRAFANA_API_KEY" ]; then
  echo "从 Grafana 查询 P99 延迟..."
  _P99_LATENCY=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "$GRAFANA_URL/api/datasources/proxy/1/query" \
    --data-urlencode 'query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))' \
    --data-urlencode 'epoch=now' \
    -o /tmp/grafana_latency.json 2>/dev/null)

  if [ -s /tmp/grafana_latency.json ]; then
    _LAT_VAL=$("$_NODE_BIN" -e 'const fs=require("fs"); try { const data=JSON.parse(fs.readFileSync("/tmp/grafana_latency.json","utf8")); const value=data?.data?.result?.[0]?.values?.[0]?.[1] ?? "0"; process.stdout.write(String(value)); } catch { process.stdout.write("0"); }')
    _LAT_MS=$("$_NODE_BIN" -e 'const value=Number(process.argv[1] || "0"); process.stdout.write(String(Math.trunc(value * 1000)));' "$_LAT_VAL")
    _LAT_THRESHOLD="${LAT_THRESHOLD_MS:-2000}"
    if [ "$_LAT_MS" -gt "$_LAT_THRESHOLD" ] 2>/dev/null; then
      echo "  P99 延迟异常: ${_LAT_MS}ms（阈值: ${_LAT_THRESHOLD}ms）"
      _CANARY_PASS=false
      _CANARY_ERRORS="${_CANARY_ERRORS}p99_latency=${_LAT_MS}ms;"
    else
      echo "  P99 延迟: ${_LAT_MS}ms → PASS"
    fi
  fi
fi

# --- Vercel 部署状态检查（降级方案）---
if [ "$_CANARY_PASS" = "true" ] && command -v vercel &>/dev/null; then
  echo "检查 Vercel 部署状态..."
  _VERCEL_INSPECT=$(vercel inspect "$(vercel ls 2>/dev/null | grep -m1 production | awk '{print $2}')" 2>/dev/null | grep -i "error\|fail\|ready" | head -3 || true)
  if echo "$_VERCEL_INSPECT" | grep -qi "error\|fail"; then
    echo "  Vercel 部署异常: $_VERCEL_INSPECT"
    _CANARY_PASS=false
    _CANARY_ERRORS="${_CANARY_ERRORS}vercel_deploy_fail;"
  fi
fi

# --- 结果判定 ---
if [ "$_CANARY_PASS" = "true" ]; then
  echo "Canary 验证: PASS"
  _CANARY_RESULT="PASS"
else
  echo "Canary 验证: FAIL"
  echo "异常指标: $_CANARY_ERRORS"
  _CANARY_RESULT="FAIL"
  gh issue create --title "[Canary Alert] $_BRANCH" --body "Canary 验证失败。异常指标: $_CANARY_ERRORS" 2>/dev/null || true
fi
```

## Ship 报告格式

```markdown
## Ship 报告

**分支**：[分支名]
**部署时间**：[时间戳]

### Pre-Ship Checklist
- □ 依赖已合并
- □ 数据迁移安全
- □ 配置变更记录
- □ 监控已配置
- □ 回滚方案已记录

### Pipeline 状态

| 阶段 | 状态 |
|------|------|
| Tests | PASS/FAIL |
| Coverage | [N]% |
| Review | [pass / pass_with_risks] |
| QA Required | [true / false] |
| QA Result | [pass / partial / skipped] |
| Merge | Done |
| Deploy | Done |
| Canary | PASS/FAIL |

### 产出
- **PR**: [PR链接]
- **部署状态**: [deployed/failed/canary_failed]
- **Canary 结果**: [PASS/FAIL]
- **QA 跳过依据**: [若跳过 qa，写明理由]
```

## Decision 契约

**decision**: ship-done
**confidence**: 0.9
**rationale**: 仅在 project-adapted 执行成功且 ship_result = done 时，才能进入 release
**fallback**: 缺少项目命令时停留在 advisory；canary 失败时触发 diagnose，不盲目继续
**escalate**: false
**next_skill**: release
**next_action**: 进入 release 做发布决策

> 若 Canary 验证失败：decision = ship-canary-failed，confidence = 0.8，next_skill = diagnose
> 若部署完全失败：decision = ship-failed，confidence = 0.7，escalate = true，next_skill = escalate
> 若仍处于 advisory：decision = ship-advisory，confidence = 0.6，escalate = true，next_skill = orchestrate（等待人工执行真实交付或补齐项目命令）

## 状态更新

```bash
[ "${SHIP_EXECUTE:-false}" = "true" ] || {
  echo "advisory mode: do not persist ship_result"
  echo "decision = ship-advisory"
  echo "next_skill = orchestrate"
  exit 0
}

_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "ship" >/dev/null
$_PF_CLI state set ship_result "done" >/dev/null
$_PF_CLI state set last_decision "ship-done" >/dev/null

# Exit Protocol
$_PF_CLI state set exit_code "ok" >/dev/null
$_PF_CLI state set exit_reason "部署完成，canary 验证通过" >/dev/null
$_PF_CLI state set next_skill "release" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"ship\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"ship-done\",\"confidence\":0.9,\"ship_result\":\"done\",\"deploy_status\":\"deployed\",\"canary\":\"PASS\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] Pre-ship checklist 全部完成
- [ ] review_result 已通过
- [ ] qa_required / qa_result 的组合是合法的
- [ ] 如果跳过 qa，依据已记录
- [ ] 如果 qa_result = partial，限制已记录
- [ ] 测试全部通过（或已知失败项已记录）
- [ ] 覆盖率已确认
- [ ] advisory 模式下，合并/部署建议已记录；执行模式下，真实命令已跑通
- [ ] Canary 验证通过（或已触发告警）
- [ ] 回滚方案已知
