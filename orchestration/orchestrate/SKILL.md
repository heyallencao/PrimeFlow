---
name: ks-orchestrate
description: "Global routing hub. Determine the correct entry mode, choose the next skill, and manage workflow state. Route session-transfer requests to handoff."
layer: orchestration
owner: orchestrate
inputs:
  - task_description
  - context
  - constraints
outputs:
  - routing_decision
  - state_snapshot
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
  - build-ready
  - release-ready
  - incident
request_kinds:
  - handoff
---

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

# Orchestrate

Keystone's router. Three jobs: detect entry mode, pick the next skill, update state.

**Responsible for**: entry_mode decision, next_skill selection, state mutation, handoff routing.
**Not responsible for**: deep analysis, implementation, quality judgment, forcing everything through roundtable.

Handoff is a separate skill: `orchestration/handoff/SKILL.md`. Orchestrate only recognizes handoff requests and routes to that skill.

---

## Procedure

### Step 1: Detect environment

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_PENDING=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Branch: $_BRANCH | Pending changes: $_PENDING"
```

- expected: branch name and change count
- if git not found: set branch to "unknown", continue anyway

### Step 2: Initialize state if missing

```bash
if [ ! -f ".keystone/state.json" ]; then
  echo "No state file. Initializing."
  $_KS_CLI state init >/dev/null
fi
```

- expected: `.keystone/state.json` now exists
- failure: CLI not found → tell user to check installation, stop

### Step 3: Read current state

```bash
_CURRENT_STAGE=$($_KS_CLI state get current_stage 2>/dev/null | tr -d '"')
_CURRENT_BLOCK=$($_KS_CLI state get current_block 2>/dev/null | tr -d '"')
_LAST_SKILL=$($_KS_CLI state get last_skill 2>/dev/null | tr -d '"')
_ENTRY_MODE=$($_KS_CLI state get entry_mode 2>/dev/null | tr -d '"')
_RISK_LEVEL=$($_KS_CLI state get risk_level 2>/dev/null | tr -d '"')
_PLAN_DOC=$($_KS_CLI state get artifacts.plan_document 2>/dev/null | tr -d '"')
_ROUTING_COUNT=$($_KS_CLI state get routing_count 2>/dev/null | tr -d '"')
[ -z "$_ROUTING_COUNT" ] && _ROUTING_COUNT=0

echo "Stage: $_CURRENT_STAGE | Block: $_CURRENT_BLOCK | Last: $_LAST_SKILL"
echo "Entry: $_ENTRY_MODE | Risk: $_RISK_LEVEL | Plan: $_PLAN_DOC"
echo "Routing count: $_ROUTING_COUNT"
```

- expected: all state fields printed
- if fields return "null": treat as missing (see Step 4)

### Step 4: Check for routing loop

```bash
_NEW_COUNT=$((_ROUTING_COUNT + 1))
if [ "$_NEW_COUNT" -gt 5 ]; then
  echo "LOOP DETECTED: routed $_NEW_COUNT times without progressing."
  _ESCALATE=true
  _ROUTING="escalate"
  _REASONING="Routing loop: workflow routed more than 5 times without stage change."
  _CONFIDENCE=0.3
  # jump to Step 9 (state update)
fi
```

- if loop detected: set escalate=true, skip to Step 9
- if not: continue to Step 5

### Step 5: Detect handoff request

```bash
_REQUEST_TEXT="$(printf '%s' "${TASK_DESCRIPTION:-${task_description:-}}" | tr '[:upper:]' '[:lower:]')"
_IS_HANDOFF=false

case "$_REQUEST_TEXT" in
  *"handoff out"*|*"handoff in "*|*"handoff list"*|*"switch session"*|*"resume latest"*|*"pause this"*|*"save the current context"*)
    _IS_HANDOFF=true
    ;;
esac
```

- if handoff: set routing=handoff, confidence=0.95, skip to Step 9
- if not: continue to Step 6

### Step 6: Determine entry mode

Entry mode comes before stage routing. Match the task description and current state to one entry mode.

| if task is | entry_mode | default next |
|---|---|---|
| Completely new, no direction exists | `from-scratch` | `roundtable` |
| Direction exists (offline, prior discussion, existing brief) | `aligned-offline` | `writing-plan` |
| Plan document exists, execution should start | `plan-ready` | `test-first` (high/medium risk) or `implement` (low risk) |
| Code exists but no fresh evidence | `build-ready` | `verify` |
| Close to release, need final evidence/QA | `release-ready` | depends on existing evidence (see Step 7) |
| Production issue, system broken | `incident` | `diagnose` |

```bash
# If entry_mode is already set in state and matches the task, keep it.
# If not, determine from the task description and override.
if [ -z "$_ENTRY_MODE" ] || [ "$_ENTRY_MODE" = "null" ] || [ "$_ENTRY_MODE" = "init" ]; then
  # infer from task description
  case "$_REQUEST_TEXT" in
    *"broken"*|*"failing"*|*"production"*|*"incident"*|*"down"*|*"outage"*)
      _ENTRY_MODE="incident" ;;
    *"already decided"*|*"direction is"*|*"aligned"*|*"approved"*|*"agreed"*)
      _ENTRY_MODE="aligned-offline" ;;
    *"plan is"*|*"plan ready"*|*"block defined"*|*"scope clear"*)
      _ENTRY_MODE="plan-ready" ;;
    *"code written"*|*"already implemented"*|*"build ready"*|*"need evidence"*)
      _ENTRY_MODE="build-ready" ;;
    *"release"*|*"deploy"*|*"ship"*|*"almost done"*)
      _ENTRY_MODE="release-ready" ;;
    *)
      _ENTRY_MODE="from-scratch" ;;
  esac
  $_KS_CLI state set entry_mode "$_ENTRY_MODE" >/dev/null
  echo "Entry mode inferred: $_ENTRY_MODE"
fi
```

### Step 7: Route based on current stage

This is the core routing logic. Match current_stage + stage-specific results.

#### init stage → route by entry_mode

| entry_mode | risk_level → route |
|---|---|
| `from-scratch` | any → `roundtable` |
| `aligned-offline` | any → `writing-plan` |
| `plan-ready` | low → `implement`; medium/high → `test-first` |
| `build-ready` | any → `verify` |
| `release-ready` | verify+review exist and qa_required=true → `qa`; verify+review exist and qa_required=false → `ship`; otherwise → `verify` |
| `incident` | any → `diagnose` |

#### Non-init stage → route by stage result

| current_stage | result field | value → route |
|---|---|---|
| `roundtable` | (direction converged) | → `writing-plan` |
| `writing-plan` | plan_doc exists | low risk → `implement`; medium/high → `test-first` |
| `writing-plan` | plan_doc missing | → `writing-plan` (not complete yet) |
| `test-first` | (contract ready) | → `implement` |
| `implement` | (block complete) | → `verify` |
| `verify` | `pass` | → `review` |
| `verify` | `fail_bug` | → `diagnose` |
| `verify` | `fail_spec` | → `writing-plan` |
| `verify` | missing/unknown | → escalate |
| `review` | `pass`/`pass_with_risks` + qa_required=true | → `qa` |
| `review` | `pass`/`pass_with_risks` + qa_required=false | → `ship` |
| `review` | `pass`/`pass_with_risks` + qa_required=null | → escalate (qa_required must be explicit) |
| `review` | `blocked` | → `implement` |
| `review` | missing/unknown | → escalate |
| `diagnose` | `found` | → `implement` |
| `diagnose` | `rollback` | → `ship` |
| `diagnose` | `unknown` + loops<3 | → `diagnose` (continue) |
| `diagnose` | `unknown` + loops>=3 | → escalate |
| `qa` | `pass`/`partial` | → `ship` |
| `qa` | `fail` | → `diagnose` |
| `qa` | missing/unknown | → escalate |
| `ship` | `done` | → `release` |
| `ship` | `canary_failed` | → `diagnose` |
| `ship` | missing/unknown | → escalate |
| `release` | `release_escalate`=false | → `knowledge` |
| `release` | `release_escalate`=true | → PAUSED (human confirmation needed) |
| `knowledge` | (archive complete) | → DONE |
| unknown stage | | → `roundtable` (safest fallback) |

### Step 8: Validate the route

Before writing state, confirm:

1. The route is not `review` or `ship` without evidence (verify_result must exist for review, review_result must exist for ship)
2. The route does not skip test-first for medium/high risk without writing-plan approval
3. The route is not the same as current_stage (unless it is diagnose continuing a loop)

```bash
# Validate: no review without verify evidence
if [ "$_ROUTING" = "review" ]; then
  _VR=$($_KS_CLI state get verify_result 2>/dev/null | tr -d '"')
  if [ "$_VR" = "null" ] || [ -z "$_VR" ]; then
    echo "INVALID ROUTE: review without verify evidence. Re-routing to verify."
    _ROUTING="verify"
    _CONFIDENCE=0.7
  fi
fi

# Validate: no ship without review evidence
if [ "$_ROUTING" = "ship" ]; then
  _RR=$($_KS_CLI state get review_result 2>/dev/null | tr -d '"')
  if [ "$_RR" = "null" ] || [ -z "$_RR" ]; then
    echo "INVALID ROUTE: ship without review evidence. Re-routing to review."
    _ROUTING="review"
    _CONFIDENCE=0.7
  fi
fi
```

- if validation fails: override route, log the correction in reasoning
- if validation passes: continue to Step 9

### Step 9: Update state atomically

```bash
_STATE_FILE=".keystone/state.json"

# Simple file lock
_maxwait=5 _waited=0
while [ -f "${_STATE_FILE}.lock" ] && [ "$_waited" -lt "$_maxwait" ]; do
  sleep 1; _waited=$((_waited + 1))
done
touch "${_STATE_FILE}.lock"
trap 'rm -f "${_STATE_FILE}.lock"' EXIT

# Reset routing count if stage actually changed
_STAGE_BEFORE=$($_KS_CLI state get current_stage 2>/dev/null | tr -d '"')
if [ "$_STAGE_BEFORE" != "$_ROUTING" ]; then
  _FINAL_COUNT=0
else
  _FINAL_COUNT=$_NEW_COUNT
fi

$_KS_CLI state set current_stage "$_ROUTING" >/dev/null
$_KS_CLI state set last_skill "orchestrate" >/dev/null
$_KS_CLI state set last_decision "route-$_ROUTING" >/dev/null
$_KS_CLI state set routing_count "$_FINAL_COUNT" >/dev/null

if [ "$_ESCALATE" = "true" ]; then
  $_KS_CLI state set exit_code "paused" >/dev/null
  $_KS_CLI state set exit_reason "$_REASONING" >/dev/null
  $_KS_CLI state set next_skill "" >/dev/null
else
  $_KS_CLI state set exit_code "ok" >/dev/null
  $_KS_CLI state set exit_reason "$_REASONING" >/dev/null
  $_KS_CLI state set next_skill "$_ROUTING" >/dev/null
fi

rm -f "${_STATE_FILE}.lock"
```

- expected: state.json updated with new stage, decision, and routing count
- failure: lock timeout → warn user, proceed without lock

### Step 10: Emit telemetry and output routing

```bash
mkdir -p .keystone/telemetry/events
echo "{\"skill\":\"orchestrate\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"route-$_ROUTING\",\"confidence\":${_CONFIDENCE:-0.9},\"entry_mode\":\"${_ENTRY_MODE:-unknown}\",\"risk_level\":\"${_RISK_LEVEL:-unknown}\",\"escalate\":$([ "${_ESCALATE:-false}" = "true" ] && echo true || echo false)}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

Output format:

```markdown
## Routing Decision

**Entry mode**: [entry_mode]
**Current stage → Next skill**: [current] → [routed]
**Confidence**: [0.0-1.0]
**Reasoning**: [1-2 sentences]
**Escalate**: [true/false]

> Next: `/ks-[skill] [one-sentence task description]`
```

---

## Exception: Routing loop (>5)

- **Trigger**: routing_count > 5 without stage change
- **Procedure**: set escalate=true, routing=escalate, confidence=0.3
- **Recovery**: user must inspect state and manually set current_stage or clear routing_count
- **State update**: exit_code=paused, exit_reason contains loop warning

## Exception: State file corrupted or missing after init

- **Trigger**: `state get` returns invalid JSON or empty
- **Procedure**: re-run `state init`, treat as init stage with from-scratch entry mode
- **Recovery**: re-initialized state, route to roundtable
- **State update**: fresh state.json

## Exception: Handoff request with no handoff packages

- **Trigger**: user says "handoff in latest" but `.keystone/handoff/` is empty
- **Procedure**: route to handoff skill anyway — handoff will report "no packages found" and suggest handoff out instead
- **Recovery**: user creates a handoff package, then restores
- **State update**: routing=handoff

## Exception: Entry mode inference is ambiguous

- **Trigger**: task description matches 2+ entry modes
- **Procedure**: default to the earlier (more conservative) entry mode. from-scratch beats aligned-offline beats plan-ready
- **Recovery**: orchestrate routes to the earlier stage; downstream skill may detect that the task is further along and skip ahead
- **State update**: entry_mode set to the conservative choice

---

## Decision Contract

**decision**: `route-$_ROUTING`
**confidence**: `$_CONFIDENCE`
**rationale**: The route was chosen from the current stage, entry mode, available artifacts, and known evidence instead of from intuition.
**fallback**: If the route proves wrong, return to orchestrate with the new evidence and re-route from the current state.
**escalate**: `$_ESCALATE`
**next_skill**: `$_ROUTING`
**next_action**: Enter the routed skill immediately unless paused for human intervention.

## State Update

See Step 9 above.

## Telemetry

See Step 10 above.

## Quality Checklist

- [ ] route justified by state and evidence (not forced to roundtable)
- [ ] entry mode decided before stage routing
- [ ] loop detection checked (routing_count)
- [ ] route validated (no review without verify, no ship without review)
- [ ] state updated atomically
- [ ] telemetry emitted
- [ ] escalation explicit when confidence too low
