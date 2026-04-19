---
name: ks-writing-plan
description: "Use this when direction is already clear and the next job is to compress it into an executable block with scope, done criteria, and routing."
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

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Turns a direction decision into one executable block with scope, stop lines, entry conditions, and the next workflow step. Enter when direction is clear but the concrete current block, scope boundary, and done criteria still need writing. Does not make direction decisions, write implementation code, or substitute for technical design inside `implement`. If direction is still unclear, go to `roundtable`.

## Compliance Anchors

> **A task list is not a writing-plan output.** If you find yourself writing "1. do A, 2. do B, 3. do C", stop and compress it into one executable block.
>
> **Skipping test-first must be justified in the plan document, not decided ad hoc during implementation.**
>
> **Done criteria must be observable and testable.** "clean code" is not a done criterion. "all new checks have executable verification" is.

## Plan Types

| Type | Use when |
|---|---|
| `full-plan` | new feature, broad scope, needs full expansion from goal to execution |
| `delta-plan` | main approach already decided, only the difference, risks, and dependencies need filling in |
| `execution-card` | small current block with clear scope and done criteria, only needs a sharp local definition |

## PROCEDURE

### Prerequisite Check

- [ ] direction is already clear (from `roundtable` or explicit user direction)
- [ ] no unresolved technical route is hiding in the background

Ask one question before proceeding:

> Is there any technical decision in this direction that still changes scope or routing?

If yes, decide it before continuing. Do not pretend it is not there.

If the task closely matches a previous solution, check `docs/solutions/` first and avoid re-planning something that already failed or already works.

### Step 1: Select Plan Type

| Condition | Recommended type |
|---|---|
| New feature, broad scope, needs full expansion | `full-plan` |
| Main approach decided, only delta matters | `delta-plan` |
| Small block with clear scope and done criteria | `execution-card` |

If unsure, default to `full-plan`. It is the most explicit option and the safest choice when the boundaries are unclear.

### Step 2: Define the Current Block

Core principle: produce **one current block**, not a task list.

If the plan still contains three parallel branches, the direction is not converged enough. Go back to `roundtable`.

`current_block` must:
- describe one active block in one sentence
- be short enough to reuse in handoff and follow-up skills
- be unambiguous (two people reading it should reach the same understanding)

### Step 3: Define Scope

Apply the scope test for each candidate item:

> If I do not do this, can the current block still count as complete?

- Yes → exclude it
- No → include it

Concrete examples of scope test application:

| Candidate item | Test question | Result |
|---|---|---|
| "Add error handling to the new endpoint" | If missing, is the block complete? No, errors would be unhandled. | Include |
| "Refactor the related utility module" | If missing, is the block complete? Yes, utility refactor is separate. | Exclude |
| "Update the API documentation" | If missing, is the block complete? No, docs are part of the contract. | Include |
| "Migrate the entire database schema" | If missing, is the block complete? Yes, migration is a separate block. | Exclude |

### Step 4: Write Done Criteria

Done criteria must be observable and testable. Strengthen weak wording:

| Weak | Better |
|---|---|
| "code quality should be good" | "new logic has executable checks and all targeted checks pass" |
| "performance should improve" | "P95 latency drops from 500ms to 100ms" |
| "security should be better" | "OWASP self-check finds no high-risk issue in the touched path" |
| "tests should pass" | "all checks in test_contract pass with zero failures" |
| "the feature should work" | "the new endpoint returns 200 for valid input and 422 for invalid input" |
| "edge cases handled" | "empty input, max-length input, and null input each produce the documented error response" |

### Step 5: Set Risk Level

| Risk | Default shape |
|---|---|
| `low` | copy edits, config-only changes, internal script fixes with no behavior change |
| `medium` | ordinary feature changes, interface changes, delta implementation on existing approach |
| `high` | user-path changes, behavior changes, data changes, release work, incidents |

Rules:
- if unsure, do not force it into `low`
- if behavior or interface changes, it is usually not `low`
- if planning reveals higher risk than the current state, write the higher value back into state
- `high` risk blocks must pass through `test-first` without exception

### Step 6: Set QA Expectation

- `qa_required = true` when user paths, browser interactions, critical integrations, or high runtime risk are involved
- `qa_required = false` for internal scripts, low-risk non-interactive fixes, or similar changes
- if uncertain, use `true`

### Step 7: Route to TDD or Direct Implement

Default: `next_skill = test-first`.

Direct `implement` is only valid when ALL of these are true:
- `risk_level = low`
- the plan explains why skipping `test-first` is safe
- there is no behavior change, interface change, or data change
- the verification method is already obvious
- the reason for skipping `test-first` is written inside the plan document

Circuit breaker: if the same block is revised 3 times during planning, stop. Escalate to `roundtable` because the direction is not converged enough to plan.

### Step 8: Write Plan Document

```markdown
# Plan: [block name]

## Plan Type
[full-plan / delta-plan / execution-card]

## Direction Source
[roundtable output or explicit user direction]

## Current Block
[one sentence describing the current executable block]

## Scope

### Included
- [files, modules, or behaviors inside this block]

### Excluded (Scope Boundaries)
- [explicit non-goals]

## Done Criteria
[observable, testable completion standards — one per item, no vague wording]

## Entry Conditions
[what must already be true before this block starts]

## Risk Level
- **risk_level**: [low / medium / high]
- **Why**: [1-2 sentences justifying this level]

## TDD Routing
- **Default next skill**: [test-first / implement]
- **If direct implement is allowed, why**: [only for low-risk controlled exceptions; must be explicit]

## QA Expectation
- **qa_required**: [true / false]
- **Why**: [user path, browser interaction, runtime integration, or not]

## Technical Decisions
- [decision 1]: [what was chosen and why]

## Dependencies
- [external conditions or modules this block depends on]

## Next Step
**next_skill**: [default test-first; implement only for controlled low-risk exceptions]
```

Save to `docs/keystone/plans/YYYYMMDD-[slug].md`.

### Failure Handling Within Procedure

| Failure | Action |
|---|---|
| Direction not actually clear | Route back to `roundtable` |
| Scope cannot be bounded | Ask the scope test question; if still unclear, route to `roundtable` |
| Done criteria untestable | See E1 |
| Risk level disagreement | See E2 |
| Plan type unclear | See E3 |
| 3 revisions to same block | Circuit breaker: route to `roundtable` |

## EXCEPTION HANDLING

### E1: Untestable Done Criteria

When a done criterion cannot be made observable:
- Do NOT accept it as-is
- Rewrite it using the strengthening examples in Step 4
- If rewriting still fails, the criterion is a direction question, not a planning question
- Route to `roundtable` to resolve the ambiguity
- Mark `escalate = true` with reason "untestable done criteria"
- Example: "the code should feel clean" → cannot be tested. Route to `roundtable`.

### E2: Risk Level Disagreement

When the user insists on a lower risk level than the evidence supports:
- Record the user's preference in the plan
- Write the risk level the evidence supports into the plan
- Add a note: "User requested [X] but evidence supports [Y]; plan uses [Y]"
- Do NOT lower the risk level to match the user's preference if it would bypass `test-first` incorrectly
- If the user overrides and the plan must use their level, add: "User override applied; plan uses [X] against evidence recommendation"

### E3: Plan Type Unclear

When no plan type cleanly fits:
- Default to `full-plan` (the most explicit option)
- Add a note in the plan: "Plan type is uncertain; full-plan was chosen as the safe default"
- If the block is genuinely small and a second look confirms it, try `execution-card`
- Do NOT use `delta-plan` when the delta boundary is unclear; it requires knowing what the base plan is

## Decision Contract

**decision**: block-defined
**confidence**: 0.9
**rationale**: The scope is compressed into one executable block, the done criteria are observable, and the next routing step matches the risk level.
**fallback**: If implementation exposes a broken boundary, return to writing-plan and redefine the block.
**escalate**: false
**next_skill**: default test-first; implement only for low-risk controlled exceptions
**next_action**: Enter test-first to lock the behavior boundary unless the plan explicitly authorizes the low-risk implement exception.

## State Update

```bash
mkdir -p docs/keystone/plans
_BLOCK_TITLE="${BLOCK_TITLE:?set BLOCK_TITLE to current block title}"
_PLAN_TYPE="${PLAN_TYPE:?set PLAN_TYPE to full-plan|delta-plan|execution-card}"
_RISK_LEVEL="${RISK_LEVEL:?set RISK_LEVEL to low|medium|high}"
_NEXT_SKILL="${NEXT_SKILL:?set NEXT_SKILL to test-first|implement}"
_QA_REQUIRED="${QA_REQUIRED:?set QA_REQUIRED to true|false}"
_PLAN_SLUG=$(printf '%s' "$_BLOCK_TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -d '.,!?')
_PLAN_PATH="docs/keystone/plans/$(date +%Y%m%d)-$_PLAN_SLUG.md"
_KS_CLI="${KEYSTONE_CLI:-./keystone}"

[ -f "$_PLAN_PATH" ] || { echo "plan_document not found: $_PLAN_PATH"; exit 1; }

$_KS_CLI state set current_stage "writing-plan" >/dev/null
$_KS_CLI state set current_block "$_BLOCK_TITLE" >/dev/null
$_KS_CLI state set last_decision "block-defined" >/dev/null
$_KS_CLI state set risk_level "$_RISK_LEVEL" >/dev/null
$_KS_CLI state set qa_required "$_QA_REQUIRED" >/dev/null
$_KS_CLI state set artifacts.plan_document "$_PLAN_PATH" >/dev/null
$_KS_CLI state set artifacts.plan_type "$_PLAN_TYPE" >/dev/null
$_KS_CLI state set artifacts.next_skill_hint "$_NEXT_SKILL" >/dev/null

case "$_NEXT_SKILL" in
  implement)
    if [ "$_RISK_LEVEL" != "low" ]; then
      echo "invalid next_skill=$_NEXT_SKILL for risk_level=$_RISK_LEVEL"
      exit 1
    fi
    _EXIT_CODE="ok"
    _EXIT_NEXT="implement"
    _EXIT_REASON="Controlled low-risk exception: go directly to implementation"
    ;;
  test-first)
    _EXIT_CODE="ok"
    _EXIT_NEXT="test-first"
    _EXIT_REASON="The plan requires behavior locking before implementation"
    ;;
  *)
    echo "invalid next_skill=$_NEXT_SKILL"
    exit 1
    ;;
esac
$_KS_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"writing-plan\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"block-defined\",\"confidence\":0.85,\"risk_level\":\"$_RISK_LEVEL\",\"block_name\":\"$_BLOCK_TITLE\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] the output defines one current block instead of a task list
- [ ] every done criterion is observable and testable
- [ ] the risk level is explicit and justified
- [ ] direct implement, if used, is truly a controlled low-risk exception
- [ ] the next skill matches the plan and risk
- [ ] circuit breaker was applied if the block was revised 3+ times
- [ ] scope test was applied to each candidate item
- [ ] qa_required is explicitly set
