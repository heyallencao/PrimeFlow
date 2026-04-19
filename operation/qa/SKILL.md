---
name: ks-qa
description: "Conditional real-runtime QA. Enter only when review set qa_required=true. Use Playwright by default, and degrade to manual validation when automation is unavailable."
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
  - "[happy-path]"
  - "[edge-case]"
  - "[error-case]"
---

# QA

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

Runs real-browser or real-runtime validation for critical user paths when review explicitly requires it. Unit tests prove behavior in isolation; QA proves whether the system behaves correctly for a real user in a real runtime path. Enter only when review passed and `qa_required = true`. Does not run unit tests, does not review code, does not deploy, does not silently fix bugs.

## Compliance Anchors

> **If `qa_required = false`, do not enter QA.**
>
> **If Playwright is unavailable, the best honest result is usually `partial`, not `pass`.**
>
> **Without a staging URL or equivalent runtime target, QA cannot start.**
>
> **A failed happy path blocks QA.**

## Scaling Rule

| Project type | Phases |
|---|---|
| Frontend (runtime + Playwright) | 1-10 (all) |
| Backend-only (no browser) | 1-3, 6-9 |
| No Playwright | skip phase 4; degrade to manual walkthrough, result is `partial` |
| No runtime accessible | skip phases 4-5 |
| No staging URL | block QA, `qa_result = fail` |
| No e2e structure | generate scaffolding in phase 2 |

## Scaled QA Pipeline

### Phase 1: Setup

Always runs. Detect staging URL, verify Playwright, check e2e structure.

```bash
# Staging URL
_STAGING_URL="${STAGING_URL:-}"
[ -z "$_STAGING_URL" ] && { echo "ERROR: STAGING_URL not set. QA cannot proceed."; QA_RESULT="fail"; }

# Playwright
_PLAYWRIGHT_AVAILABLE=false
command -v npx &>/dev/null && npx playwright --version &>/dev/null 2>&1 && _PLAYWRIGHT_AVAILABLE=true

# Reachability
_STAGING_REACHABLE=false
curl -sf -o /dev/null "$_STAGING_URL" 2>/dev/null && _STAGING_REACHABLE=true \
  || { sleep 5; curl -sf -o /dev/null "$_STAGING_URL" 2>/dev/null && _STAGING_REACHABLE=true; }

# E2E directory
_E2E_DIR=""
for _d in tests/e2e e2e cypress/e2e; do [ -d "$_d" ] && { _E2E_DIR="$_d"; break; }; done
```

### Phase 2: Framework Detection

Always runs. Identify test runner, find or scaffold e2e directory.

```bash
_TEST_RUNNER="unknown"
[ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ] && _TEST_RUNNER="playwright"
[ -f "cypress.config.ts" ] || [ -f "cypress.config.js" ] && _TEST_RUNNER="cypress"
[ -f "wdio.conf.ts" ] || [ -f "wdio.conf.js" ] && _TEST_RUNNER="webdriverio"

# Scaffold if no e2e structure
if [ -z "$_E2E_DIR" ] && [ "$_TEST_RUNNER" = "unknown" ]; then
  mkdir -p tests/e2e && _E2E_DIR="tests/e2e"
  cat > tests/e2e/happy-path.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';
test('[happy-path] basic load', async ({ page }) => {
  await page.goto(process.env.STAGING_URL || 'http://localhost:3000');
  await expect(page).toHaveTitle(/.+/);
});
EOF
  cat > tests/e2e/edge-case.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';
test('[edge-case] empty state', async ({ page }) => {
  await page.goto(process.env.STAGING_URL || 'http://localhost:3000');
  // TODO: add edge-case scenarios
});
EOF
  cat > tests/e2e/error-case.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';
test('[error-case] network failure', async ({ page }) => {
  await page.goto(process.env.STAGING_URL || 'http://localhost:3000');
  // TODO: add error-case scenarios
});
EOF
fi

# Auto-generate config if Playwright available but unconfigured
if [ "$_PLAYWRIGHT_AVAILABLE" = "true" ] && [ ! -f "playwright.config.ts" ] && [ ! -f "playwright.config.js" ]; then
  cat > playwright.config.ts << 'EOF'
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.STAGING_URL || 'http://localhost:3000' },
});
EOF
  echo "WARNING: Auto-generated playwright.config.ts"
fi
```

### Phase 3: Test Execution

Always runs. Execute tagged scenarios against staging URL.

```bash
if [ "$_TEST_RUNNER" = "playwright" ] && [ "$_PLAYWRIGHT_AVAILABLE" = "true" ]; then
  STAGING_URL="$_STAGING_URL" npx playwright test --grep "[happy-path]" 2>&1 | tee /tmp/qa-happy.log
  _HAPPY_EXIT=${PIPESTATUS[0]}

  STAGING_URL="$_STAGING_URL" npx playwright test --grep "[edge-case]" 2>&1 | tee /tmp/qa-edge.log
  STAGING_URL="$_STAGING_URL" npx playwright test --grep "[error-case]" 2>&1 | tee /tmp/qa-error.log

  [ "$_HAPPY_EXIT" -ne 0 ] && { echo "BLOCKING: Happy path failed."; QA_RESULT="fail"; }
elif [ "$_TEST_RUNNER" = "cypress" ]; then
  npx cypress run --env STAGING_URL="$_STAGING_URL" 2>&1 | tee /tmp/qa-cypress.log
else
  echo "No test runner detected. Relying on manual validation in phase 4."
fi
```

| Tag | Exit 0 | Exit non-0 | Skipped |
|---|---|---|---|
| `[happy-path]` | PASS | BLOCKING FAIL | must run |
| `[edge-case]` | PASS | FAIL (non-blocking) | OK with disclosure |
| `[error-case]` | PASS | FAIL (non-blocking) | OK with disclosure |

### Phase 4: Interactive Testing

Runs when Playwright + staging URL are available. Walk user-facing paths.

```bash
[ "$_PLAYWRIGHT_AVAILABLE" = "true" ] && [ "$_STAGING_REACHABLE" = "true" ] && {
  echo "=== Phase 4: Interactive Testing ==="
  # Walk primary user flows not covered by tagged tests.
  # Capture screenshots at each step for evidence.
  #
  # Walkthrough pattern:
  #   1. Load landing page -> screenshot to /tmp/qa-screenshots/01-landing.png
  #   2. Navigate to primary feature -> screenshot 02-feature.png
  #   3. Complete a core action (form submit, click, input) -> screenshot 03-action.png
  #   4. Verify result state (data appears, transition completes) -> screenshot 04-result.png
  #   5. Navigate back -> verify state restored -> screenshot 05-back.png
  #
  # Record any visual breakage, layout shifts, or missing content.
}
```

**No Playwright**: degrade to manual walkthrough via agent browser tool. Walk the staging URL by hand, record each step and outcome. Result is `partial`.

### Phase 5: Health Check

Runs when runtime is accessible. Console errors, network failures, load indicators.

```bash
[ "$_STAGING_REACHABLE" = "true" ] && {
  echo "=== Phase 5: Health Check ==="
  # Console errors: flag any error-level browser console messages
  # Network failures: flag any 4xx/5xx responses
  # Load indicators: TTFB, LCP
}
```

| Metric | Pass | Warn | Fail |
|---|---|---|---|
| Console errors | 0 | 1-3 | >3 |
| Network 4xx/5xx | 0 | 1-2 | >2 |
| TTFB | <1s | 1-2s | >2s |
| LCP | <2.5s | 2.5-4s | >4s |

### Phase 6: Triage

Always runs. Rank findings, identify top N bugs for fix loop.

```bash
_FIX_BUDGET=15
_FIX_COUNT=0
_WTF_LIKELIHOOD=0
# Rank by severity, select top N for fix loop (N = min(bugs_found, FIX_BUDGET))
```

| Priority | Criteria | Fix loop? |
|---|---|---|
| P0 | Happy-path failure, data loss, security | Yes, mandatory |
| P1 | Core flow broken, crash | Yes |
| P2 | Incorrect display, broken secondary flow | If budget remains |
| P3 | Cosmetic, non-critical | No, document only |

### Phase 7: Fix Loop

Runs when bugs found. Apply fixes within budget, re-verify each.

```bash
[ "${_BUG_COUNT:-0}" -gt 0 ] && {
  echo "=== Phase 7: Fix Loop ==="
  # For each triaged bug (up to FIX_BUDGET):
  #   1. Apply fix to the specific file(s)
  #   2. Re-run only the failing test that exposed the bug
  #   3. Fix fails re-verify -> revert the fix entirely, +15% WTF
  #   4. Fix passes re-verify -> increment _FIX_COUNT
  #   5. If fix touched 2+ files -> +5% WTF
  #   6. Check circuit breaker after each fix
  #   7. Record each fix for regression test generation (phase 10)
  #
  # After fix 15, WTF-likelihood tracking becomes active.
  # The loop ends when: all triaged bugs are addressed, or budget is exhausted,
  # or the circuit breaker triggers (WTF > 20% or hard cap 50 reached).
}
```

**Circuit breaker:**

```text
FIX_BUDGET starts at 15.
After fix 15: enable WTF-likelihood tracking.

WTF-likelihood:
  base = 0%
  each reverted fix: +15%
  each multi-file fix: +5%

Hard cap: 50 fixes.
WTF > 20%: STOP, ask user before continuing.
User approves: continue with current WTF score.
User rejects: exit fix loop, document remaining bugs.
```

**Fix loop exceeds budget (50):** hard stop, document remaining bugs. If any P0/P1 remains unfixed, `qa_result = fail`. If only P2/P3 remains, `qa_result = partial` with disclosure.

### Phase 8: Final QA

Always runs. Re-run full test suite after fixes.

```bash
[ "${_FIX_COUNT:-0}" -gt 0 ] && {
  echo "=== Phase 8: Final QA ==="
  if [ "$_TEST_RUNNER" = "playwright" ] && [ "$_PLAYWRIGHT_AVAILABLE" = "true" ]; then
    STAGING_URL="$_STAGING_URL" npx playwright test 2>&1 | tee /tmp/qa-final.log
  elif [ "$_TEST_RUNNER" = "cypress" ]; then
    npx cypress run --env STAGING_URL="$_STAGING_URL" 2>&1 | tee /tmp/qa-final.log
  fi
  # Non-zero exit: some fixes may have introduced regressions
} || echo "No fixes applied. Using phase 3 results."
```

### Phase 9: Report

Always runs. Generate the QA report.

```markdown
## QA Report

**Staging URL**: [URL]
**Test runner**: [playwright / cypress / unknown / manual]
**Playwright available**: [true / false]
**Test time**: [timestamp]

### Pipeline Execution
| Phase | Name | Status | Notes |
|---|---|---|---|
| 1 | Setup | PASS/SKIP/FAIL | |
| 2 | Framework Detection | PASS/SKIP/FAIL | |
| 3 | Test Execution | PASS/SKIP/FAIL | |
| 4 | Interactive Testing | PASS/DEGRADED/N/A | |
| 5 | Health Check | PASS/WARN/N/A | |
| 6 | Triage | DONE/N/A | bugs ranked: N |
| 7 | Fix Loop | DONE/N/A | fixes: N / budget: N |
| 8 | Final QA | PASS/FAIL/SKIP | |
| 9 | Report | DONE | — |
| 10 | Regression Tests | DONE/N/A | tests generated: N |

### Coverage
| Scenario | Status | Notes |
|---|---|---|
| Happy Path | PASS/FAIL | |
| Edge Case | PASS/FAIL/PARTIAL/SKIP | |
| Error Case | PASS/FAIL/PARTIAL/SKIP | |

### Health Check
| Metric | Value | Status |
|---|---|---|
| Console errors | [count] | PASS/WARN/FAIL |
| Network failures | [count] | PASS/WARN/FAIL |
| TTFB | [value] | PASS/WARN/FAIL |
| LCP | [value] | PASS/WARN/FAIL |

### Bugs Found
| # | Location | Description | Severity | Status |
|---|---|---|---|---|

### Fixes Applied
| # | File(s) | Description | Re-verified | Reverted |
|---|---|---|---|---|

### Circuit Breaker
- Fixes applied: [N] | WTF-likelihood: [N%] | Budget remaining: [N]

### Exceptions
- [list exceptions and handling]

### Result
**qa_result**: pass / partial / fail
```

### Phase 10: Regression Test Generation

Runs only when fixes were applied. Generate regression test for each fix.

```bash
[ "${_FIX_COUNT:-0}" -gt 0 ] && {
  echo "=== Phase 10: Regression Test Generation ==="
  # For each fix applied in phase 7:
  #   1. Identify the bug that was fixed
  #   2. Write a regression test that fails if the bug reappears
  #   3. Tag the test with [regression] and the original bug context
  #   4. Place the test in the e2e directory alongside existing specs
  #
  # Example structure:
  #   test('[regression] <original-bug-description>', async ({ page }) => {
  #     // Steps that previously triggered the bug
  #     // Assertion that the bug does not recur
  #   });
}
```

## Exception Handling Summary

| Exception | Detection | Response |
|---|---|---|
| Playwright installed, no e2e config | Phase 2: missing config file | Auto-generate minimal config, log warning |
| Staging URL unreachable | Phase 1: curl fails twice | Set `_STAGING_REACHABLE=false`, result partial at best |
| Staging URL unset | Phase 1: empty variable | Block QA, `qa_result = fail` |
| No e2e structure | Phase 2: no test directory | Scaffold `tests/e2e/` with placeholder specs |
| Fix loop exceeds budget | Phase 7: 50 fixes reached | Hard stop, document remaining, set result by priority |
| WTF-likelihood > 20% | Phase 7: circuit breaker | Stop, ask user before continuing |
| Happy path fails | Phase 3: non-zero exit | QA blocked, `qa_result = fail` |
| No Playwright | Phase 1: detection | Degrade phase 4 to manual, result is `partial` |

## QA Outcomes

| qa_result | Meaning | Route |
|---|---|---|
| `pass` | Required runtime validation passed | `ship` |
| `partial` | Degraded or incomplete validation | `ship` with disclosure |
| `fail` | Blocking bug found or staging URL missing | `diagnose` |

## Decision Contract

**decision**: qa-pass
**confidence**: 0.9
**rationale**: The required runtime paths were checked and no blocking runtime issue remains.
**fallback**: If a bug is found, route to diagnose. If only partial coverage exists, continue with disclosure.
**escalate**: false
**next_skill**: ship when `qa_result = pass`

> `qa_result = partial` -> `decision = qa-partial`, `confidence = 0.7`, still routes to ship with disclosure
> `qa_result = fail` -> `decision = qa-fail`, `confidence = 0.85`, routes to diagnose

## State Update

```bash
_QA_RESULT="${QA_RESULT:?set QA_RESULT to pass|partial|fail}"
_QA_DECISION="${QA_DECISION:?set QA_DECISION to qa-pass|qa-partial|qa-fail}"
_KS_CLI="${KEYSTONE_CLI:-${HOME}/.keystone/runtime/Keystone/keystone}"

$_KS_CLI state set current_stage "qa" >/dev/null
$_KS_CLI state set qa_result "$_QA_RESULT" >/dev/null
$_KS_CLI state set last_decision "$_QA_DECISION" >/dev/null

case "$_QA_RESULT" in
  pass|partial)
    _EXIT_CODE="ok"
    _EXIT_NEXT="ship"
    _EXIT_REASON="Runtime QA completed"
    ;;
  fail)
    _EXIT_CODE="ok"
    _EXIT_NEXT="diagnose"
    _EXIT_REASON="Blocking runtime bug found"
    ;;
esac
$_KS_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"qa\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_QA_DECISION\",\"confidence\":0.9,\"qa_result\":\"$_QA_RESULT\",\"bugs_found\":${BUGS_FOUND:-0},\"fixes_applied\":${_FIX_COUNT:-0},\"wtf_likelihood\":${_WTF_LIKELIHOOD:-0},\"staging_reachable\":${_STAGING_REACHABLE:-false},\"playwright_available\":${_PLAYWRIGHT_AVAILABLE:-false}}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] happy path was covered
- [ ] edge and error coverage stated honestly
- [ ] degraded execution marked as partial
- [ ] discovered bugs are concrete and ranked by severity
- [ ] fix loop stayed within budget or stopped by circuit breaker
- [ ] WTF-likelihood tracked after fix 15
- [ ] each fix was re-verified
- [ ] regression tests generated for each fix
- [ ] follow-up routing matches QA result
- [ ] exceptions documented in report
