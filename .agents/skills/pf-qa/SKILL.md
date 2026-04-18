---
name: pf-qa
description: "条件启用的真实浏览器 QA。仅在 review 判定 qa_required=true 时进入；默认使用 Playwright，不可用时降级到手动验证。"
layer: operation
owner: qa
inputs:
  - review_report
  - qa_required
  - staging_url
outputs:
  - qa_report
  - qa_result
entry_modes:
  - release-ready
test_tags:
  - "[happy-path]"   # 核心用户流程，失败即阻塞
  - "[edge-case]"    # 边界条件，失败高优先级
  - "[error-case]"   # 错误处理，失败中优先级
---

# QA

## 一句话定义

真实浏览器测试——只在需要真实运行时验证时启用，用浏览器把关键路径再跑一遍。

## 为什么这个 skill 存在

单元测试证明代码在隔离环境下的行为是对的。qa 证明的是：用户在真实浏览器里走完整个路径，系统表现符合预期。这两件事不能互相替代。qa 的存在是为了覆盖"代码正确但系统行为对用户来说是错的"这类问题——只有真实运行时才能发现。

## 定位

当 review 通过，且 `qa_required = true` 时，进入 qa。

当只想跑单元测试（那是 verify 的事），不要进入 qa。

当没有 staging 环境时，不要开始 qa；先告知用户并等待提供 `staging_url`。

## 不干什么

- qa 不跑单元测试（那是 verify 的事）
- qa 不做代码审查（那是 review 的事）
- qa 不做部署（那是 ship 的事）
- qa 不默认自动修复发现的问题

## 合规锚点

> **`qa_required = false` 时不得进入 qa，即使你认为"验证一下也没坏处"。** qa 是按需启用的，不是默认流程的一部分。
>
> **Playwright 不可用时，qa_result 必须是 partial，不能是 pass。** 手动走一遍 happy path 是降级验证，不是完整 QA。降级必须在报告里明确写出。
>
> **没有 staging URL，不得开始 qa。** 先告知用户并等待提供，不要假装用生产环境或 localhost 替代。
>
> **happy-path 失败必须阻塞，不能跳过。** edge-case 和 error-case 可以是 partial，但核心用户流程不通就不是 qa-pass。

## 启用条件

只有下面这些场景才应该进 qa：

- 存在用户路径
- 存在浏览器交互
- 存在关键集成链路
- 存在高风险运行时行为

如果 `qa_required = false`，当前协议下都不应主动进入 qa。

## 运行能力检测

```bash
# 检测 Playwright 是否可用
if command -v npx &>/dev/null && npx playwright --version &>/dev/null; then
  PLAYWRIGHT_AVAILABLE=true
  echo "playwright detected"
else
  PLAYWRIGHT_AVAILABLE=false
  echo "No browser automation available, fallback to manual QA"
fi
```

## 默认模式（Playwright）

```bash
# 如果 Playwright 可用，执行自动化 QA
if [ "$PLAYWRIGHT_AVAILABLE" = "true" ]; then
  echo "Using Playwright for QA..."
fi
```

## 自动化模式（Playwright）

当 Playwright 可用时，使用基础脚本。测试文件约定放在 `tests/e2e/` 目录，命名规范为 `[场景].spec.ts`。

### 测试文件规范

```typescript
// tests/e2e/[feature].spec.ts
import { test, expect } from '@playwright/test';

test('[happy-path] 功能名称', async ({ page }) => {
  await page.goto(process.env.STAGING_URL);
  // 核心流程步骤
  await page.click('[data-testid="primary-action"]');
  await expect(page.locator('[data-testid="success-state"]')).toBeVisible();
});

test('[edge-case] 边界条件名称', async ({ page }) => {
  // 边界条件测试
});

test('[error-case] 错误处理名称', async ({ page }) => {
  // 错误场景测试
});
```

### 降级决策检查

```bash
# 检查 tests/e2e/ 目录是否有测试文件
if [ -d "tests/e2e" ] && [ "$(ls -A tests/e2e/*.spec.* 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
  _QA_MODE="full"
  echo "tests/e2e/ 有 $(ls tests/e2e/*.spec.* 2>/dev/null | wc -l | tr -d ' ') 个测试文件，执行完整 E2E"
else
  _QA_MODE="partial"
  echo "tests/e2e/ 目录为空或不存在，降级为基础健康检查"
fi
```

> `_QA_MODE = partial` 时只做基础健康检查（页面能打开、无 JS 错误），不能替代完整 E2E。此时 `qa_result = partial`，需在报告中注明测试覆盖不完整，并在 release 中披露。

## 手动降级模式（无 Playwright）

当当前环境没有 Playwright 时，QA 仍可执行，但必须显式降级为手动验证：

- 打开 staging 环境
- 按 Happy Path 走一遍核心流程
- 记录关键页面、关键操作、结果截图或观察结论
- 明确写出本轮未覆盖的边界条件

此时默认 `qa_result = partial`，除非用户明确接受只做手动冒烟验证。

### 步骤 1：Happy Path 测试

```bash
STAGING_URL="${STAGING_URL:-https://staging.example.com}" npx playwright test --grep "[happy-path]" 2>&1 | tee /tmp/qa-happy.log
```

### 步骤 2：边界条件测试

```bash
STAGING_URL="${STAGING_URL:-https://staging.example.com}" npx playwright test --grep "[edge-case]" 2>&1 | tee /tmp/qa-edge.log
```

### 步骤 3：错误处理测试

```bash
STAGING_URL="${STAGING_URL:-https://staging.example.com}" npx playwright test --grep "[error-case]" 2>&1 | tee /tmp/qa-error.log
```

### 步骤 4：结果汇总

```bash
# 合并所有 QA 结果
echo "=== QA 结果汇总 ==="
cat /tmp/qa-happy.log /tmp/qa-edge.log /tmp/qa-error.log | grep -E "(PASSED|FAILED|ERROR)"
```

## QA 报告格式

```markdown
## QA 报告

**Staging URL**：[URL]
**测试时间**：[时间戳]

### 测试覆盖

| 场景 | 状态 | 说明 |
|------|------|------|
| Happy Path - 核心流程 | PASS/FAIL | [描述] |
| 边界条件 - [名称] | PASS/FAIL | [描述] |
| 错误处理 - [名称] | PASS/FAIL | [描述] |

### 发现的问题

| # | 位置 | 问题描述 | 严重度 | 修复状态 |
|---|------|---------|--------|---------|
| 1 | [页面/操作] | [描述] | P1/P2 | 待修复/已转 diagnose |

### 结果
**qa_result**: pass / partial / fail
```

## 问题处理流程（如果 QA 发现 bug）

```bash
# 记录问题
# 根因不清：回 diagnose
# 根因清楚且已授权修复：回 implement
# 修复后重新回到 qa 验证
```

## Decision 契约

**decision**: qa-pass
**confidence**: 0.9
**rationale**: 需要真实运行时验证的关键路径已覆盖，未发现阻塞性运行时问题
**fallback**: 如果发现 bug，回 diagnose 或 implement；如果只是 partial，带限制进入 ship
**escalate**: false
**next_skill**: ship（qa_result = pass 时）

> qa_result = partial（降级模式，测试覆盖不完整）：decision = qa-partial，confidence = 0.7，仍可 ship 但需在 release 中披露
> qa_result = fail（发现 bug）：decision = qa-fail，confidence = 0.85，next_skill = diagnose

## 状态更新

```bash
_QA_RESULT="${QA_RESULT:?set QA_RESULT to pass|partial|fail}"
_QA_DECISION="${QA_DECISION:?set QA_DECISION to qa-pass|qa-partial|qa-fail}"
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "qa" >/dev/null
$_PF_CLI state set qa_result "$_QA_RESULT" >/dev/null
$_PF_CLI state set last_decision "$_QA_DECISION" >/dev/null

# Exit Protocol
case "$_QA_RESULT" in
  pass)
    _EXIT_CODE="ok"
    _EXIT_NEXT="ship"
    _EXIT_REASON="关键用户路径已验证通过"
    ;;
  partial)
    _EXIT_CODE="ok"
    _EXIT_NEXT="ship"
    _EXIT_REASON="QA 覆盖不完整，带已知限制进入 ship"
    ;;
  fail)
    _EXIT_CODE="ok"
    _EXIT_NEXT="diagnose"
    _EXIT_REASON="发现 bug，进入根因诊断"
    ;;
esac
$_PF_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"qa\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_QA_DECISION\",\"confidence\":0.9,\"qa_result\":\"$_QA_RESULT\",\"bugs_found\":${BUGS_FOUND:-0},\"bugs_fixed\":${BUGS_FIXED:-0}}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] Happy Path 覆盖了核心用户流程
- [ ] 边界条件有测试
- [ ] 错误场景有测试
- [ ] 发现的 bug 有具体位置和描述
- [ ] qa_result = partial / fail 时，后续路由与披露要求已写清楚
