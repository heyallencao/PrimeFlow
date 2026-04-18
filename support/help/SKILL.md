---
name: pf-help
description: "PrimeFlow first-run entry. Use it for onboarding, scenario triage, and choosing the next skill without replacing orchestrate."
layer: support
owner: help
inputs:
  - task_description
  - context
outputs:
  - entry_recommendation
  - suggested_skill
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
  - build-ready
  - release-ready
  - incident
---

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

# Help

PrimeFlow's entry point. One job: give the user one copy-ready next sentence.

**Responsible for**: recommending one skill, giving a copy-ready prompt.
**Not responsible for**: deciding entry_mode, mutating workflow state, replacing orchestrate.

---

## Procedure

### Step 1: Run first-run intro if needed

Check if this is the user's first time. `state init` already created flag files and set defaults. This step only prints the intro message once.

```bash
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
_FIRST_RUN=$($_PF_CLI state get first_run_complete 2>/dev/null | tr -d '"')

if [ "$_FIRST_RUN" != "true" ]; then
  $_PF_CLI state set first_run_complete true >/dev/null 2>&1 || true
  echo "=== First Run ==="
  echo "PrimeFlow: flexible entry, honest exit."
  echo "You can finish your first real task in about 5 minutes."
  echo "Quickstart: docs/quickstart.md"
  echo ""
  echo "Telemetry is off by default. Change with:"
  echo "  ./primeflow state set telemetry_consent community"
  echo "  ./primeflow state set telemetry_consent anonymous"
  echo "  ./primeflow state set telemetry_consent off"
  echo ""
fi
```

- expected: first_run_complete set to true in state on first run only
- subsequent runs: first_run_complete is already true, intro skipped silently
- non-interactive: defaults are telemetry=off, proactive=false (set by state init)

### Step 2: Determine the current situation

Read the user's input and classify:

| if | then |
|---|---|
| User explicitly named a skill | route directly to that skill |
| User described a clear stage | route to the matching skill from the table below |
| User's real problem is direction convergence | recommend `roundtable` |
| User is unsure which skill to use | default to `orchestrate` |
| User said "I just installed" or no state file exists | treat as first-time, offer quickstart |

Decision rule: recommend exactly one primary entry. A list of three "maybe" options is not a recommendation.

### Step 3: Look up the recommendation

| Current situation | Recommended skill | Copy-ready prompt |
|---|---|---|
| Completely unsure where to begin | `orchestrate` | `/pf-orchestrate Route this task from the correct entry mode and push it to the smallest safe next step.` |
| Direction is still messy and needs convergence | `roundtable` | `/pf-roundtable The direction is still unclear. Help me converge what to do and what not to do before formal planning.` |
| Direction is clear, needs a current block | `writing-plan` | `/pf-writing-plan The direction is decided. Turn it into one executable block with done criteria.` |
| Behavior must be locked before implementation | `test-first` | `/pf-test-first Define failing checks that lock the behavior boundary before implementation begins.` |
| The block is clear, work should begin now | `implement` | `/pf-implement Execute the current block without expanding scope.` |
| Code exists, needs fresh evidence | `verify` | `/pf-verify Collect fresh evidence for the current change before claiming it is ready for review.` |
| Something is broken, cause is unclear | `diagnose` | `/pf-diagnose Investigate the root cause before attempting a fix.` |
| A bug showed up, type is unclear | `bug-triage` | `/pf-bug-triage Classify this failure as spec gap, implementation bug, or rollback candidate.` |
| Formal quality gate is needed | `review` | `/pf-review Run the formal quality gate using fresh verification evidence.` |
| Runtime validation is needed | `qa` | `/pf-qa Run real browser or runtime validation for critical user paths.` |
| Delivery or release closeout | `ship` / `release` | `/pf-ship Close out delivery with final checks.` |
| PR closeout context is needed | `pr-prep` | `/pf-pr-prep Package the change into reviewer-ready PR context.` |
| Need to pause or resume later | `handoff` | `/pf-handoff Freeze the current context for later recovery.` |

### Step 4: Output the recommendation

```markdown
## Help Recommendation

**Current read**: [one sentence]
**Recommended entry**: `skill-name`
**Why**: [one sentence]

---
**Copy this and send it next:**

> [full copy-ready prompt from the table above]

---
```

The copy-ready prompt must appear inside a `>` quote block so the user can spot it immediately.

### Step 5: Hand off

Once the recommendation is output, stop. Let the downstream skill do the work. Help does not keep routing ownership.

---

## Exception: User names a skill directly

If the user says `/pf-review` or "I need a review", route directly to that skill. Do not force them back through the recommendation table.

## Exception: First-time user with no state

If no `.primeflow/state.json` exists and the user has not described a task, append:

```markdown
---
**New here?** You can finish a real task in about 5 minutes. Read `docs/quickstart.md` or run:
> /pf-orchestrate Route this task from the correct entry mode and push it to the smallest safe next step.
---
```

## Exception: User asks "what skills exist?"

Show the full scenario table from Step 3. This is the only case where help shows more than one recommendation.

---

## Decision Contract

**decision**: help-guided
**confidence**: 0.9
**rationale**: One executable entry recommended based on the user's current situation. Help only handles onboarding and scenario triage; it does not replace formal routing.
**fallback**: If help cannot reliably determine the stage, default to orchestrate.
**escalate**: false
**next_skill**: orchestrate
**next_action**: Enter the recommended skill using the copy-ready prompt.

## State Update

```bash
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
$_PF_CLI state set last_decision "help-guided" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.last_help_recommendation "${SUGGESTED_SKILL:-orchestrate}" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"help\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"help-guided\",\"next_skill\":\"${SUGGESTED_SKILL:-orchestrate}\",\"first_run\":$([ -f .primeflow/.first-run ] && [ "$(find .primeflow/.first-run -mmin +0 2>/dev/null)" != "" ] && echo false || echo true)}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] first-run ritual ran if needed, did not repeat
- [ ] one primary recommendation was given (not a list)
- [ ] the copy-ready prompt is present in a quote block
- [ ] the recommendation matches the user's current stage
- [ ] help was not turned into a second orchestrate
