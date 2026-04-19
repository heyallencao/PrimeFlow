---
name: ks-release
description: "Use this after ship completes to decide what can be released, what must be disclosed, and what risks or skipped validation must be stated honestly."
layer: operation
owner: release
inputs:
  - ship_result
  - deployment_status
  - review_report
  - qa_report
outputs:
  - release_decision
  - release_statement
entry_modes:
  - release-ready
---

# Release

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Provides honest closeout after ship. States what can be released, what cannot be claimed, which validation was executed, which was skipped, and how risk must be disclosed. Enter when `ship_result = done` and the deployment is complete enough for the final release decision. Does not reopen engineering work, implement code, or replace review.

## Compliance Anchors

> **"What we did" is not the same as "what we skipped".** The release statement must include both.
>
> **`pass_with_risks` cannot be rewritten as "risk-free release".**
>
> **No rollback plan means release is not complete.**
>
> **If a P0 risk exists, the valid outcomes are paused or rollback, not full or gradual.**

## Release Decisions

| Decision | Condition |
|---|---|
| full release | no unresolved P0/P1 risks, or the remaining risk is already mitigated |
| gradual release | only lower-severity known risks remain and a controlled rollout is appropriate |
| paused release | unresolved P0/P1 risk requires human judgment |
| rollback release | a severe problem requires immediate reversal |

## PROCEDURE

### Prerequisite Check

- [ ] `ship_result = done`
- [ ] ship report exists and is readable
- [ ] review report exists
- [ ] if `qa_required = true`, a QA report exists or the reason for skipping QA is explicit
- [ ] the pre-ship checklist was completed

If any check fails, stop. Do not enter `release` until the prerequisites are met.

If ship is still in progress, that is `ship`. If a new critical problem requires engineering work, that is `diagnose`.

### Step 1: Confirm Ship Result

Read the ship report. Verify the ship outcome.

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_SHIP_RESULT=$($_KS_CLI state get ship_result 2>/dev/null | tr -d '"')
echo "Ship result: $_SHIP_RESULT"
```

If `ship_result` is not `done`, do not proceed. Route to the appropriate skill:

| ship_result | Route |
|---|---|
| `canary_failed` | `diagnose` |
| `advisory` | See E2 |
| anything else | `ship` |

### Step 2: Apply Risk Threshold Matrix

Read review findings and QA results. Count remaining P0 and P1 findings.

| Remaining P0 | Remaining P1 | Release decision |
|---|---|---|
| 0 | 0 | full release |
| 0 | 1 or more | gradual release with disclosure |
| 1 or more | any | paused release with `escalate = true` |

P2/P3 findings do not block release on their own, but they must still be disclosed in the release statement.

Severity for reopening engineering:

| Level | Condition | Action |
|---|---|---|
| P0 | data loss, data corruption, user-data exposure, unauthorized access | immediate rollback + repair + retest |
| P1 | core functionality unavailable or severe performance regression | fix and re-enter ship |
| non-urgent | known lower-severity risk with mitigation or workaround | disclose and schedule follow-up |

### Step 3: Split Executed vs Skipped Validation

This is the core of honest closeout. The release statement has two separate sections.

**Executed validation**: list every validation step that actually ran and produced evidence. Include:
- verify results
- review verdict
- QA results (if qa_required was true)
- test suite results
- coverage numbers

**Skipped or partial validation**: list every validation step that was skipped, only partially covered, or where coverage is uncertain. Include the reason it was acceptable or why release was limited.

Rules:
- do not claim skipped validation as executed validation
- `qa_result = partial` must be disclosed as incomplete coverage
- `pass_with_risks` must remain a risk disclosure, not a clean bill of health
- "not run" is honest; "assumed passing" is not

### Step 4: Write Release Statement

```markdown
## Release Statement

**Version**: [version]
**Release time**: [timestamp]
**Decision**: [full / gradual / paused / rollback]

### Executed Validation
- [validated items with evidence references]

### Skipped or Partial Validation
- [what was skipped or only partially covered]
- [why it was acceptable or why release was limited]

### Disclosed Risks
- [known unresolved risks]
- [impact of each risk]

### Not Included
- [explicitly excluded items]

### Release Notes
[user-facing summary in plain language]

### Rollback Plan
[how to reverse the release; specific commands or steps]
```

### Step 5: Write Rollback Plan

Every release statement must include a rollback plan. The plan must be specific enough that someone could execute it without context.

Minimum rollback plan contents:
- specific commands or steps to reverse the deployment
- estimated time to execute
- data recovery steps if applicable
- who to contact if rollback fails

If no rollback plan exists:
- Do NOT proceed with release
- Route to `ship` to create one
- A release without a rollback plan is incomplete

### Failure Handling Within Procedure

| Failure | Action |
|---|---|
| Ship result not done | Route to appropriate skill; do not release |
| P0 found during release | See E1 |
| Ship result advisory | See E2 |
| No rollback plan | See E3 |
| QA was required but skipped | Disclose in release statement; downgrade to gradual or paused |

## EXCEPTION HANDLING

### E1: P0 Discovered During Release

When a P0 finding appears after ship completed but before release is finalized:
- Immediately classify as `release-paused`
- Set `escalate = true`
- Route to `orchestrate` for human confirmation
- Do NOT attempt a gradual or full release with an active P0
- Record the P0 in the release statement under "Disclosed Risks" even if the release is paused
- If rollback is clearly needed, classify as `release-rollback` instead

### E2: Ship Result Is Advisory, Not Done

When `ship_result = advisory` instead of `done`:
- Do NOT write a release statement claiming the release is complete
- Write an advisory release statement that clearly marks which steps were not executed
- Route to `orchestrate` for human follow-up
- Set `decision = release-advisory` and `confidence = 0.6`
- The advisory statement must list: which ship pipeline steps were not executed, why, and what the user should verify manually

### E3: Rollback Plan Missing

When no rollback plan can be defined or the change is irreversible:
- Do NOT proceed with full or gradual release without a rollback plan
- The valid options are: (a) create the rollback plan and return to release, or (b) pause the release
- If the change is irreversible by nature, state that explicitly in the release statement
- Irreversible changes require higher confidence (0.95) and `escalate = true` before proceeding
- Example irreversible changes: database migrations that drop columns, published API contract changes, deleted data

## Decision Contract

**decision**: release-full
**confidence**: 0.9
**rationale**: Ship is complete, executed and skipped validation are both disclosed honestly, and the remaining risk is within the chosen release boundary.
**fallback**: If the release causes problems, use the rollback plan and return through ship or diagnose as needed.
**escalate**: false
**next_skill**: knowledge
**next_action**: Archive the release outcome in knowledge.

| Situation | decision | escalate | next_skill |
|---|---|---|---|
| full release | `release-full` | false | knowledge |
| gradual release | `release-gradual` | false | knowledge |
| paused release | `release-paused` | true | orchestrate |
| rollback release | `release-rollback` | true | ship |

## State Update

```bash
_RELEASE_DECISION="${RELEASE_DECISION:?set RELEASE_DECISION to release-full|release-gradual|release-paused|release-rollback}"

_jq_escalate=false
_exit_next="knowledge"
_exit_code="ok"
_exit_reason="Release decision [$_RELEASE_DECISION] confirmed"

case "$_RELEASE_DECISION" in
  release-paused)
    _jq_escalate=true
    _exit_code="escalate"
    _exit_next=""
    _exit_reason="Release paused and waiting for human confirmation"
    ;;
  release-rollback)
    _jq_escalate=true
    _exit_code="escalate"
    _exit_next="ship"
    _exit_reason="Rollback required and waiting for human confirmation"
    ;;
esac

_KS_CLI="${KEYSTONE_CLI:-./keystone}"
$_KS_CLI state set current_stage "release" >/dev/null
$_KS_CLI state set last_decision "$_RELEASE_DECISION" >/dev/null
$_KS_CLI state set release_escalate "$_jq_escalate" >/dev/null
$_KS_CLI state set exit_code "$_exit_code" >/dev/null
$_KS_CLI state set exit_reason "$_exit_reason" >/dev/null
$_KS_CLI state set next_skill "$_exit_next" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"release\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_RELEASE_DECISION\",\"confidence\":0.9,\"release_escalate\":$_jq_escalate,\"risks_disclosed\":${RISKS_DISCLOSED:-0}}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] the statement says what can be released
- [ ] the statement says what cannot be claimed
- [ ] risk disclosure is explicit
- [ ] skipped or partial validation is disclosed
- [ ] a rollback plan exists and is specific
- [ ] the wording does not over-promise
- [ ] the risk threshold matrix was applied correctly
