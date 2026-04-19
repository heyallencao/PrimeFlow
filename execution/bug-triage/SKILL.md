---
name: ks-bug-triage
description: "Fast failure classifier. Decide whether the problem is a spec gap, an implementation bug, or a rollback candidate before routing to writing-plan, diagnose, or ship."
layer: execution
owner: bug-triage
inputs:
  - failure_description
  - context
  - recent_evidence
outputs:
  - triage_report
  - triage_result
entry_modes:
  - plan-ready
  - build-ready
  - incident
---

# Bug Triage

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Quickly classifies a failure before the workflow spends time on the wrong branch. Decides whether the problem is a spec gap, an implementation bug, or a rollback candidate, then routes to the correct skill. Does not do root-cause analysis, formal verification, code repair, or replace `diagnose`, `verify`, or `writing-plan`.

## Compliance Anchors

> **A triage report is not a root-cause report.**
>
> **Do not classify without minimal evidence.** At minimum, know the symptom, the current expectation, and the impact scope.
>
> **`rollback-candidate` outranks deep investigation.** If the impact is high enough, containment comes before explanation.

## Triage Results

| triage_result | Meaning | Route |
|---|---|---|
| `spec-gap` | the current expectation, scope, or done criteria are wrong | `writing-plan` |
| `implementation-bug` | the spec still holds, but the implementation or runtime behavior does not | `diagnose` |
| `rollback-candidate` | impact is severe enough that rollback or containment must be evaluated first | `ship` |

## PROCEDURE

### Step 1: Check Evidence Sufficiency

Minimum required evidence: symptom, impact, current expectation.

If the only input is "it is broken", ask for minimum context:

- **What is the symptom?** (one sentence describing the observed failure)
- **Who is affected and how severely?** (impact scope)
- **What should happen instead?** (current expectation)

Do not classify without minimal evidence. See E1.

### Step 2: Ask the Spec Question

> If the current spec stays unchanged, should this still be repaired exactly as originally defined?

- Yes → more likely `implementation-bug`
- No → more likely `spec-gap`

Fast decision rules:

**Use `spec-gap` when:**
- the requirement changed after the plan was written
- the done criteria were wrong from the start
- continuing to "fix" the old spec would move the work in the wrong direction
- the user or team now wants different behavior than what was approved

**Use `implementation-bug` when:**
- the current spec is still valid
- the behavior, tests, or runtime result missed the approved done criteria
- the failure looks like logic, state, boundary, or contract breakage
- the implementation diverged from the plan without a plan change

### Step 3: Check Containment Priority

If the issue is already a high-impact runtime failure:
- Do NOT start with root-cause discussion
- Classify as `rollback-candidate`
- Containment comes before explanation

**Use `rollback-candidate` when:**
- a production or high-impact environment is regressing
- a user path is clearly unavailable
- there is data, security, or reliability risk
- containment is more urgent than explanation

### Step 4: Route

| triage_result | Route | Why |
|---|---|---|
| `spec-gap` | `writing-plan` | the scope or done criteria need revision |
| `implementation-bug` | `diagnose` | root cause must be found before repair |
| `rollback-candidate` | `ship` | containment/rollback evaluation comes first |

### Fast Decision Tree with Symptom Examples

```text
Symptom: "tests fail but the feature should work differently now"
  → spec-gap → writing-plan

Symptom: "returns wrong value for edge case, spec unchanged"
  → implementation-bug → diagnose

Symptom: "production endpoint returning 500s, users affected"
  → rollback-candidate → ship

Symptom: "new behavior contradicts approved done criteria"
  → implementation-bug → diagnose

Symptom: "done criteria are now clearly wrong for the real need"
  → spec-gap → writing-plan

Symptom: "data corruption visible in production"
  → rollback-candidate → ship

Symptom: "requirement changed but tests still test the old behavior"
  → spec-gap → writing-plan

Symptom: "API returns 404 for a route that should exist per spec"
  → implementation-bug → diagnose
```

### Step 5: Write Triage Report

```markdown
## Triage Report

**Symptom**: [one sentence]
**Current expectation**: [what should happen]
**Impact scope**: [who is affected and how severe]
**Current evidence**: [logs, tests, or observations]
**triage_result**: [spec-gap / implementation-bug / rollback-candidate]
**Recommended next skill**: [writing-plan / diagnose / ship]
**Why**: [why this route fits the classification]
**Missing information**: [if anything is still missing]
```

## EXCEPTION HANDLING

### E1: Insufficient Evidence for Classification

When the symptom is reported but evidence is too thin to classify with confidence:
- Do NOT guess the triage result
- List exactly what evidence is missing
- If the user cannot provide it, default-route to `diagnose` with `confidence = 0.5`
- Mark the triage report: "Classification uncertain; diagnose should collect more evidence before deep investigation"
- The default to `diagnose` is safe because diagnose will either find the root cause (confirming implementation-bug) or determine the spec is wrong (routing to writing-plan)

### E2: Mixed Signals (Spec-Gap and Implementation-Bug Both Plausible)

When evidence supports both `spec-gap` and `implementation-bug`:
- Default to `implementation-bug` (the cheaper path to verify first)
- Add note in triage report: "Mixed signals; if diagnose confirms the spec is wrong, reroute to writing-plan"
- Set `confidence = 0.7`
- If diagnose later confirms the spec is fundamentally wrong, rerun bug-triage or route directly to `writing-plan`
- This avoids the more expensive mistake of rewriting a plan that was actually fine

## Decision Contract

**decision**: triage-complete
**confidence**: 0.85
**rationale**: The failure was classified from the current evidence and the next workflow branch is explicit.
**fallback**: If later evidence overturns the classification, rerun bug-triage or move directly into the more appropriate skill.
**escalate**: false
**next_skill**: writing-plan / diagnose / ship
**next_action**: Follow the triage result into the next workflow step.

## State Update

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
$_KS_CLI state set last_decision "triage-complete" >/dev/null 2>&1 || true
$_KS_CLI state set artifacts.last_triage_result "${TRIAGE_RESULT:-implementation-bug}" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .keystone/telemetry/events
echo "{\"skill\":\"bug-triage\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"triage-complete\",\"triage_result\":\"${TRIAGE_RESULT:-implementation-bug}\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] triage did not turn into diagnose (no root-cause analysis performed)
- [ ] the next skill is explicit and matches the triage result
- [ ] rollback-candidate is prioritized correctly for high-impact issues
- [ ] evidence gaps are stated honestly in the report
- [ ] the spec question was asked before classification
