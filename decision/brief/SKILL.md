---
name: ks-brief
description: "Lightweight task compressor. Turn messy input into a one-page brief that can route to roundtable or writing-plan without replacing direction decisions."
layer: decision
owner: brief
inputs:
  - task_description
  - context
  - constraints
outputs:
  - brief_document
  - suggested_next_skill
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
---

# Brief

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Compresses messy input into a short executable brief, then hands control back to the decision chain. Enter when the request is scattered across multiple statements, or when quick alignment on what this round is about is needed before formal planning. Does not replace `roundtable` for direction convergence, `writing-plan` for block formalization, or `verify`/`review` for later-stage work.

## Compliance Anchors

> **If you cannot compress the task into one sentence, do not pretend that you already did.**
>
> **Brief is not a replacement for roundtable.**
>
> **Unknowns must be written down, not glossed over.**

## PROCEDURE

### Step 1: Denoise

Remove information that does not help the decision chain:

- remove repeated background (keep one copy of each fact)
- remove details unrelated to the current round
- keep the constraints that affect direction or scope
- keep the dependencies and blockers that limit what can be done

What to keep vs discard:

| Keep | Discard |
|---|---|
| Specific constraints (deadline, dependency) | Repeated context statements |
| Named dependencies and blockers | Background that does not affect this round |
| Success criteria the user mentioned | Vague wishes ("it should be better") |
| Known risks or limits | Tangential feature ideas |

### Step 2: Compress to One Sentence

Write the real task in one sentence. This is the hardest part of brief and the most important.

If that fails, the request belongs in `roundtable`, not `brief`. Do not pretend you already compressed it.

Examples:

| Input | Compressed one-sentence task |
|---|---|
| "We need to add a notification toggle to the settings page, and also the notification system needs to support email and push, and the user should be able to set quiet hours, and we should probably think about the notification center redesign..." | "Add a notification toggle to the existing settings page and define the smallest viable loop for this round." |
| "The API is slow and users are complaining and we should probably add caching and also optimize the queries and maybe switch to a different ORM..." | "Reduce API response time to meet the performance target for the most affected endpoint." |
| "I want to refactor the authentication module because it's messy and also add 2FA support while we're in there..." | "Refactor the authentication module to support 2FA without breaking existing login flows." |

### Step 3: Fill the Structure

```markdown
## Brief

**Task**: [one-sentence task from Step 2]
**Background**: [2-4 sentences of essential context]
**Goal**: [what this round should achieve]
**Non-goals**: [what this round will not do]
**Constraints**: [time, technical, collaboration, or release constraints]
**Unknowns**: [still-unconfirmed items — list them explicitly]
**Suggested next skill**: [roundtable / writing-plan]
**Why**: [why that route is correct]
```

### Step 4: Route

Decision logic:

- problem still too vague for one clear working topic → `roundtable`
- direction already clear, next step is turning it into the current block → `writing-plan`
- unknowns exist → list them explicitly, do not pretend the task converged
- if unknowns outnumber facts → see E2

## EXCEPTION HANDLING

### E1: Cannot Compress to One Sentence

When the task resists one-sentence compression after 2 attempts:
- Do NOT fabricate a compressed version that loses meaning
- Route to `roundtable` with a note: "Brief could not compress the task; direction convergence needed"
- Set `decision = brief-unresolved` and `confidence = 0.5`
- Include the raw input in the brief so roundtable has something to work with
- This is not a failure of brief; it means the task genuinely needs direction convergence

### E2: Unknowns Outnumber Facts

When the brief has more unknowns than confirmed facts:
- Do NOT pretend the unknowns are resolved or trivial
- Write all unknowns explicitly in the brief
- Route to `roundtable` because the decision space is too open for `writing-plan`
- Add note: "Unknowns outnumber facts; direction convergence required before planning"
- Set `confidence = 0.6`
- Example: task is "build the new dashboard" but the team hasn't decided which metrics to show, which users need it, or what data sources to use

## Routing Rules

| Condition | Route | Why |
|---|---|---|
| Task compressed to one sentence, direction clear | `writing-plan` | Ready for block definition |
| Task compressed but unknowns remain | `roundtable` | Unknowns need convergence |
| Cannot compress to one sentence | `roundtable` | Direction is too vague for brief |
| Unknowns outnumber facts | `roundtable` | Decision space is too open |

## Decision Contract

**decision**: brief-defined
**confidence**: 0.9
**rationale**: The raw input was compressed into a usable one-page brief and the correct next decision skill is explicit.
**fallback**: If the brief still does not reveal the actual task, return to roundtable.
**escalate**: false
**next_skill**: roundtable or writing-plan
**next_action**: Enter the recommended next decision skill.

## State Update

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
$_KS_CLI state set last_decision "brief-defined" >/dev/null 2>&1 || true
$_KS_CLI state set artifacts.latest_brief_status "defined" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .keystone/telemetry/events
echo "{\"skill\":\"brief\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"brief-defined\",\"next_skill\":\"${NEXT_SKILL:-roundtable}\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] brief did not become a miniature roundtable (no direction convergence attempted)
- [ ] brief did not become a miniature writing-plan (no scope or done criteria defined)
- [ ] the next skill is explicit
- [ ] unknowns are listed honestly
- [ ] the task is truly one sentence, not a paragraph with a period at the end
