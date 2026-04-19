---
name: ks-docs-writer
description: "Fact-based documentation writer. Compress completed implementation, verification, or release results into stable docs such as changelogs, ADRs, and migration notes."
layer: support
owner: docs-writer
inputs:
  - session_artifacts
  - review_report
  - release_statement
outputs:
  - docs_draft
  - doc_type
entry_modes:
  - build-ready
  - release-ready
---

# Docs Writer

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Turns completed, evidenced work into stable reusable documentation. Every claim in the document must trace back to something that actually happened. Enter when implementation, verification, review, or release already finished and the next job is to turn those results into a changelog, ADR, migration note, maintainer note, or handoff note. Does not decide knowledge value, make release decisions, or invent unexecuted validation.

## Compliance Anchors

> **Every claim in the document must trace back to a real fact.**
>
> **Do not enter before the facts are stable.**
>
> **Docs-writer does not decide knowledge value.** That is `knowledge`.

## Document Types

| Type | Use when |
|---|---|
| `changelog` | user-facing or team-facing change summary |
| `adr` | why a path was chosen (Architecture Decision Record) |
| `migration-note` | config, API, or upgrade impact |
| `maintainer-note` | implementation details or future caveats for maintainers |
| `handoff-note` | execution context for the next operator |

Start with the smallest document that fits the purpose. Do not write a changelog when a maintainer-note suffices.

## PROCEDURE

### Step 1: Collect Confirmed Facts

Gather from verify/review/release artifacts:

- what changed
- why it changed
- how it was verified
- what still remains limited

If the fact has no evidence, do not write it. See fact-checking procedure below.

### Fact-Checking Procedure

Before writing any claim into the document, trace it to a source artifact:

1. **Trace the claim to a source artifact** (verify report, review report, release statement, test results)
2. **If the source artifact does not exist**, the claim is unconfirmed
3. **Unconfirmed claims** must be marked "unconfirmed" or removed entirely
4. **Specific checks**:
   - "validated" → did verify actually run? Check `verification_report`.
   - "reviewed" → did review actually produce a verdict? Check `review_report`.
   - "released" → did release actually produce a decision? Check `release_statement`.
   - "tested" → did tests actually pass? Check test output.
   - "no known issues" → is this a claim or was it actually verified?

If a claim cannot be traced to a source artifact within 30 seconds of looking, treat it as unconfirmed.

### Step 2: Choose One Document Type

Pick the smallest document that covers the purpose.

Decision logic:

| Need | Document type |
|---|---|
| "Users need to know what changed" | `changelog` |
| "We need to record why we chose X over Y" | `adr` |
| "Upgrading will require config changes" | `migration-note` |
| "Future maintainers need to know about this caveat" | `maintainer-note` |
| "The next operator needs execution context" | `handoff-note` |

Do not write multiple document types in one pass. Pick one.

### Step 3: Compress into Stable Structure

```markdown
## Docs Draft

**doc_type**: [changelog / adr / migration-note / maintainer-note / handoff-note]
**Title**: [document title]

### Context
[background — why this document exists]

### What Changed
[what changed — specific, not vague]

### Evidence
[verification or factual basis — traceable to source artifacts]

### Risks / Limits
[risks, limits, or uncovered items — honestly stated]

### Notes
[follow-up notes — actionable items]
```

### Step 4: Stay Honest

Honesty rules applied during writing:

- unexecuted validation must not become "validated"
- undecided work must not become "decided"
- partial coverage must not become "full coverage"
- speculative content must be marked as "speculative" or "expected but not confirmed"
- if you are unsure whether something happened, write "reportedly" or "believed to" rather than asserting it as fact

## EXCEPTION HANDLING

### E1: Facts Not Yet Stable

When the underlying work (verify, review, release) is still in progress or the results may change:
- Do NOT enter `docs-writer` yet
- Report: "Facts are not yet stable; documentation should wait until [skill] completes"
- Route to the incomplete skill to finish the work first
- Writing documentation over unstable facts creates false certainty that is harder to correct later
- If only some facts are stable, write only about those and mark the rest as "pending confirmation"

### E2: Unexecuted Validation Being Claimed

When a draft or source artifact claims validation that did not actually run:
- Remove the claim from the document
- Replace with: "[validation type] was not executed"
- If the claim is central to the document's purpose (e.g., the changelog says "all tests pass" but no tests ran), the document may not be worth writing yet
- Route to `verify` or `review` to actually run the validation first
- Do NOT add a disclaimer footnote to preserve the false claim; remove the claim entirely

## Decision Contract

**decision**: docs-draft-ready
**confidence**: 0.9
**rationale**: The draft is built from confirmed facts, includes real evidence, and honestly exposes risk and unfinished edges.
**fallback**: If the facts are incomplete, return to the source artifacts in verify, review, or release.
**escalate**: false
**next_skill**: release / knowledge / DONE
**next_action**: Use the draft for communication, archival, or handoff.

## State Update

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
$_KS_CLI state set last_decision "docs-draft-ready" >/dev/null 2>&1 || true
$_KS_CLI state set artifacts.docs_writer_status "ready" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .keystone/telemetry/events
echo "{\"skill\":\"docs-writer\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"docs-draft-ready\",\"doc_type\":\"${DOC_TYPE:-maintainer-note}\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] this did not become knowledge or release (stayed in scope)
- [ ] every claim traces back to real evidence (fact-checking procedure was applied)
- [ ] the document type matches the purpose (smallest type chosen)
- [ ] unfinished work is disclosed honestly (no false certainty)
