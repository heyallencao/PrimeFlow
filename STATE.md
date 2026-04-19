# Keystone State Management

## State File Location

```text
.keystone/state.json
```

## State Shape

For full stage flow and legal transitions, see [SYSTEM.md](./SYSTEM.md).

```json
{
  "version": "1.0.0",
  "current_stage": "[current stage]",
  "last_skill": "[last executed skill]",
  "entry_mode": "from-scratch|aligned-offline|plan-ready|build-ready|release-ready|incident",
  "current_block": "[current block name]",
  "last_decision": "[latest decision label]",
  "confidence": 0.85,
  "escalate": false,
  "risk_level": "low|medium|high",
  "qa_required": false,
  "artifacts": {
    "plan_document": "docs/keystone/plans/[slug].md",
    "plan_type": "full-plan|delta-plan|execution-card",
    "next_skill_hint": "test-first|implement",
    "test_contract": "docs/keystone/tests/[slug].md",
    "review_report": "docs/keystone/reviews/[slug].md",
    "roundtable_mode": "brainstorm|align|challenge",
    "knowledge_doc": "docs/solutions/[category]/[slug].md"
  },
  "pending_tasks": [],
  "blockers": [],
  "skipped_skills": [],
  "risks": [
    { "risk": "...", "mitigation": "..." }
  ],
  "session_id": "[session id]",
  "exit_code": "ok|deferred|error|escalate",
  "exit_reason": "[one-sentence exit reason]",
  "next_skill": "[next skill]",
  "rollback_target": null,
  "rollback_method": null,
  "created_at": "[ISO timestamp]",
  "verify_result": "pass|fail_bug|fail_spec",
  "review_result": "pass|pass_with_risks|blocked",
  "diagnose_result": "found|rollback|unknown",
  "diagnose_loops": 0,
  "qa_result": "pass|partial|fail",
  "ship_result": "done|canary_failed|failed",
  "release_escalate": false,
  "routing_count": 0,
  "previous_stage": "[previous stage]",
  "handoff_id": "[latest handoff id]",
  "implement_scope_expansions": 0,
  "verify_failure_count": 0,
  "qa_fix_count": 0,
  "qa_wtf_likelihood": 0.0,
  "roundtable_low_info_answers": 0,
  "writing_plan_revisions": 0,
  "first_run_complete": false,
  "telemetry_consent": null,
  "proactive_consent": null
}
```

Notes:

- the JSON block above is a legal template, not a commented pseudo-object
- artifact paths should only be written after the file really exists
- `exit_code`, `exit_reason`, `next_skill`, `rollback_target`, and `rollback_method` are exit-protocol fields
- missing `verify_result`, `review_result`, `diagnose_result`, `qa_result`, or `ship_result` means that stage has not produced a valid conclusion yet
- `qa_required` uses booleans: `true`, `false`, or `null` when still unknown

### Circuit Breaker Fields

These fields track iterative loops and enforce per-skill limits:

| Field | Type | Default | Used by | Limit | Action on limit |
|---|---|---|---|---|---|
| `implement_scope_expansions` | int | 0 | `ks-implement` | 3 | pause and ask user |
| `verify_failure_count` | int | 0 | `ks-verify` | 2 | route to diagnose |
| `qa_fix_count` | int | 0 | `ks-qa` | 50 (hard cap) | stop and ask user |
| `qa_wtf_likelihood` | float | 0.0 | `ks-qa` | 0.20 (20%) | stop and ask user |
| `roundtable_low_info_answers` | int | 0 | `ks-roundtable` | 2 | force conclusion with risk disclosure |
| `writing_plan_revisions` | int | 0 | `ks-writing-plan` | 3 | escalate to roundtable |

Rules:
- counters reset to 0 when the skill completes successfully or when routing moves to a different stage
- counters increment only, never decrement
- `qa_wtf_likelihood` is a percentage (0.0-1.0) recalculated after each fix in the fix loop

### First-Run Fields

| Field | Type | Default | Used by | Purpose |
|---|---|---|---|---|
| `first_run_complete` | bool | false | `ks-help` | whether onboarding ritual has finished |
| `telemetry_consent` | string/null | null | `ks-help`, telemetry | community/anonymous/off |
| `proactive_consent` | bool/null | null | `ks-help` | whether agent may proactively suggest skills |

Rules:
- `telemetry_consent` uses: `community` (shared anonymized), `anonymous` (local only), `off` (no telemetry), `null` (not yet asked)
- `proactive_consent` uses: `true` (agent may suggest), `false` (no proactive suggestions), `null` (not yet asked)
- these fields are set once by `ks-help` and should not change after initial setup

### `current_block`

- meaning: the one current block being executed, not a task list
- format: short readable title; slug format is not required
- when it becomes required: once `writing-plan` creates an executable block
- when it may be empty: before formal planning begins
- who sets it: normally `writing-plan`, then later stages continue using it

## Directory Structure

```text
.keystone/
├── state.json
├── developer-profile.json
├── telemetry/
│   └── events/
│       └── YYYY-MM.jsonl
├── handoff/
│   └── <handoff_id>/
│       ├── handoff.md
│       └── snapshot.json
├── .first-run
├── .telemetry-consent
└── .proactive-consent
```

## Handoff Protocol

When work must pause, ownership changes, or context is at risk of being lost, use `handoff out`.

Keystone handoff uses two artifacts:

- `handoff.md`: human-readable package for the next session
- `snapshot.json`: structured recovery state for `orchestrate`

They must live in the same directory.

Recovery rules:

- only restore after explicit `handoff in <id|latest>`
- do not auto-restore the latest handoff
- preview first, execute second

Recovery-point rules:

- `snapshot.json` restores from the current `current_stage`
- do not treat `artifacts.next_skill_hint` as the handoff recovery source
- `next_skill_hint` is for post-plan routing, not cross-session recovery

### Freeze

```bash
_HANDOFF_DOC=$(./keystone handoff create "${TOPIC:-keystone-handoff}")
_HANDOFF_DIR=$(dirname "$_HANDOFF_DOC")
_HANDOFF_ID=$(basename "$_HANDOFF_DIR")
```

### Restore

```bash
_HANDOFF_TARGET="${1:-latest}"
if [ "$_HANDOFF_TARGET" = "latest" ]; then
  _HANDOFF_DOC=$(./keystone handoff latest)
else
  _HANDOFF_DOC=$(./keystone handoff resolve "$_HANDOFF_TARGET")
fi

_HANDOFF_DIR=$(dirname "$_HANDOFF_DOC")
sed -n '1,40p' "$_HANDOFF_DIR/snapshot.json"
sed -n '1,40p' "$_HANDOFF_DOC"
echo "Recovery point: read next_routing / recovery_point in snapshot.json"
```

### Minimum `handoff.md` Slots

Every handoff package should include these 8 slots:

1. Current Task
2. Current Status
3. Completed Work
4. Key Decisions
5. Key Constraints
6. Key Files
7. Next Step
8. Pending Confirmation

The goal is not "perfect summary." The goal is "the next session can continue real work immediately."

## Telemetry Event Shape

```jsonl
{"skill":"roundtable","ts":"2026-04-03T10:00:00Z","decision":"roundtable-aligned","confidence":0.9,"entry_mode":"from-scratch","next_skill":"writing-plan"}
{"skill":"writing-plan","ts":"2026-04-03T10:05:00Z","decision":"block-defined","confidence":0.85,"risk_level":"medium","next_skill":"test-first"}
{"skill":"test-first","ts":"2026-04-03T10:10:00Z","decision":"test-contract-ready","confidence":0.9,"next_skill":"implement"}
{"skill":"review","ts":"2026-04-03T10:25:00Z","decision":"review-pass","confidence":0.9,"qa_required":false,"next_skill":"ship"}
```
