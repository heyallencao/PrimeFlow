# Handoff Package

Keystone handoff is not a summary report. It is a transfer package that lets the next session continue work immediately.

## Directory Structure

```text
.keystone/handoff/<handoff_id>/
├── handoff.md
└── snapshot.json
```

`handoff.md` is the human-readable handoff document for the next session.  
`snapshot.json` is the structured snapshot that `orchestrate` uses for state recovery and routing decisions.

## Eight Required Slots

```md
# Handoff: {topic}

- Time: {YYYY-MM-DD HH:MM}
- Handoff ID: {handoff_id}
- Session ID: {session_id}

## Current Task
- {one sentence describing what is being worked on now}

## Current Status
- {current stage / blocker / progress point}

## Completed Work
- {completed item 1}
- {completed item 2}

## Key Decisions
- {decision already made}

## Key Constraints
- {limit that must not be broken}

## Key Files
- `path:line`: {why the next session should read it first}

## Next Step
- {action the next session should execute immediately}

## Pending Confirmation
- none / {single blocking item}
```

## Writing Rules

- all 8 slots must be present
- if something truly has no value, write `not recorded` or `none`
- keep only the 1-5 most important entries in `Key Files`
- `Next Step` must be an action sentence, not a vague phrase like "continue"
- keep the whole package under 100 lines
- keep facts, decisions, actions, and blockers; remove process narration

## Minimum `snapshot.json` Fields

```json
{
  "timestamp": "2026-04-04T12:00:00Z",
  "handoff_id": "20260404-1200-1a2b3c4d",
  "current_stage": "verify",
  "current_block": "billing webhook retry",
  "last_skill": "implement",
  "session_id": "1234567890",
  "next_routing": "verify",
  "recovery_point": "verify"
}
```
