---
name: pf-verify
description: "Use this when tests or runtime checks must be run to confirm a claim with fresh evidence before formal review."
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

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

`verify` runs checks to collect fresh evidence that proves or disproves the current implementation claim. It does not make the final quality judgment: that is `review`. Enter when implementation is complete and the next job is to confirm whether the claim is backed by real evidence. Do not enter when you need a formal quality gate (`review`) or when the root cause of a failure is still unknown (`diagnose`). It does not fix problems, rerun every historical check, or replace review.

## Compliance Anchors

> **Reading code is not verification. Running checks is verification.**
>
> **Cached conclusions are not fresh evidence. "It passed earlier" is not enough.**
>
> **`fail_bug` and `fail_spec` are different routes, not wording variations. Classify them wrong and the next step will also be wrong.**

## Verification Outcomes

| Result | Meaning | Route |
|---|---|---|
| `pass` | implementation matches the approved plan | `review` |
| `fail_spec` | plan or done criteria are wrong or outdated | `writing-plan` |
| `fail_bug` | plan is still correct, but the implementation or runtime behavior is wrong | `diagnose` |

### `fail_bug` vs `fail_spec`

Ask: if the current spec stays unchanged, should the problem still be fixed exactly as originally defined?

- Yes → `fail_bug`
- No → `fail_spec`

Common cases:

- failing tests because the implementation missed approved behavior → `fail_bug`
- plan scope or done criteria are now clearly wrong → `fail_spec`
- wrong field names, missing edge handling, runtime exceptions → usually `fail_bug`
- outdated assumptions, missing prerequisite in the plan, mismatched target behavior → usually `fail_spec`

## PROCEDURE

### Step 0: Read current state

```bash
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
_CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch: $_CURRENT_BRANCH"
_PENDING=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Pending changes: $_PENDING"
if [ -f ".primeflow/state.json" ]; then
  echo "Stage: $($_PF_CLI state get current_stage 2>/dev/null | tr -d '"')"
  echo "Last skill: $($_PF_CLI state get last_skill 2>/dev/null | tr -d '"')"
  echo "Entry mode: $($_PF_CLI state get entry_mode 2>/dev/null | tr -d '"')"
  echo "Risk level: $($_PF_CLI state get risk_level 2>/dev/null | tr -d '"')"
fi
```

Expected: stage is `implement` or later, entry mode is `build-ready`/`release-ready`/`plan-ready`.

### Step 1: Prerequisite check

```bash
echo "=== Prerequisite Check ==="
_IMPLEMENT_RESULT=$($_PF_CLI state get last_decision 2>/dev/null | tr -d '"')
echo "Last decision: $_IMPLEMENT_RESULT"
```

If `last_decision` is not `implement-complete` and not a controlled-exception entry → stop, return to `implement` or `test-first`.

```bash
_TEST_CONTRACT=""
for _tc in "test_contract.md" ".primeflow/test_contract.md"; do
  [ -f "$_tc" ] && { _TEST_CONTRACT="$_tc"; break; }
done
echo "Test contract: ${_TEST_CONTRACT:-not found}"
```

If empty → jump to [Exception: No test contract](#exception-no-test-contract).

```bash
_PLAN_DOC=""
for _p in "plan.md" ".primeflow/plan.md" "writing-plan.md" ".primeflow/writing-plan.md"; do
  [ -f "$_p" ] && { _PLAN_DOC="$_p"; break; }
done
echo "Plan document: ${_PLAN_DOC:-not found}"
```

If both `_PLAN_DOC` and `_TEST_CONTRACT` are empty → stop, go back to `writing-plan`.

### Step 2: Detect test framework

For framework-specific commands, see [templates/test-commands.md](../../templates/test-commands.md).

```bash
echo "=== Framework Detection ==="
_TEST_CMD="${PROJECT_TEST_CMD:-}"
_COVERAGE_CMD="${PROJECT_COVERAGE_CMD:-}"

# If env vars are set, use them directly
if [ -z "$_TEST_CMD" ]; then
  # Auto-detect from project files
  if [ -f "pytest.ini" ] || [ -f "pyproject.toml" ] || [ -f "setup.cfg" ]; then
    _TEST_CMD="pytest"; _COVERAGE_CMD="pytest --cov --cov-report=term-missing"
  elif [ -f "package.json" ]; then
    _TEST_CMD="npm test"; _COVERAGE_CMD="npx jest --coverage 2>/dev/null || npm test"
  elif [ -f "go.mod" ]; then
    _TEST_CMD="go test ./..."; _COVERAGE_CMD="go test -cover ./..."
  elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
    _TEST_CMD="./gradlew test"; _COVERAGE_CMD="./gradlew jacocoTestReport"
  elif [ -f "pom.xml" ]; then
    _TEST_CMD="mvn test"; _COVERAGE_CMD=""
  elif [ -f "Cargo.toml" ]; then
    _TEST_CMD="cargo test"; _COVERAGE_CMD=""
  fi
fi
echo "Test command: ${_TEST_CMD:-none detected}"
echo "Coverage command: ${_COVERAGE_CMD:-unset}"
```

If `_TEST_CMD` is still empty after detection:
→ Jump to [Exception: No test framework detected](#exception-no-test-framework-detected).

### Step 3: Run the test suite

```bash
echo "=== Running Tests ==="
eval "$_TEST_CMD" 2>&1 | tee /tmp/verify-tests.log
_TEST_EXIT=${PIPESTATUS[0]:-$?}
echo "Test exit code: $_TEST_EXIT"
```

Expected: exit code 0, all tests passing.

If `_TEST_EXIT` ≠ 0 → parse failures:

```bash
_TEST_FAIL_COUNT=$(grep -cE 'FAIL|FAILED|Error|Exception' /tmp/verify-tests.log 2>/dev/null || echo "0")
_TEST_PASS_COUNT=$(grep -cE 'PASS|passed|ok' /tmp/verify-tests.log 2>/dev/null || echo "0")
echo "Passed: $_TEST_PASS_COUNT, Failed: $_TEST_FAIL_COUNT"
```

Do not stop on failure yet. Continue to Step 6 for classification.

### Step 4: Run coverage (if available)

```bash
echo "=== Coverage ==="
if [ -n "$_COVERAGE_CMD" ]; then
  eval "$_COVERAGE_CMD" 2>&1 | tee /tmp/verify-coverage.log
  echo "Coverage exit code: ${PIPESTATUS[0]:-$?}"
else
  echo "No coverage command; skipping."
fi
```

Coverage is informational. It does not determine `pass`/`fail` alone but feeds the verification report.

### Step 5: Map done criteria to evidence

For each done criterion from the plan:

1. Identify which test or behavior check covers it.
2. Record the actual result from Step 3 or a targeted manual check.
3. If no corresponding test exists → **evidence gap**. Record as `NO_COVERAGE`.

If any evidence gaps exist → jump to [Exception: All tests pass but done criteria have no coverage](#exception-all-tests-pass-but-done-criteria-have-no-coverage).

### Step 6: Classify failures

If tests failed in Step 3, ask: is the current spec still correct, or is the spec itself wrong?

- Failing test matches approved behavior the implementation did not deliver → `fail_bug`
- Failing test reveals outdated, incomplete, or contradictory done criteria → `fail_spec`
- Unsure → default to `fail_bug` (diagnose can reclassify if needed)

### Step 7: Build the verification report

```markdown
## Verification Report

**Current block**: [block name]
**Verification time**: [timestamp]

### Test Run
- total: N
- passed: N
- failed: N

### Coverage
[summary or "not available"]

### Behavior Checks

| Done Criterion | Expected | Actual | Result |
|---|---|---|---|
| [criterion 1] | [expected] | [actual] | PASS/FAIL/NO_COVERAGE |

### Claims
- [specific claim backed by evidence]

### Conclusion
**verify_result**: [pass|fail_bug|fail_spec]
```

Controlled-exception path (no test_contract):

```markdown
### Done Criteria Evidence
- [criterion 1]: [evidence]
- [criterion 2]: [evidence]
```

### Step 8: Set result and route

```bash
if [ "$_TEST_EXIT" = "0" ] && [ -z "${_EVIDENCE_GAP:-}" ]; then
  _VERIFY_RESULT="pass"
elif [ "$_TEST_EXIT" != "0" ]; then
  :  # already classified in Step 6
elif [ -n "${_EVIDENCE_GAP:-}" ]; then
  _VERIFY_RESULT="fail_spec"
  echo "WARNING: All tests pass but done criteria have evidence gaps."
fi
echo "verify_result: $_VERIFY_RESULT"
```

→ See [State Update](#state-update) to persist.

## EXCEPTION HANDLING

### Exception: No test framework detected

Step 2 found no framework and `PROJECT_TEST_CMD` is not set.

Decision:

- Controlled-exception block approved by `writing-plan` → skip automated tests, proceed to Step 5 with manual evidence.
- Otherwise → stop. Route to `test-first` or `writing-plan`. No runnable checks means no verification.

### Exception: No test contract

Step 1 found no `test_contract` file. Check whether `writing-plan` explicitly approved skipping:

```bash
_EXCEPTION_APPROVED=""
[ -f ".primeflow/state.json" ] && _EXCEPTION_APPROVED=$($_PF_CLI state get controlled_exception 2>/dev/null | tr -d '"')
```

Decision:

- `_EXCEPTION_APPROVED` = `true` → proceed with done criteria as the verification target. Use the done-criteria-only report format.
- Otherwise → stop. Go back to `test-first` or `writing-plan`. No test contract without explicit approval.

### Exception: All tests pass but done criteria have no coverage

Step 5 found done criteria with no corresponding test.

Decision:

- Gaps are minor (peripheral criteria, config tweaks) and manual evidence collected → `pass`, disclose gaps in the report.
- Gaps are material (core behavior untested) → `fail_spec`. Route to `writing-plan`.
- Unsure → default to `fail_spec`. Safer to realign than ship unverified claims.

### Exception: verify runs on a controlled-exception block (no test_contract)

This is the approved path where `writing-plan` allowed skipping `test-first`. Not an error state, but stricter evidence requirements apply:

1. Every done criterion must have manual or scripted evidence. No `NO_COVERAGE` allowed.
2. Evidence must be fresh (run during this invocation, not cached).
3. Report must use the done-criteria-only format and disclose controlled-exception status.

If any done criterion cannot be evidenced → `fail_spec`. Route to `writing-plan`.

## Decision Contract

**decision**: verify-pass
**confidence**: 0.9
**rationale**: The current claim is backed by fresh evidence. If no test contract exists, the done criteria were still checked one by one.
**fallback**: `fail_bug` routes to diagnose; `fail_spec` routes to writing-plan.
**escalate**: false
**next_skill**: review when `verify_result = pass`
**next_action**: Run the next formal quality gate only after fresh evidence exists.

> `fail_bug` → `decision = verify-fail-bug`, `confidence = 0.85`, `next_skill = diagnose`
> `fail_spec` → `decision = verify-fail-spec`, `confidence = 0.85`, `next_skill = writing-plan`

## State Update

```bash
_VERIFY_RESULT="${VERIFY_RESULT:?set VERIFY_RESULT to pass|fail_bug|fail_spec}"
_VERIFY_DECISION="${VERIFY_DECISION:?set VERIFY_DECISION to verify-pass|verify-fail-bug|verify-fail-spec}"
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
$_PF_CLI state set current_stage "verify" >/dev/null
$_PF_CLI state set verify_result "$_VERIFY_RESULT" >/dev/null
$_PF_CLI state set last_decision "$_VERIFY_DECISION" >/dev/null

case "$_VERIFY_RESULT" in
  pass)
    _EXIT_NEXT="review"
    _EXIT_REASON="The implementation matches the spec with fresh evidence"
    ;;
  fail_bug)
    _EXIT_NEXT="diagnose"
    _EXIT_REASON="A bug was found and the root cause still needs diagnosis"
    ;;
  fail_spec)
    _EXIT_NEXT="writing-plan"
    _EXIT_REASON="The spec drifted and the scope must be realigned"
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

## Quality Checklist

- [ ] real checks were executed, not just code inspection
- [ ] evidence is fresh
- [ ] every done criterion has evidence
- [ ] `verify_result` matches the observed failure mode
- [ ] verify did not impersonate review
