---
name: ks-knowledge
description: "Lightweight knowledge compounding system. Retrieve first, write only when it is worth it, and prefer updating existing knowledge over creating more noise."
layer: support
owner: knowledge
inputs:
  - release_decision
  - session_artifacts
outputs:
  - knowledge_doc
  - retrieve_results
---

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

# Knowledge

Retrieve before write. Skip is a valid outcome. Write only when the insight is non-obvious, verified, and likely to recur.

**Responsible for**: retrieval, worthiness judgment, overlap scoring, write/update/skip decision, discoverability check.
**Not responsible for**: documentation that is not yet stable, replacing release or docs-writer.

---

## Procedure

### Step 1: Confirm entry conditions

Knowledge enters only after release is complete. Do not enter while work continues.

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_RELEASE_ESCALATE=$($_KS_CLI state get release_escalate 2>/dev/null | tr -d '"')
_LAST_SKILL=$($_KS_CLI state get last_skill 2>/dev/null | tr -d '"')
echo "Last skill: $_LAST_SKILL | Release escalate: $_RELEASE_ESCALATE"
```

- if last_skill is not release or knowledge: **stop**. Work is not complete yet.
- if release_escalate=true: **stop**. Release needs human confirmation first.

### Step 2: Run worthiness test

Knowledge is worth writing when ALL of these are true:

| Condition | Check |
|---|---|
| Non-trivial | not a typo fix, config toggle, or obvious mistake |
| Solved + verified | release completed, verify evidence exists |
| Non-obvious root cause or pattern | a reasonable engineer would not immediately see it |
| Likely to recur | same problem category will appear again in planning, review, diagnose, or release |

- if any condition fails: outcome = `skip`
- if all pass: continue to Step 3

### Step 3: Retrieve existing knowledge

Search `docs/solutions/` for overlapping knowledge using the CLI.

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_KEYWORDS="${KEYWORDS:?set KEYWORDS to search terms}"

# CLI-powered search with scoring
$_KS_CLI knowledge search $_KEYWORDS 2>/dev/null || echo "No knowledge artifacts found."
```

- expected: scored list of candidate files sorted by relevance
- if no candidates found: overlap = 0, proceed to create
- if CLI not available: fall back to manual grep against `docs/solutions/`

### Step 4: Score overlap

For each candidate, read frontmatter (first 15 lines) and score:

| Dimension | Match scoring |
|---|---|
| Problem statement overlap | +1 |
| Root cause overlap | +1 |
| Solution overlap | +1 |
| Referenced files overlap | +1 |
| Prevention rule overlap | +1 |

| Total overlap | Decision |
|---|---|
| 4-5 | `update` — modify existing doc |
| 2-3 | `create` with caution — reference existing doc |
| 0-1 | `create` — genuinely new pattern |

### Step 5: Execute the decision

#### if skip

No artifact written. This is the correct outcome for trivial or obvious work.

```bash
$_KS_CLI state set last_decision "knowledge-skip" >/dev/null
```

#### if update

Open the existing doc, add new information under the appropriate section, update the date field in frontmatter.

```bash
# Frontmatter update for the existing file:
# - add new keywords if the new case reveals them
# - update date to current date
# - do not remove existing content, only add or refine
```

#### if create

Write a new file using the appropriate track template.

**Bug track** (for resolved problems):
```markdown
---
name: [slug]
type: bug
category: [runtime-errors|performance-issues|security-issues|...]
keywords: [kw1, kw2, kw3]
module: [module]
date: YYYY-MM-DD
---

## Problem
[1-2 sentences]

## Symptoms
[observable symptoms]

## What Didn't Work
[failed attempts and why]

## Solution
[specific fix]

## Why This Works
[root cause and explanation]

## Prevention
[how to avoid recurrence]
```

**Knowledge track** (for reusable practices):
```markdown
---
name: [slug]
type: knowledge
category: [patterns|workflows|conventions|...]
keywords: [kw1, kw2, kw3]
module: [module]
date: YYYY-MM-DD
---

## Context
[what situation triggers this guidance]

## Guidance
[advice]

## Why This Matters
[why this matters]

## When to Apply
[application conditions]
```

### Step 6: Discoverability check

```bash
$_KS_CLI knowledge check 2>/dev/null || {
  # Fallback if CLI not available
  if ! grep -q "docs/solutions" AGENTS.md CLAUDE.md 2>/dev/null; then
    echo "GAP: docs/solutions/ is not referenced in AGENTS.md or CLAUDE.md"
    echo "Knowledge artifacts may not be found by future sessions."
  fi
}
```

- this check surfaces the gap but does NOT auto-edit the file
- CLI check also verifies frontmatter completeness
- if gap found: append warning to knowledge output

---

## Exception: Facts not yet stable

- **Trigger**: knowledge entered before release completed
- **Procedure**: stop, route back to release or the appropriate upstream skill
- **Recovery**: complete release, then re-enter knowledge
- **State update**: next_skill=release

## Exception: Unexecuted validation being claimed

- **Trigger**: knowledge doc would claim "validated" but verify or review evidence is missing
- **Procedure**: remove the validation claim, write only what the evidence actually supports
- **Recovery**: knowledge doc has honest scope — verified claims only, unverified items listed as "not validated"
- **State update**: none (honesty is enforced at write time)

---

## Decision Contract

**decision**: `knowledge-[skip|update|create]`
**confidence**: 0.9
**rationale**: Existing knowledge was retrieved first, overlap was scored, and the write/no-write decision keeps the knowledge base useful instead of noisy.
**fallback**: If overlap is higher than expected, update instead of creating. If reuse value is too low, skip.
**escalate**: false
**next_skill**: DONE (empty string)
**next_action**: End the task or archive the knowledge artifact.

## State Update

```bash
_KNOWLEDGE_DECISION="${KNOWLEDGE_DECISION:?set to knowledge-skip|knowledge-update|knowledge-create}"
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
$_KS_CLI state set current_stage "knowledge" >/dev/null
$_KS_CLI state set last_decision "$_KNOWLEDGE_DECISION" >/dev/null

case "$_KNOWLEDGE_DECISION" in
  knowledge-skip)
    _EXIT_CODE="ok"
    _EXIT_REASON="Knowledge reuse value too low; skipping write"
    ;;
  knowledge-update|knowledge-create)
    _EXIT_CODE="ok"
    _EXIT_REASON="Knowledge archived"
    ;;
esac
$_KS_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"knowledge\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"${_KNOWLEDGE_DECISION:-knowledge-skip}\",\"confidence\":0.9}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] retrieve happened before write
- [ ] overlap was scored (not guessed)
- [ ] duplicate creation avoided when overlap was high
- [ ] skip was used when reuse value was low
- [ ] written artifact based on solved and verified work
- [ ] discoverability check ran
