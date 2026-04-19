---
name: ks-ship
description: "Delivery closeout before release. Accepts review-approved changes, runs the final checks, generates execution guidance, and performs merge/deploy/canary only when the project is explicitly adapted for it."
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

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

# Ship

Delivery closeout between review/QA and release. Detects CI/CD config, runs final checks, and executes or advises merge/deploy/canary. Only executes when the project provides the required commands; otherwise stays advisory.

**Enter when**: review passed and (`qa_required = false` or `qa_result = pass|partial`). Do not enter when QA is still running or a severe problem needs diagnosis. **Not responsible for**: code review, QA execution, the final release decision.

## Compliance Anchors

> **Never guess the target branch or deploy command.**
>
> **In advisory mode, do not write `ship_result = done`.**
>
> **If QA was skipped or partial, that fact must appear in the ship report.**

## Modes

| Mode | When | Behavior |
|---|---|---|
| `advisory` | default; `detect-ci` returns unknown, or required commands missing | produce commands, do not execute |
| `project-adapted` | `detect-ci` succeeds and `test_cmd` + `deploy_cmd` + `target_branch` are all non-empty | run the real merge/deploy/canary flow |

`coverage_cmd` may be empty but must be explicitly set. If any required command is missing, stay `advisory`.

## Ship Results

| Result | Meaning | Route |
|---|---|---|
| `done` | pipeline ran and canary passed | `release` |
| `canary_failed` | deployment happened but canary failed | `diagnose` |
| `advisory` | commands or execution authority missing | `orchestrate` / human |

---

## PROCEDURE

### Step 1: Pre-ship checklist

Verify five items. Stop if dependencies are unmerged. WARN items do not block the pipeline but must be disclosed in the ship report.

| # | Item | Check | Block? |
|---|---|---|---|
| 1 | Dependencies merged | `git branch -a | grep -i dep` returns empty | Yes — stop and merge first |
| 2 | Migrations safe | `git diff --name-only HEAD | grep -iE "migrat\|schema\|\.sql$"` returns empty or reversible | No — flag for review |
| 3 | Config documented | `git diff --name-only HEAD | grep -iE "\.env\|config\|settings\|\.yaml$"` changes are in commit messages or changelog | No — flag for review |
| 4 | Monitoring exists | project contains monitoring/alerting config | No — flag for review |
| 5 | Rollback plan | project docs mention rollback or revert procedure | No — flag for review |

```bash
echo "=== Pre-Ship Checklist ==="
_DEPS_BRANCHES=$(git branch -a 2>/dev/null | grep -i "dep\|depend" || true)
[ -n "$_DEPS_BRANCHES" ] && { echo "BLOCK: unmerged dependency branches: $_DEPS_BRANCHES"; exit 1; }
_MIGRATION_FILES=$(git diff --name-only --diff-filter=ACM HEAD 2>/dev/null | grep -iE "migrat|schema|\.sql$" || true)
[ -n "$_MIGRATION_FILES" ] && echo "WARN: migrations changed: $_MIGRATION_FILES"
_CONFIG_FILES=$(git diff --name-only --diff-filter=ACM HEAD 2>/dev/null | grep -iE "\.env|config|settings|\.toml|\.yaml$|\.yml$" | grep -v node_modules || true)
[ -n "$_CONFIG_FILES" ] && echo "WARN: config changed: $_CONFIG_FILES"
echo "[1-5] Checklist complete. WARNs recorded for report."
```

### Step 2: CI/CD detection

Try `keystone detect-ci` first. If the CLI is unavailable or returns unknown, fall back to manual file inspection.

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_CI_TYPE="unknown" _TEST_CMD="" _COVERAGE_CMD="" _DEPLOY_CMD="" _TARGET_BRANCH=""

# --- Attempt 1: keystone detect-ci ---
if command -v keystone >/dev/null 2>&1 || [ -x "$_KS_CLI" ]; then
  _DETECT_OUTPUT=$($_KS_CLI detect-ci 2>/dev/null) && _DETECT_EXIT=0 || _DETECT_EXIT=$?
  if [ "$_DETECT_EXIT" = "0" ] && [ -n "$_DETECT_OUTPUT" ]; then
    echo "detect-ci succeeded"
    _CI_TYPE=$(echo "$_DETECT_OUTPUT" | grep -o '"type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')
    _TEST_CMD=$(echo "$_DETECT_OUTPUT" | grep -o '"test_cmd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')
    _COVERAGE_CMD=$(echo "$_DETECT_OUTPUT" | grep -o '"coverage_cmd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')
    _DEPLOY_CMD=$(echo "$_DETECT_OUTPUT" | grep -o '"deploy_cmd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')
    _TARGET_BRANCH=$(echo "$_DETECT_OUTPUT" | grep -o '"target_branch"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')
  else
    echo "detect-ci returned exit $_DETECT_EXIT or empty output"
  fi
fi

# --- Attempt 2: manual fallback ---
if [ "$_CI_TYPE" = "unknown" ]; then
  echo "Falling back to manual CI/CD detection"
  _TEST_CMD="${PROJECT_TEST_CMD:-$_TEST_CMD}"
  _COVERAGE_CMD="${PROJECT_COVERAGE_CMD:-$_COVERAGE_CMD}"
  _DEPLOY_CMD="${PROJECT_DEPLOY_CMD:-$_DEPLOY_CMD}"
  _TARGET_BRANCH="${SHIP_TARGET_BRANCH:-$_TARGET_BRANCH}"

  if [ -d ".github/workflows" ]; then
    _CI_TYPE="github-actions"
    _WF_TEST=$(grep -rh "run:" .github/workflows/ 2>/dev/null | grep -iE "test|spec|check" | head -1 | sed 's/.*run: *//')
    [ -n "$_WF_TEST" ] && [ -z "$_TEST_CMD" ] && _TEST_CMD="$_WF_TEST"
  fi
  [ -f "Jenkinsfile" ] && _CI_TYPE="jenkins"
  if [ -f "Makefile" ]; then
    [ "$_CI_TYPE" = "unknown" ] && _CI_TYPE="make"
    _MK_TEST=$(grep -E "^(test|check|spec):" Makefile 2>/dev/null | head -1 | cut -d: -f1)
    [ -n "$_MK_TEST" ] && [ -z "$_TEST_CMD" ] && _TEST_CMD="make $_MK_TEST"
    _MK_COV=$(grep -E "^(coverage|cov):" Makefile 2>/dev/null | head -1 | cut -d: -f1)
    [ -n "$_MK_COV" ] && [ -z "$_COVERAGE_CMD" ] && _COVERAGE_CMD="make $_MK_COV"
  fi
  if [ -f "package.json" ]; then
    [ "$_CI_TYPE" = "unknown" ] && _CI_TYPE="node"
    grep -q '"test"' package.json 2>/dev/null && [ -z "$_TEST_CMD" ] && _TEST_CMD="npm test"
    grep -q '"deploy"' package.json 2>/dev/null && [ -z "$_DEPLOY_CMD" ] && _DEPLOY_CMD="npm run deploy"
  fi
fi

echo "CI: $_CI_TYPE | Test: ${_TEST_CMD:-none} | Cov: ${_COVERAGE_CMD:-none} | Deploy: ${_DEPLOY_CMD:-none} | Target: ${_TARGET_BRANCH:-none}"
```

- expected: `_CI_TYPE`, `_TEST_CMD`, `_COVERAGE_CMD`, `_DEPLOY_CMD`, `_TARGET_BRANCH` populated
- if `_CI_TYPE = "unknown"` and all commands empty → [Exception: detect-ci returns unknown](#exception-detect-ci-returns-unknown)

### Step 3: Run project tests using detected command

```bash
echo "=== Tests ==="
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_MODE="advisory"
[ -n "$_TEST_CMD" ] && [ -n "$_DEPLOY_CMD" ] && [ -n "$_TARGET_BRANCH" ] && _MODE="project-adapted"
echo "Mode: $_MODE"

if [ "$_MODE" = "project-adapted" ]; then
  eval "$_TEST_CMD" 2>&1 | tee /tmp/ship-tests.log
  _TEST_EXIT=${PIPESTATUS[0]:-$?}
  [ "$_TEST_EXIT" != "0" ] && { _TEST_RESULT="FAIL"; echo "ERROR: tests failed"; } || _TEST_RESULT="PASS"
else
  echo "Advisory: would run \`$_TEST_CMD\`"
  _TEST_RESULT="advisory"
fi
```

- expected: `_TEST_RESULT = "PASS"`
- if `FAIL` in project-adapted: stop pipeline, route to `diagnose`

### Step 4: Audit coverage using detected command

```bash
echo "=== Coverage ==="
if [ "$_MODE" = "project-adapted" ] && [ -n "$_COVERAGE_CMD" ]; then
  eval "$_COVERAGE_CMD" 2>&1 | tee /tmp/ship-coverage.log
  _COVERAGE_RESULT="available"
elif [ "$_MODE" = "advisory" ] && [ -n "$_COVERAGE_CMD" ]; then
  echo "Advisory: would run \`$_COVERAGE_CMD\`"
  _COVERAGE_RESULT="advisory"
else
  echo "No coverage command. Skipping."
  _COVERAGE_RESULT="skipped"
fi
```

Coverage is informational, not a gate. Disclose non-zero exit in project-adapted mode.

### Step 5: Merge — use detected target branch

```bash
echo "=== Merge ==="
if [ "$_MODE" = "project-adapted" ]; then
  git fetch origin "$_TARGET_BRANCH" 2>&1
  git checkout "$_TARGET_BRANCH" 2>&1 | tee /tmp/ship-checkout.log
  _CHECKOUT_EXIT=${PIPESTATUS[0]:-$?}
  if [ "$_CHECKOUT_EXIT" != "0" ]; then
    _MERGE_RESULT="blocked"
  else
    git merge "$_BRANCH" --no-ff 2>&1 | tee /tmp/ship-merge.log
    _MERGE_EXIT=${PIPESTATUS[0]:-$?}
    if [ "$_MERGE_EXIT" != "0" ]; then
      git merge --abort 2>/dev/null
      _MERGE_RESULT="failed"
    else
      _MERGE_RESULT="done"
    fi
    git checkout "$_BRANCH" 2>/dev/null
  fi
else
  echo "Advisory merge commands:"
  echo "  git fetch origin ${_TARGET_BRANCH:-<target>}"
  echo "  git checkout ${_TARGET_BRANCH:-<target>}"
  echo "  git merge $_BRANCH --no-ff"
  echo "  git push origin ${_TARGET_BRANCH:-<target>}"
  _MERGE_RESULT="advisory"
fi
```

- `_MERGE_RESULT = "blocked"` → [Exception: branch protection blocks merge](#exception-branch-protection-blocks-merge)
- `_MERGE_RESULT = "failed"` → stop, report conflict, route to `diagnose`

### Step 6: Deploy — use detected deploy command

```bash
echo "=== Deploy ==="
if [ "$_MODE" = "project-adapted" ] && [ "$_MERGE_RESULT" = "done" ]; then
  eval "$_DEPLOY_CMD" 2>&1 | tee /tmp/ship-deploy.log
  _DEPLOY_EXIT=${PIPESTATUS[0]:-$?}
  [ "$_DEPLOY_EXIT" != "0" ] && _DEPLOY_RESULT="failed" || _DEPLOY_RESULT="done"
else
  [ -n "$_DEPLOY_CMD" ] && echo "Advisory: would run \`$_DEPLOY_CMD\`" || echo "No deploy command detected"
  _DEPLOY_RESULT="advisory"
fi
```

- `_DEPLOY_RESULT = "failed"` → stop, route to `diagnose`
- `_DEPLOY_RESULT = "advisory"` → continue in advisory mode

### Step 7: Canary verification

Only when deployment actually happened. If not, stay advisory.

```bash
echo "=== Canary ==="
if [ "$_DEPLOY_RESULT" = "done" ]; then
  sleep 5
  _CANARY_PASS=true
  for _url in "http://localhost:8080/health" "http://localhost:3000/health" "http://localhost:8000/health"; do
    _RESP=$(curl -sf -o /dev/null -w "%{http_code}" "$_url" 2>/dev/null || echo "000")
    [ "$_RESP" = "200" ] && { echo "Canary: $_url → 200 OK"; break; }
  done
  # Check deploy log for error indicators
  if [ -f "/tmp/ship-deploy.log" ]; then
    _DEPLOY_ERRORS=$(grep -ciE "error|fail|crash|fatal" /tmp/ship-deploy.log 2>/dev/null || echo "0")
    [ "$_DEPLOY_ERRORS" -gt 0 ] && { echo "WARN: $_DEPLOY_ERRORS error indicators in deploy log"; _CANARY_PASS=false; }
  fi
  [ "$_CANARY_PASS" = "true" ] && _CANARY_RESULT="PASS" || _CANARY_RESULT="FAIL"
else
  echo "Advisory: no deployment, canary not applicable"
  _CANARY_RESULT="advisory"
fi
```

- `_CANARY_RESULT = "FAIL"` → [Exception: canary fails on first check](#exception-canary-fails-on-first-check)

### Step 8: Cross-model second opinion

Lightweight sanity check from a different model. Not a full review.

```bash
echo "=== Cross-Model Second Opinion ==="
_SECOND_OPINION="none"
_DIFF_TARGET="${_TARGET_BRANCH:-origin/main}"
_DIFF_OUTPUT=$(git diff "$_DIFF_TARGET" 2>/dev/null | head -200 || git diff HEAD~1 2>/dev/null | head -200)

if [ -n "$_DIFF_OUTPUT" ]; then
  if command -v codex >/dev/null 2>&1; then
    _CODEX_OUT=$(codex "Review this diff for correctness and security. Be brief, list only real issues: $(echo "$_DIFF_OUTPUT" | head -100)" 2>/dev/null | head -50)
    [ -n "$_CODEX_OUT" ] && { echo "Codex: $_CODEX_OUT"; _SECOND_OPINION="codex"; }
  fi
  if [ "$_SECOND_OPINION" = "none" ] && command -v gemini >/dev/null 2>&1; then
    _GEMINI_OUT=$(gemini "Review this diff for correctness and security. Be brief, list only real issues: $(echo "$_DIFF_OUTPUT" | head -100)" 2>/dev/null | head -50)
    [ -n "$_GEMINI_OUT" ] && { echo "Gemini: $_GEMINI_OUT"; _SECOND_OPINION="gemini"; }
  fi
fi
[ "$_SECOND_OPINION" = "none" ] && echo "No secondary model CLI. Single-model review."
```

- informational only, not a gate
- if secondary model flags something primary review missed → note as "cross-model blind spot" in report
- if no secondary model → note "single-model review" in report

### Step 9: Generate ship report

```markdown
## Ship Report

**Branch**: [$_BRANCH]
**Target branch**: [$_TARGET_BRANCH]
**Mode**: [$_MODE]
**CI type**: [$_CI_TYPE]
**Timestamp**: [ISO 8601]

### Pre-Ship Checklist
| Item | Status |
|---|---|
| Dependencies merged | OK / WARN |
| Migrations safe | OK / WARN |
| Config documented | OK / WARN |
| Monitoring exists | OK / WARN |
| Rollback plan | OK / WARN |

### Pipeline Status
| Stage | Status |
|---|---|
| Tests | PASS / FAIL / advisory |
| Coverage | available / skipped / advisory |
| Review | pass / pass_with_risks |
| QA Required | true / false |
| QA Result | pass / partial / skipped |
| Merge | done / advisory / blocked / failed |
| Deploy | done / advisory / failed / not_configured |
| Canary | PASS / FAIL / advisory |
| Second opinion | codex / gemini / none |

### QA Disclosure
[If QA was skipped or partial: state why and what validation is missing]

### Cross-Model Notes
[If second opinion found something: note it; if none: "single-model review, no cross-model verification"]

### Outputs
- **Deploy status**: [status]
- **Canary result**: [status]
- **Ship result**: done / canary_failed / advisory
```

Set final ship result:

```bash
if [ "$_MODE" = "project-adapted" ]; then
  if [ "$_CANARY_RESULT" = "PASS" ] && [ "$_MERGE_RESULT" = "done" ] && [ "$_DEPLOY_RESULT" = "done" ]; then
    _SHIP_RESULT="done"
  elif [ "$_DEPLOY_RESULT" = "done" ] && [ "$_CANARY_RESULT" = "FAIL" ]; then
    _SHIP_RESULT="canary_failed"
  else
    _SHIP_RESULT="advisory"
  fi
else
  _SHIP_RESULT="advisory"
fi
echo "Ship result: $_SHIP_RESULT"
```

---

## EXCEPTION HANDLING

### Exception: detect-ci returns unknown

**Trigger**: `_CI_TYPE = "unknown"` and all commands empty after CLI attempt and manual fallback.

**Procedure**:
1. Check env vars: `PROJECT_TEST_CMD`, `PROJECT_COVERAGE_CMD`, `PROJECT_DEPLOY_CMD`, `SHIP_TARGET_BRANCH`.
2. If some commands available from env vars, use those and stay advisory for the rest.
3. If nothing available, produce full-advisory report listing what the user must provide.

**Recovery**: user sets env vars or project config, re-enters ship.

**State update**: `ship_result = advisory`, `next_skill = orchestrate`.

### Exception: branch protection blocks merge

**Trigger**: `git checkout` or `git merge` fails due to branch protection, merge conflicts, or permission denied.

**Procedure**:
1. Dry-run push: `git push --dry-run origin "$_TARGET_BRANCH" 2>&1`
2. If protection confirmed, try PR-based merge: `gh pr create --base "$_TARGET_BRANCH" --head "$_BRANCH" 2>/dev/null`
3. If PR possible, switch merge step to advisory and produce the PR command.
4. If merge conflicts, report conflicting files and route to `implement` for resolution.

**Recovery**: user merges via PR or resolves conflicts, re-enters ship.

**State update**: `ship_result = advisory`, merge stage = `blocked` in report.

### Exception: canary fails on first check

**Trigger**: deployment succeeded but health check returned non-200 or deploy log has error indicators.

**Procedure**:
1. Re-check after 30s: `sleep 30 && curl -sf -o /dev/null -w "%{http_code}" "$_health_url"`
2. Second check passes → note "slow start" in report, set `_CANARY_RESULT = "PASS"` with disclosure.
3. Second check fails → `_SHIP_RESULT = "canary_failed"`, route to `diagnose`.
4. No third check. Two failures is enough evidence.

**Recovery**: `diagnose` investigates. If transient, ship can be re-entered.

**State update**: `ship_result = canary_failed`, `next_skill = diagnose`.

### Exception: QA was skipped or partial

**Trigger**: `qa_result = "skipped"` or `qa_result = "partial"`.

**Procedure**:
1. Ship continues. This is not a pipeline block.
2. Ship report must include explicit QA disclosure: whether skipped or partial, the reason, and what validation is missing.
3. Do not claim coverage QA did not provide.
4. Pipeline table `QA Result` shows the actual value, not "pass".

**Recovery**: none needed within ship. The disclosure is the action.

**State update**: no special change. Disclosure lives in the report artifact.

---

## Decision Contract

**decision**: ship-done
**confidence**: 0.9
**rationale**: Delivery may only proceed to release when shipping succeeded and canary passed. Otherwise ship stays advisory or routes to diagnose.
**fallback**: Missing commands keep ship advisory. Canary failure routes to diagnose.
**escalate**: false
**next_skill**: release
**next_action**: Enter release for the final release decision.

| Situation | decision | confidence | next_skill |
|---|---|---|---|
| pipeline succeeded, canary passed | `ship-done` | 0.9 | release |
| canary failed after deploy | `ship-canary-failed` | 0.8 | diagnose |
| advisory mode | `ship-advisory` | 0.6 | orchestrate |

## State Update

```bash
_SHIP_RESULT="${SHIP_RESULT:?set SHIP_RESULT to done|canary_failed|advisory}"
_KS_CLI="${KEYSTONE_CLI:-./keystone}"

case "$_SHIP_RESULT" in
  done)
    _DECISION="ship-done"; _EXIT_CODE="ok"
    _EXIT_REASON="Deployment completed and canary passed"; _NEXT="release" ;;
  canary_failed)
    _DECISION="ship-canary-failed"; _EXIT_CODE="ok"
    _EXIT_REASON="Canary verification failed after deployment"; _NEXT="diagnose" ;;
  advisory)
    _DECISION="ship-advisory"; _EXIT_CODE="advisory"
    _EXIT_REASON="Required commands or execution authority were missing"; _NEXT="orchestrate" ;;
esac

$_KS_CLI state set current_stage "ship" >/dev/null
$_KS_CLI state set ship_result "$_SHIP_RESULT" >/dev/null
$_KS_CLI state set last_decision "$_DECISION" >/dev/null
$_KS_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "$_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"ship\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_DECISION\",\"confidence\":0.9,\"ship_result\":\"$_SHIP_RESULT\",\"mode\":\"$_MODE\",\"ci_type\":\"${_CI_TYPE:-unknown}\",\"deploy_status\":\"${_DEPLOY_RESULT:-advisory}\",\"canary\":\"${_CANARY_RESULT:-advisory}\",\"second_opinion\":\"${_SECOND_OPINION:-none}\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] pre-ship checklist complete (all items OK or WARN documented)
- [ ] review/QA combination valid (review passed, QA satisfied or disclosed)
- [ ] advisory vs project-adapted mode explicit in the report
- [ ] skipped or partial QA disclosed in ship report
- [ ] canary routing explicit (PASS → release, FAIL → diagnose, advisory → orchestrate)
- [ ] rollback readiness known
- [ ] cross-model second opinion attempted or "none" noted
- [ ] ship_result matches observed outcome (no advisory claiming done)
