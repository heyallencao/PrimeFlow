---
name: pf-handoff
description: "Cross-session handoff skill. Use it when the user explicitly wants to pause, switch sessions, resume prior work, restore a handoff package, or list recent handoffs."
layer: orchestration
owner: handoff
inputs:
  - current_state
  - session_artifacts
outputs:
  - handoff_package
  - recovery_preview
---

# Handoff

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Freezes current working context into a recoverable package so the next session can continue without re-asking for background. Enter when the user wants to pause, switch sessions, hand work to another AI/human, resume the last session, or list recent handoffs. Does not decide the next skill, replace state management, dump chat logs, or execute the next action immediately after `handoff in` (must preview first).

## Compliance Anchors

> **All 8 slots must contain meaningful content.**
>
> **After `handoff in`, do not execute the next step immediately. Show a preview first and wait for confirmation.**
>
> **Handoff is not a chat archive.** Keep only what helps the next session continue real work.

## Resources

- script: `orchestration/handoff/scripts/handoff_file.sh`
- template: `references/handoff-template.md`

## Dual-Artifact Protocol

Every handoff package contains two files:

- `handoff.md` — human-readable package with 8 required slots
- `snapshot.json` — structured snapshot for PrimeFlow state recovery and routing

Structure:

```text
.primeflow/handoff/<handoff_id>/
├── handoff.md
└── snapshot.json
```

## The Eight Required Slots

1. **current task** — what this session was working on (specific, not vague)
2. **current status** — one of: active, blocked, paused, complete
3. **completed work** — actual deliverables, not process narration
4. **key decisions** — named decisions with rationale, not "discussed options"
5. **key constraints** — specific limits (time, technical, dependency)
6. **key files** — `path:line` format with one-line explanation per file
7. **next step** — action sentence, not vague phrase like "continue"
8. **pending confirmation** — yes/no items that block execution

Rules: all 8 must have values. If something truly has no value, write `none` or `not recorded`.

## Supported Actions

| Action | Trigger phrases |
|---|---|
| `handoff out` | "pause here", "save the current context", "create a handoff" |
| `handoff in <id\|latest>` | "continue the previous round", "restore the latest handoff" |
| `handoff list` | "show recent handoffs", "list handoff records" |

## PROCEDURE

### Handoff Out

#### Step 1: Create the package

```bash
_HANDOFF_DOC=$("./primeflow" handoff create "${_CURRENT_BLOCK:-primeflow-handoff}")
_HANDOFF_DIR=$(dirname "$_HANDOFF_DOC")
_HANDOFF_ID=$(basename "$_HANDOFF_DIR")
```

`create` generates both `handoff.md` and `snapshot.json`, prefilled from `.primeflow/state.json` where possible.

#### Step 2: Strengthen the 8 slots

Inspect each slot. Confirm every field contains real content, not empty or vague filler.

| Slot | Validation question | Fail action |
|---|---|---|
| current task | Is it specific enough that a stranger could pick it up? | Rewrite to be specific |
| current status | Is it one of: active, blocked, paused, complete? | Set the correct status |
| completed work | Does it list actual deliverables? | Replace narration with facts |
| key decisions | Does each decision have a rationale? | Add "because..." |
| key constraints | Are they specific (not "tight timeline")? | Add concrete numbers/dates |
| key files | Is each entry in `path:line` format? | Add line numbers and explanations |
| next step | Is it an action sentence? | Rewrite as "Do X by doing Y" |
| pending confirmation | Are there yes/no items that block execution? | List them or write "none" |

#### Step 3: Compress

- keep facts, decisions, actions, blockers
- remove process narration ("we discussed", "then we considered")
- remove background that does not help the next session continue work
- target: the next session should be able to resume in under 2 minutes of reading

#### Step 4: Output

```text
Handoff saved.

  ID:   {handoff_id}
  File: .primeflow/handoff/{handoff_id}/handoff.md

  Next session -> handoff in {handoff_id}
```

### Handoff In

#### Step 1: Resolve the target

```bash
_HANDOFF_TARGET="${1:-latest}"
if [ "$_HANDOFF_TARGET" = "latest" ]; then
  _HANDOFF_DOC=$("./primeflow" handoff latest)
else
  _HANDOFF_DOC=$("./primeflow" handoff resolve "$_HANDOFF_TARGET")
fi
_HANDOFF_DIR=$(dirname "$_HANDOFF_DOC")
```

If the target cannot be resolved, see E2.

#### Step 2: Read the package

```bash
sed -n '1,40p' "$_HANDOFF_DIR/snapshot.json"
sed -n '1,60p' "$_HANDOFF_DOC"
```

If `snapshot.json` is damaged, see E1. If slots are empty, see E3.

#### Step 3: Show recovery preview

The preview must cover at least:

- current task (what was being worked on)
- current status (active, blocked, paused, complete)
- key files (where the work lives)
- next step (what to do next)
- whether a blocker exists

Sentence template:

`I restored the context. The recorded next step is: {next step}. Do you want to continue?`

#### Step 4: Wait for confirmation

- do NOT execute the next step before confirmation
- if the user declines, stop at the preview
- if `pending confirmation` blocks execution, ask only the single most important question
- after confirmation, route to `orchestrate` for next-skill routing

### Handoff List

```bash
"./primeflow" handoff list
```

### Failure Handling Within Procedure

| Failure | Action |
|---|---|
| snapshot.json damaged | See E1 |
| Target not found | See E2 |
| Empty slots | See E3 |
| User declines continuation | Stop at preview; do not execute |

## EXCEPTION HANDLING

### E1: Damaged snapshot.json

When `snapshot.json` is missing, empty, or contains invalid JSON:
- Do NOT silently skip state recovery
- Attempt to recover from `handoff.md` alone
- State explicitly: "snapshot.json is damaged; partial recovery from handoff.md"
- If `handoff.md` is also damaged, report: "Handoff package is unrecoverable; manual session restart required"
- Set `confidence = 0.5` for partial recovery
- After partial recovery, route to `orchestrate` instead of directly to the next skill

### E2: Target Handoff Not Found

When `handoff in <id>` cannot resolve the target:
- List available handoffs: `"./primeflow" handoff list`
- Report: "Handoff ID [X] not found. Available handoffs: [list]"
- If no handoffs exist at all, report: "No handoff packages found in .primeflow/handoff/"
- Do NOT fabricate a recovery from memory or chat history
- Suggest the user create a new session with a fresh brief instead

### E3: Empty Slots in Handoff Package

When `handoff in` discovers that one or more of the 8 required slots are empty or contain filler:
- Do NOT proceed as if the context is complete
- Mark each empty slot as "missing" in the recovery preview
- Ask the user to fill the most critical missing slot before continuing
- If `next step` is empty, that is a hard blocker: route to `orchestrate` for direction
- If `current task` is empty, the handoff package is not usable; treat as E1

## 8-Slot Validation Checklist

Before finalizing any handoff, run this checklist:

- [ ] 1. current task: specific enough for a stranger to pick up
- [ ] 2. current status: one of: active, blocked, paused, complete
- [ ] 3. completed work: lists actual deliverables, not process narration
- [ ] 4. key decisions: each has a named decision and rationale
- [ ] 5. key constraints: specific (numbers, dates, named dependencies)
- [ ] 6. key files: `path:line` format with one-line explanation
- [ ] 7. next step: action sentence, not "continue"
- [ ] 8. pending confirmation: yes/no items that block execution

If any slot fails validation, fix it before saving the handoff.

## Decision Contract

**decision**: handoff-saved / handoff-previewed
**confidence**: 0.95
**rationale**: The handoff package was saved or recovered and the next session can continue after explicit confirmation.
**fallback**: If the package is damaged or incomplete, recover from the best available information and disclose what is missing.
**escalate**: false
**next_skill**: `orchestrate` after a confirmed `handoff in`
**next_action**: Save context with `handoff out`, or preview recovery with `handoff in`

## State Update

```bash
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
_HANDOFF_ID="${HANDOFF_ID:-}"

if [ -n "$_HANDOFF_ID" ]; then
  $_PF_CLI state set last_decision "handoff-saved" >/dev/null 2>&1 || true
  $_PF_CLI state set artifacts.last_handoff_id "$_HANDOFF_ID" >/dev/null 2>&1 || true
else
  $_PF_CLI state set last_decision "handoff-previewed" >/dev/null 2>&1 || true
fi
```

## Telemetry

```bash
echo "{\"skill\":\"handoff\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"${_HANDOFF_DECISION:-handoff-saved}\",\"handoff_id\":\"${_HANDOFF_ID:-}\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] all 8 slots in `handoff.md` are filled with meaningful content
- [ ] the package is not an empty template
- [ ] `snapshot.json` exists and is valid JSON
- [ ] the output includes the handoff ID
- [ ] `handoff in` shows a recovery preview first
- [ ] no next step is executed before explicit confirmation
- [ ] the package is sufficient for the next session to continue work
