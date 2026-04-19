---
name: ks-diagnose
description: "Use this when the system is broken, tests are failing, or behavior is abnormal and the root cause is still unknown. No investigation, no fix."
layer: execution
owner: diagnose
inputs:
  - failure_description
  - verify_report
outputs:
  - root_cause_report
  - diagnose_result
---

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

# Diagnose

## What / Why / When / Responsibility

Locates the root cause before repair begins. The most dangerous reaction to a failure is "I think I know it, let me patch it" — that hides the real problem or creates a second one. Enter when `verify` found a bug but the root cause is unknown. Do not enter for spec drift (return to `writing-plan`) or when the root cause is already known (go to `implement`). If the failure looks recurring, check `docs/solutions/` first. This skill does not ship a patch, make the final quality judgment, or rewrite tests as a substitute for diagnosis.

## Core Rule

**No investigation, no fix.**

The workflow gets at most 3 loops of hypothesis and validation. If the root cause is still unknown after 3 loops, escalate.

## Compliance Anchors

> **"I think it is X, I will fix it" is not diagnosis.**
>
> **When entering the second loop, explicitly state that the investigation is now on loop 2/3.**
>
> **After the third loop with no root cause, escalate. Do not try a fourth loop.**
>
> **A disproved hypothesis is still valuable evidence.**

---

## Phase 1: Collect Failure Evidence

**Entry condition**: `verify_report` or `failure_description` is present. The failure is reproducible or at least observable in logs/output.

**Purpose**: Gather raw evidence before forming any opinion.

### Steps

1. Run the failing test or check and capture the output.

```bash
# Run the failing test suite and capture output
[PROJECT_FAILING_TEST_CMD] 2>&1 | tee /tmp/ks-diagnose-test-error.log

# Example framework commands — see templates/test-commands.md for full reference
# Python:  pytest -k "scenario_name" -v 2>&1 | tee /tmp/ks-diagnose-test-error.log
# Node:    npx jest --testNamePattern="scenario" 2>&1 | tee /tmp/ks-diagnose-test-error.log
# Go:      go test -v -run TestName ./... 2>&1 | tee /tmp/ks-diagnose-test-error.log
# Shell:   bats tests/case.bats 2>&1 | tee /tmp/ks-diagnose-test-error.log
```

2. Check recent changes to the affected area.

```bash
# Recent commits touching affected files
git log --oneline -10 -- [affected_file_or_dir]

# Full diff of the most recent change
git diff HEAD~1 -- [affected_file_or_dir]

# Check for uncommitted changes
git diff --stat
git diff --stat --cached
```

3. Inspect runtime logs and error traces.

```bash
# Application logs (adjust path per project)
tail -100 [PROJECT_LOG_PATH]

# Stack traces or error dumps
ls -lt /tmp/ks-diagnose-*.log 2>/dev/null
```

4. Identify the minimal reproducer. Strip away unrelated factors until the failure reproduces with the smallest possible input or condition set.

5. Check `docs/solutions/` for known failure patterns that match the observed symptoms.

```bash
ls docs/solutions/ 2>/dev/null
# Read any file whose name matches the failure category
```

**Exit condition**: Raw evidence is collected — failing output, relevant git history, log traces, and a minimal reproducer (or a note explaining why one is not yet available). Ready to form a hypothesis.

---

## Phase 2: Form Hypothesis

**Entry condition**: Phase 1 evidence is collected and reviewed.

**Purpose**: Build the most likely root-cause hypothesis from the evidence. Only one hypothesis per loop.

### Decision Tree

Walk this tree in order. Stop at the first branch that matches the evidence.

```text
1. Recent change introduced the bug?
   Evidence: failure appeared after a specific commit; git log shows a change in the affected path.
   → Hypothesis: "Commit X changed Y, which broke Z."

2. Edge condition or invalid value?
   Evidence: failure only occurs for specific inputs, boundary values, or empty/null cases.
   → Hypothesis: "Variable X reaches value Y under condition Z, which is not handled."

3. Async ordering problem?
   Evidence: failure is timing-dependent; passes sometimes, fails sometimes; involves callbacks, promises, or event handlers.
   → Hypothesis: "Operation A completes before/after operation B due to missing await or wrong callback order."

4. Race condition?
   Evidence: failure is non-deterministic; involves shared mutable state, concurrent access, or multi-threaded code.
   → Hypothesis: "Shared state X is modified concurrently by Y and Z without synchronization."

5. Serialization or deserialization mismatch?
   Evidence: data shape differs between producer and consumer; type errors after parse/stringify; version mismatch in API contracts.
   → Hypothesis: "Serialization of X drops/transforms field Y, causing consumer Z to fail."

6. Environmental or configuration drift?
   Evidence: failure appears in one environment but not another; env vars, config files, or dependency versions differ.
   → Hypothesis: "Environment X is missing config Y or has wrong version of dependency Z."

7. None of the above clearly fit?
   → Hypothesis: "Unknown direction. Re-examine Phase 1 evidence for overlooked signals."
```

### Hypothesis Format

Record the hypothesis before moving to validation:

```markdown
- **Hypothesis**: [one-sentence root cause claim]
- **Evidence supporting it**: [specific observation from Phase 1]
- **Evidence against it**: [specific observation, if any]
- **Validation plan**: [what you will check to prove or disprove it]
```

**Exit condition**: A single, specific hypothesis is recorded with its validation plan. Ready to test it.

---

## Phase 3: Validate Hypothesis

**Entry condition**: A specific hypothesis and validation plan exist from Phase 2.

**Purpose**: Prove or disprove the hypothesis with a targeted check. Not a broad test run — a surgical strike.

### Steps

1. Design the smallest possible check that would confirm or deny the hypothesis.

```bash
# Framework-specific test commands — see templates/test-commands.md for full reference
# Python:  pytest -k "scenario_name" -v
# Node:    npx jest --testNamePattern="scenario"
# Java:    ./gradlew test --tests "ClassName.methodName"
# Go:      go test -v -run TestName ./pkg/...
# Rust:    cargo test test_name -- --nocapture
# Shell:   bats tests/case.bats
```

2. If no existing test covers the hypothesis, write a minimal reproduction script.

```bash
# Create a focused reproduction script
cat > /tmp/ks-diagnose-repro.sh << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
# [minimal steps to reproduce the specific failure condition]
EOF
chmod +x /tmp/ks-diagnose-repro.sh
/tmp/ks-diagnose-repro.sh
```

3. Run the check and record the result.

```markdown
- **Hypothesis**: [from Phase 2]
- **Check executed**: [exact command or script]
- **Result**: confirmed / disproved
- **Evidence**: [output, exit code, or observation]
```

4. If the hypothesis is confirmed, proceed to Phase 4.
5. If the hypothesis is disproved, record the negative result. This is still valuable evidence — it rules out a direction. Increment the loop counter and return to Phase 2 with a new hypothesis.

**Exit condition**: Hypothesis is confirmed (root cause found → Phase 4) or disproved (loop continues → Phase 2 if under 3 loops, escalation if at loop 3).

---

## Phase 4: Conclude

**Entry condition**: Phase 3 confirmed the hypothesis, OR 3 loops completed without confirmation.

**Purpose**: Decide the next action based on the investigation outcome.

### Outcome Matrix

| Outcome | Action | Next Skill |
|---|---|---|
| Root cause found | Apply the repair strategy | `implement` |
| Rollback is required | The recent change that caused the failure should be reverted | `ship` |
| Root cause unknown after 3 loops | Escalate to human judgment | (none — escalate) |

### Root Cause Found

When the hypothesis is confirmed:

1. Record the root cause in the report format below.
2. Define the repair strategy — the smallest change that fixes the root cause.
3. Confirm a rollback option exists in case the repair introduces new problems.
4. Set `diagnose_result = found` and route to `implement`.

### Rollback Required

When the evidence shows that a specific recent change is the cause and reverting it is safer than patching:

1. Identify the exact commit or change to revert.
2. Record the rollback plan.
3. Set `diagnose_result = rollback` and route to `ship`.

### Unknown After 3 Loops

1. Do not attempt a fourth loop.
2. Set `diagnose_result = unknown`, `escalate = true`, `confidence = 0.3`.
3. Include all three disproved hypotheses in the report. A future investigator benefits from knowing which directions were ruled out.

**Exit condition**: A conclusion is recorded in the root cause report. The state is updated with the diagnosis result and the next skill is determined.

---

## Loop Counter

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_LOOPS=$($_KS_CLI state get diagnose_loops 2>/dev/null | tr -d '"')
if [ "$_LOOPS" = "null" ] || [ -z "$_LOOPS" ]; then
  _LOOPS=0
fi
_NEW_LOOPS=$((_LOOPS + 1))
$_KS_CLI state set diagnose_loops "$_NEW_LOOPS" >/dev/null
echo "Diagnose loop: $_LOOPS -> $_NEW_LOOPS/3"
```

At the start of each Phase 2, explicitly announce the loop number:

> "Investigation loop N/3 — forming hypothesis."

At loop 3, add:

> "This is the final loop. If this hypothesis is disproved, the investigation will escalate."

---

## Exception Handling

### Hypothesis Disproved 3 Times

After 3 consecutive disproved hypotheses:

- Do not attempt a fourth loop.
- Set `diagnose_result = unknown`, `escalate = true`, `confidence = 0.3`.
- Escalation path: write the root cause report with all three disproved hypotheses and their evidence. This gives the human a head start — they know which directions are dead ends.
- The next skill is unset. The workflow pauses for human judgment.

### Partial Root Cause

Sometimes the investigation reveals a contributing factor but not the full cause:

- If the partial cause is enough to write a targeted fix (the fix addresses the observed failure and does not mask deeper issues), treat it as `found`. Set `confidence = 0.6` instead of `0.9`.
- If the partial cause is not enough to justify a fix (the failure could still recur for a different reason), treat it as `unknown` and escalate.
- Record the partial finding in the report regardless. Future investigators benefit from partial evidence.

### Rollback vs Fix Decision

When both rollback and fix are viable:

| Factor | Favor Rollback | Favor Fix |
|---|---|---|
| Blast radius of the bad change | Small (one commit, one file) | Large (many files, cross-cutting) |
| Time pressure | Low — fix is preferred | High — rollback is faster |
| Confidence in the fix | High | Low |
| Collateral damage from rollback | None (reverting only the bad change) | Yes (reverting also removes good changes) |

Default: prefer fix when confidence is high and the fix is small. Prefer rollback when the bad change is recent, isolated, and reverting it is low-risk.

### Recurring Failure Pattern

When the failure matches a pattern seen before:

1. Check `docs/solutions/` for a recorded solution.
2. If a solution exists and is verified to apply, reference it in the root cause report and set `diagnose_result = found`.
3. If the solution is outdated or does not apply, treat this as a new investigation. Do not assume old solutions fit new contexts.
4. If the same failure recurs after a fix was applied, the previous fix was incomplete. Re-enter diagnose from the top. The previous root cause report is available as Phase 1 evidence.

---

## Root Cause Report Format

```markdown
## Root Cause Report

**Problem**: [bug description from verify]
**Investigation time**: [timestamp]
**Loop count**: N/3

### Failure Evidence
```
[logs or failing output from Phase 1]
```

### Investigation Record

#### Loop 1/3
- **Hypothesis**: [hypothesis]
- **Validation**: [how it was tested]
- **Result**: confirmed / disproved
- **Evidence**: [specific output or observation]

#### Loop 2/3
- **Hypothesis**: [hypothesis]
- **Validation**: [how it was tested]
- **Result**: confirmed / disproved
- **Evidence**: [specific output or observation]

#### Loop 3/3
- **Hypothesis**: [hypothesis]
- **Validation**: [how it was tested]
- **Result**: confirmed / disproved
- **Evidence**: [specific output or observation]

### Root Cause
[fill this section only when the cause is actually known]

### Repair Strategy
- **Plan**: [repair strategy]
- **Rollback option**: [fallback if repair fails]

### Escalation Notes
[fill this section only when diagnose_result = unknown]
- Disproved directions: [list]
- Remaining uncertainty: [description]
```

---

## Decision Contract

**decision**: root-cause-found
**confidence**: 0.9
**rationale**: The evidence chain is complete, the hypothesis was validated, and the repair strategy is concrete.
**fallback**: If verify fails again after the repair, return to diagnose.
**escalate**: false
**next_skill**: implement
**next_action**: Enter implement and apply the repair.

> If the cause is still unknown after 3 loops: `decision = diagnose-unknown`, `escalate = true`, `confidence = 0.3`
>
> If rollback is required: `decision = rollback-required`, `confidence = 0.85`, `next_skill = ship`
>
> If partial root cause with enough to fix: `decision = root-cause-found`, `confidence = 0.6`, `next_skill = implement`

---

## State Update

```bash
_DIAGNOSE_RESULT="${DIAGNOSE_RESULT:?set DIAGNOSE_RESULT to found|rollback|unknown}"
_DIAGNOSE_DECISION="${DIAGNOSE_DECISION:?set DIAGNOSE_DECISION to root-cause-found|rollback-required|diagnose-unknown}"
_ROOT_CAUSE="${ROOT_CAUSE:-unknown}"
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_LOOPS=$($_KS_CLI state get diagnose_loops 2>/dev/null | tr -d '"')
if [ "$_LOOPS" = "null" ] || [ -z "$_LOOPS" ]; then _LOOPS=0; fi
_NEW_LOOPS=$((_LOOPS + 1))

$_KS_CLI state set current_stage "diagnose" >/dev/null
$_KS_CLI state set diagnose_result "$_DIAGNOSE_RESULT" >/dev/null
$_KS_CLI state set last_decision "$_DIAGNOSE_DECISION" >/dev/null

case "$_DIAGNOSE_RESULT" in
  found)
    _EXIT_CODE="ok"
    _EXIT_NEXT="implement"
    _EXIT_REASON="Root cause found: $_ROOT_CAUSE"
    ;;
  rollback)
    _EXIT_CODE="ok"
    _EXIT_NEXT="ship"
    _EXIT_REASON="Rollback is required"
    ;;
  unknown)
    if [ "$_NEW_LOOPS" -ge 3 ]; then
      _EXIT_CODE="escalate"
      _EXIT_NEXT=""
      _EXIT_REASON="No root cause after 3 loops; human intervention required"
    else
      _EXIT_CODE="deferred"
      _EXIT_NEXT="diagnose"
      _EXIT_REASON="Root cause still unclear; continue investigation"
    fi
    ;;
esac
$_KS_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

---

## Telemetry

```bash
echo "{\"skill\":\"diagnose\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_DIAGNOSE_DECISION\",\"confidence\":0.9,\"diagnose_loops\":$_NEW_LOOPS,\"root_cause\":\"$_ROOT_CAUSE\",\"diagnose_result\":\"$_DIAGNOSE_RESULT\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

---

## Quality Checklist

- [ ] the work contains real investigation, not an immediate patch
- [ ] loop counting is correct and each loop was explicitly announced
- [ ] the root cause is specific (names the file, function, variable, line, or condition)
- [ ] a rollback option exists in the report
- [ ] escalation happens after 3 loops with no answer, not before and not after
- [ ] every disproved hypothesis is recorded with its evidence
- [ ] recurring failures were checked against `docs/solutions/` before starting a new investigation
- [ ] the root cause report contains all required sections
