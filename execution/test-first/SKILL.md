---
name: pf-test-first
description: "Default behavior-locking stage for the current block. Write failing checks first, then implement. Only controlled low-risk exceptions may skip it."
layer: execution
owner: test-first
inputs:
  - plan_document
  - current_block
  - risk_level
outputs:
  - test_contract
  - failed_tests
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
---

# Test-First

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Locks the behavior boundary before implementation by writing failing checks first, then moving into implementation. Enter when a plan exists, the current block is clear, and the next step is to lock behavior with executable failing checks. Does not write implementation code, replace `writing-plan`, or make the final quality decision.

## Compliance Anchors

> **Do not write implementation code before you have seen a failing check.**
>
> **"This looks simple" is not a valid reason to skip test-first.**
>
> **The test contract must exist on disk before state points to it.**

## Controlled Exception

Only these cases may skip `test-first` (and the skip must be approved in `writing-plan`):
- pure copy changes
- config-only changes with no behavior change
- very small internal script fixes
- purely mechanical application of an already-proven constraint

If the block is an exception, that approval must already exist in `writing-plan`. It cannot be invented here.

## PROCEDURE

### Prerequisite Check

- [ ] `plan_document` exists and is readable
- [ ] done criteria are explicit in the plan
- [ ] the project has an executable test mechanism
- [ ] this block was not already approved as a low-risk controlled exception

If the project has no test framework, say so explicitly and define the dependency or manual contract instead of pretending the test phase happened. See E1.

If `writing-plan` already approved a true low-risk controlled exception and explained why `test-first` may be skipped, do not enter this skill.

### Step 1: Read Plan and Extract Done Criteria

Read the plan document. Extract each done criterion.

For each done criterion:
- Identify the test scenario that would prove or disprove it
- If no obvious test scenario exists, flag it as ambiguous

If a done criterion has no test scenario after 2 attempts, return to `writing-plan` with note: "done criterion [X] cannot be tested; needs rewriting".

### Step 2: Write the Test Contract

Create a test contract file on disk before proceeding. The contract is the single source of truth for what "done" means for this block.

```markdown
# Test Contract: [block name]

## Scope
[what this contract covers — must match plan scope]

## Test Scenarios

### Scenario 1: [name]
- **Given**: [precondition]
- **When**: [action]
- **Then**: [expected result]
- **Test function**: `test_scenario_1`

### Scenario 2: [name]
- **Given**: [precondition]
- **When**: [action]
- **Then**: [expected result]
- **Test function**: `test_scenario_2`

## Edge Conditions
[edge cases derived from boundary values, empty inputs, error paths]

## Failure Conditions
[what must fail — negative tests, invalid input, authorization checks]
```

### Step 3: Run the Red Phase

Write checks that must fail. Execute them to confirm they actually fail.

For framework-specific commands, see [templates/test-commands.md](../../templates/test-commands.md).

Quick reference:

| Framework | Run all tests | Run specific scenario | Run with coverage |
|---|---|---|---|
| Python | `pytest` | `pytest -k "scenario_name"` | `pytest --cov` |
| Node/Jest | `npx jest` | `npx jest --testNamePattern="scenario name"` | `npx jest --coverage` |
| Java/Gradle | `./gradlew test` | `./gradlew test --tests "ClassName"` | `./gradlew jacocoTestReport` |
| Go | `go test ./...` | `go test -run TestScenarioName ./...` | `go test -cover ./...` |
| Shell/bats | `bats tests/` | `bats tests/case.bats` | N/A |
| Rust | `cargo test` | `cargo test test_name` | `cargo test -- --nocapture` |

Confirm: each new check fails. A check that passes immediately did not test anything meaningful. See E3.

### Step 4: Iterate Red-Green-Refactor

```text
Red     -> write a check that must fail; run it; confirm failure
Green   -> write the smallest implementation that passes it; run it; confirm pass
Refactor -> improve structure with tests still green; run all; confirm still pass
Repeat  -> move to next scenario
```

Do not write implementation code before you have seen a failing check.

Risk guidance:

| Risk | Requirement |
|---|---|
| `high` | behavior must be locked before implementation; no shortcuts |
| `medium` | default to test-first; full red-green-refactor |
| `low` | still default to test-first unless `writing-plan` approved the exception |

### Step 5: Verify Edge Conditions

After main scenarios pass, run edge-condition checks. Each edge condition should have its own test function.

Common edge condition categories:
- boundary values (empty, max-length, off-by-one)
- error paths (invalid input, missing fields, unauthorized access)
- concurrent or async scenarios
- null/undefined handling

### Step 6: Lock the Contract

Once all scenarios and edge conditions are covered:

1. Confirm the test contract file exists on disk
2. Confirm all red-phase checks now pass (green)
3. Run the full test suite to confirm no regressions
4. Record the test contract path for state update

### Failure Handling Within Procedure

| Failure | Action |
|---|---|
| No test framework detected | See E1 |
| Test scenarios exceed plan scope | See E2 |
| Red phase never fails | See E3 |
| Done criterion cannot be tested | Return to `writing-plan` with note |

## EXCEPTION HANDLING

### E1: No Test Framework Available

When the project has no test framework:
- Do NOT pretend the test phase happened
- State explicitly: "No test framework detected"
- Option A: define the test framework dependency and install it, then continue with the procedure
- Option B: write a manual test contract with shell commands or scripts that can be run (`bats`, shell scripts, or Make targets)
- Option C: if neither is feasible, set `escalate = true` and route to `orchestrate`
- Never silently skip the red-green-refactor loop
- Record the chosen option in the test contract under "Framework Note"

### E2: Test Contract Exceeds Plan Scope

When the test scenarios grow beyond the plan's defined scope:
- Stop adding scenarios immediately
- Remove any scenario that does not map to a done criterion in the plan
- If a done criterion genuinely requires out-of-scope testing, that is a plan problem, not a test problem
- Route to `writing-plan` with note: "done criterion [X] requires scope expansion"
- Do NOT expand the test contract beyond the plan's scope without explicit plan revision

### E3: Red Phase Never Fails

When a written check passes immediately instead of failing:
- The check is not testing meaningful behavior
- Either the behavior already exists (was it already implemented in a prior session?) or the assertion is too weak
- Rewrite the check with a stricter assertion or a different precondition
- If the behavior genuinely already exists, record it as "pre-existing" in the contract and move on
- Do NOT count a pre-existing pass as a red-green cycle
- If 3 attempts at writing a failing check all pass, the done criterion may be already satisfied; verify this against the plan and consider moving on

## Risk Guidance for Test Depth

| Risk level | Minimum test depth |
|---|---|
| `high` | all done criteria + edge conditions + failure conditions; no shortcuts |
| `medium` | all done criteria + at least one edge condition per scenario |
| `low` | all done criteria; edge conditions are recommended but not required if the plan approved the exception |

When `test-first` was entered despite the block being a controlled exception (approved by `writing-plan`):
- The test contract should still be created, but may be minimal
- Document the exception in the contract under "Framework Note"
- Verify must still collect equivalent behavior evidence against the plan's done criteria

## Decision Contract

**decision**: test-contract-ready
**confidence**: 0.9
**rationale**: The current block needs a locked behavior boundary, the key done criteria are covered, and the failing checks are ready to drive implementation.
**fallback**: If the checks cannot be written, the done criteria are probably broken and the block should return to writing-plan.
**escalate**: false
**next_skill**: implement
**next_action**: Enter implement and run the red-green-refactor loop.

## State Update

```bash
_TEST_CONTRACT_PATH="${TEST_CONTRACT_PATH:?set TEST_CONTRACT_PATH to the actual test contract path}"
[ -f "$_TEST_CONTRACT_PATH" ] || { echo "test_contract not found: $_TEST_CONTRACT_PATH"; exit 1; }
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"

$_PF_CLI state set current_stage "test-first" >/dev/null
$_PF_CLI state set last_decision "test-contract-produced" >/dev/null
$_PF_CLI state set artifacts.test_contract "$_TEST_CONTRACT_PATH" >/dev/null
$_PF_CLI state set exit_code "ok" >/dev/null
$_PF_CLI state set exit_reason "test_contract locked the core done criteria" >/dev/null
$_PF_CLI state set next_skill "implement" >/dev/null
```

## Telemetry

```bash
_SCENARIO_COUNT="${SCENARIO_COUNT:-0}"
echo "{\"skill\":\"test-first\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"test-contract-produced\",\"confidence\":0.9,\"scenario_count\":$_SCENARIO_COUNT}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] each done criterion has a corresponding check
- [ ] the red phase is real (checks failed before implementation)
- [ ] edge conditions are covered
- [ ] test names are clear and descriptive
- [ ] the red-green-refactor loop was not skipped
- [ ] the test contract file exists on disk before state points to it
- [ ] no test scenario exceeds the plan's defined scope
