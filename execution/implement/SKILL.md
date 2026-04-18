---
name: pf-implement
description: "Use this when the current block is already clear and the job is to complete it. Default route comes from test-first; only controlled low-risk exceptions may enter directly."
layer: execution
owner: implement
inputs:
  - current_block
  - plan_document
  - test_contract
outputs:
  - implementation_result
entry_modes:
  - plan-ready
  - build-ready
---

# Implement

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Overview

`implement` executes the current block. Default path: turn the failing checks from `test-first` into passing code. Controlled exception path: implement directly against the approved plan scope. Implementation is where discipline erodes fastest. Scope creep, "quick extra fixes", and silent behavior changes happen here. This skill keeps execution inside the block and defines completion as passing the contract, not "the code looks done."

Enter when `test-first` already produced a `test_contract`, or `writing-plan` explicitly approved a low-risk exception with a documented reason. Do not enter when the block boundary is unclear (`writing-plan`) or the root cause is still unknown (`diagnose`).

This skill does not expand scope, make direction decisions, self-authorize skipping `test-first`, replace `verify` or `review`, or disguise diagnosis as implementation.

## What This Skill Does Not Do

- expand scope beyond the approved plan
- make direction decisions (that is `writing-plan` or `roundtable`)
- self-authorize skipping `test-first` (only `writing-plan` can approve that)
- replace `verify` or `review` as quality gates
- disguise diagnosis as implementation (if you do not know the root cause, that is `diagnose`)

## Compliance Anchors

> **If a requirement appears outside the plan, record it and do not implement it automatically.**
>
> **Knowing the likely root cause is not enough if `diagnose` has not actually produced the route into `implement`.**
>
> **Implementation is only complete when the contract passes, not when code was written.**

---

## Procedure

### Step 1: Verify Prerequisites

Before writing any code, confirm these conditions hold.

1. **Read `plan_document`.** Open it. Confirm the scope is stated and the current block matches. If the file is missing or the scope is ambiguous, stop and return to `writing-plan`.

2. **Check for `test_contract`.** One of these must be true:
   - `test_contract` exists on disk and its scenarios cover the done criteria. Proceed on the **default path**.
   - `writing-plan` explicitly approved a low-risk exception and documented why `test-first` may be skipped. Proceed on the **controlled exception path**.
   - Neither is true. Stop. Return to `test-first` or `writing-plan`.

3. **Confirm the current block.** The block being implemented must match the block named in the plan. If it does not, stop and realign.

**Prerequisite checklist:**

- [ ] `plan_document` exists and the scope is clear
- [ ] `test_contract` exists, or `writing-plan` explicitly approved the low-risk exception
- [ ] the current block is the block being implemented

### Step 2: Execute Red-Green-Refactor Loop

For framework-specific command syntax, see [templates/test-commands.md](../../templates/test-commands.md).

**Default path** (test contract exists):

1. **Red.** Run the targeted scenario. Confirm it fails. If it passes already, the contract may be stale. Investigate before proceeding.

   ```
   # Example: pytest -k "scenario_name"
   # See test-commands.md for your framework
   ```

2. **Green.** Write the smallest implementation that satisfies the failing check. One scenario at a time. No gold-plating, no tangential fixes.

3. **Refactor.** Improve structure while the tests stay green. Run the full test suite after refactoring.

   ```
   # Example: pytest
   # See test-commands.md for your framework
   ```

4. **Repeat** for each scenario in the `test_contract`, until every targeted check passes.

**Controlled exception path** (no test contract, approved by `writing-plan`):

1. Implement directly against the approved plan scope.
2. Do not smuggle in behavior, interface, or data changes beyond what the plan describes.
3. After implementation, ensure `verify` can still collect fresh evidence for each done criterion.
4. Run the existing project test suite to confirm nothing is broken.

### Step 3: Scope Discipline

Scope creep is the primary failure mode in `implement`. Use this protocol to detect and handle it.

**Detection rules.** Any of these signals means scope is expanding:

- you are about to edit a file not named in the plan
- you are about to add a function, method, or class not required by any test scenario or done criterion
- you notice "while I'm here" thinking: a fix, refactor, or improvement that is not covered by the current block
- a test failure reveals a problem in code outside the current block's scope

**Handling rules.** When scope expansion is detected:

1. Stop editing immediately.
2. Record the discovery in `.primeflow/out-of-scope.md` with this format:

   ```markdown
   ## Out-of-Scope Discovery: [short title]
   - **Block**: [current block name]
   - **Discovered during**: [what you were doing]
   - **Description**: [what the issue or opportunity is]
   - **Suggested routing**: [which skill should handle this: writing-plan, diagnose, etc.]
   ```

3. Do not implement the out-of-scope work.
4. Resume the current block's implementation.

**Circuit breaker.** Track scope expansions. Each time you record an out-of-scope discovery, increment the counter.

- After **3 scope expansions** in one block, pause and ask the user:

   ```
   [context: 3 out-of-scope items were discovered during implementation of the current block.]

   The current block keeps uncovering work beyond its scope. How should we proceed?

   [recommendation: finish the current block and route discoveries later]

   a) finish this block, then route discoveries
   b) stop now and return to writing-plan to rescope
   c) pause and review discoveries before continuing
   ```

- Reset the counter after the user responds and you resume.
- If the user chooses option b, exit `implement` and route back to `writing-plan`.

### Step 4: Completion Check

Before declaring the block complete, verify all of these conditions:

| # | Condition | Path |
|---|---|---|
| 1 | All `test_contract` checks pass | Default |
| 2 | Code stays inside approved plan scope and `verify` can collect evidence for each done criterion | Exception |
| 3 | No new compile or syntax errors introduced | Both |
| 4 | Existing checks were not broken (full suite passes) | Both |
| 5 | No uncommitted out-of-scope work was silently included | Both |

**Condition 4 detail.** Run the full project test suite. If any previously passing test now fails, the implementation broke something. Fix it within the current block's scope, or record it as out-of-scope and investigate.

**Condition 5 detail.** Review the diff. If any changed file or added function is not justified by the plan or test contract, remove it or record it as out-of-scope.

If any condition fails, do not mark the block complete. Fix the issue or route to the appropriate skill.

### Step 5: Record Out-of-Scope Discoveries

After the block is complete, surface any out-of-scope items that were recorded during Step 3.

1. Review `.primeflow/out-of-scope.md` for entries tagged with the current block.
2. For each entry, suggest a routing:

   | Discovery type | Route to |
   |---|---|
   | New feature or requirement | `writing-plan` |
   | Bug found in unrelated code | `diagnose` |
   | Refactoring opportunity | `writing-plan` (new block) |
   | Dependency or infrastructure issue | `writing-plan` |

3. Include the summary in the implementation result so `verify` and downstream skills can see it.
4. If no out-of-scope items were found, state that explicitly: "No out-of-scope discoveries during this block."

---

## Exception Handling

### Scope Expansion Discovered Mid-Block

When you realize the current implementation requires work beyond the approved scope:

1. Stop. Do not continue the out-of-scope change.
2. Record the discovery in `.primeflow/out-of-scope.md` (Step 3 format).
3. Check the scope expansion counter. If at 3, trigger the circuit breaker (Step 3).
4. Decide: can the current block still complete within its approved scope?
   - **Yes**: finish the block, then surface the discovery.
   - **No**: exit `implement` and route to `writing-plan` for rescoping.
5. Do not silently expand scope and hope nobody notices.

### Prerequisite Skill Output Missing

If `plan_document` or `test_contract` is missing and no approved exception exists:

1. Identify which prerequisite was skipped.
2. Route back:
   - No `plan_document` → `writing-plan`
   - No `test_contract` and no approved exception → `test-first`
3. Do not fabricate a plan or test contract yourself.
4. Do not proceed on the assumption that the missing output "probably exists somewhere."

### Existing Tests Break During Implementation

If running the full test suite reveals that previously passing tests now fail:

1. Identify the failing tests and determine whether they fall inside or outside the current block's scope.
2. **Inside scope**: the implementation introduced a regression. Fix it as part of the current red-green-refactor loop.
3. **Outside scope**: the implementation has an unintended side effect. Record it in `.primeflow/out-of-scope.md`. Attempt a minimal fix within the current scope. If the fix would itself expand scope, stop and route to `diagnose`.
4. Do not suppress failing tests by marking them `skip`, `xfail`, or commenting them out.

---

## Controlled Exception Requirements

If the block is skipping `test-first` under an approved low-risk exception:

- the approval must be traceable to `writing-plan`
- the change must not smuggle in behavior, interface, or data changes
- `verify` must already have a clear evidence path

---

## Decision Contract

**decision**: implement-complete
**confidence**: 0.9
**rationale**: The block was implemented inside its approved scope. On the default path, the red-green-refactor loop completed. On the controlled exception path, the change stayed inside the approved boundary and verify can still collect fresh evidence.
**fallback**: If scope or risk turns out to be wrong during implementation, return to `writing-plan` or `test-first`.
**escalate**: false
**next_skill**: verify
**next_action**: Enter `verify` and collect fresh evidence.

## State Update

```bash
_CURRENT_BLOCK="${CURRENT_BLOCK:?set CURRENT_BLOCK to current block title}"
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
$_PF_CLI state set current_stage "implement" >/dev/null
$_PF_CLI state set current_block "$_CURRENT_BLOCK" >/dev/null
$_PF_CLI state set last_decision "implement-complete" >/dev/null
$_PF_CLI state set exit_code "ok" >/dev/null
$_PF_CLI state set exit_reason "The implementation loop is complete for the current block" >/dev/null
$_PF_CLI state set next_skill "verify" >/dev/null
```

## Telemetry

```bash
_SCOPE_EXPANSIONS="${SCOPE_EXPANSIONS:-0}"
echo "{\"skill\":\"implement\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"implement-complete\",\"confidence\":0.9,\"block_name\":\"$_CURRENT_BLOCK\",\"scope_expansions\":$_SCOPE_EXPANSIONS}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] scope did not expand beyond the approved plan
- [ ] all targeted checks pass, or the controlled exception is traceable and bounded
- [ ] no new compile or syntax errors were introduced
- [ ] existing checks were not broken
- [ ] any newly discovered out-of-scope work was recorded, not silently included
- [ ] scope expansion counter was tracked and the circuit breaker was respected if triggered
