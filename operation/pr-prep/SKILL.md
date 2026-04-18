---
name: pf-pr-prep
description: "Delivery-context organizer. Compress post-review changes into reviewer-ready PR and merge context without replacing release decisions."
layer: operation
owner: pr-prep
inputs:
  - review_report
  - verification_report
  - diff
outputs:
  - pr_summary
  - merge_context
entry_modes:
  - build-ready
  - release-ready
---

# PR Prep

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Packages the purpose of the change, validation results, risk disclosure, and reviewer context into a PR-ready summary. Enter when implementation and verification are finished, review produced a formal quality judgment, and the next job is clear delivery context for a PR or merge. Does not do quality approval, release approval, or promise validation that never happened.

## Compliance Anchors

> **Never list validation that did not actually run.**
>
> **PR prep is not release.**
>
> **The Risks field must never be empty.**

## PROCEDURE

### Step 1: Auto-Detect Diff Stats

Detect the change scope from the actual diff. Do not guess or hard-code values.

```bash
_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "HEAD~10")
_FILE_COUNT=$(git diff --name-only $_BASE | wc -l | tr -d ' ')
_FILES=$(git diff --name-only $_BASE | head -20)
_LINES=$(git diff --numstat $_BASE | awk '{sum += $1 + $2} END {print sum}')
echo "BASE: $_BASE"
echo "Changed files: $_FILE_COUNT"
echo "Files: $_FILES"
echo "Total changed lines: $_LINES"
```

If no diff is found, see E1.

### Step 2: Compress Purpose

Explain the problem in 1-2 sentences. Do not replay the whole chat history.

Questions to answer:
- What was broken, missing, or needed?
- Why is this change happening now?

### Step 3: Compress Change

Extract 1-3 high-level changes. Avoid turning it into a file-by-file changelog.

Format: "Added [X]", "Fixed [Y]", "Removed [Z]". Not "changed line 47 in foo.py, line 92 in bar.py, ...".

### Step 4: Organize Validation Evidence

List only real checks that actually ran. Say "not run" when something was not run.

Sources of evidence:
- verify report (test results, behavior checks)
- review report (quality gate, findings)
- QA results (if qa_required was true)
- manual testing (describe what was tested and the result)

For each validation item, state:
- what was validated
- whether it passed, failed, or was not run
- if not run, why

### Step 5: Write Risks and Boundaries

The Risks field must never be empty. If no risks are known, write: "No known risks identified; reviewer should assess independently."

Content:
- known risks (from review findings, verify gaps, or technical judgment)
- excluded work (what this PR does NOT cover)
- what reviewers should focus on (specific files, logic, or edge cases)

### Step 6: Output

```markdown
## PR Prep

**Goal**: [one sentence]

### Summary
- [1-3 high-level changes]

### Why
- [why this is happening now, 1-2 sentences]

### Validation
- [executed validation with pass/fail status]
- [not-run items with reason]

### Risks
- [known risks]
- [reviewer focus areas]

### Not Included
- [explicit exclusions]

### Reviewer Notes
- [what reviewers should focus on and why]
```

## EXCEPTION HANDLING

### E1: No Diff Found

When Step 1 produces no diff between the current branch and the base:
- Check whether the branch is already merged: `git log --oneline origin/main..HEAD`
- If the branch has no commits ahead of base, report: "No unmerged changes detected; PR prep cannot produce context without a diff"
- If the diff exists but the base is wrong, try `HEAD~5` as a fallback base
- Do NOT fabricate change descriptions without an actual diff
- If the change was already merged, route to `release` instead of `pr-prep`

### E2: Review Evidence Missing

When review or verification reports are not available:
- Do NOT write validation claims without evidence
- Mark each missing report as "not available" in the validation section
- If both review and verification are missing, route to `verify` first
- State: "PR context is incomplete; review/verify evidence should be collected before PR submission"
- A PR without validation evidence is not reviewer-ready

## Decision Contract

**decision**: pr-context-ready
**confidence**: 0.9
**rationale**: Reviewer-ready delivery context was prepared from verify and review evidence, while risks and unexecuted validation remain honestly disclosed.
**fallback**: If the review conclusion changes, regenerate the PR context from the new evidence.
**escalate**: false
**next_skill**: ship or release
**next_action**: Use the prepared context for PR, merge, or downstream delivery work.

## State Update

```bash
_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"
$_PF_CLI state set last_decision "pr-context-ready" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.pr_prep_status "ready" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"pr-prep\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"pr-context-ready\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] this did not become release (no release decision made)
- [ ] validation is real (only checks that actually ran)
- [ ] risks and exclusions are explicit (Risks field is not empty)
- [ ] the result is usable as PR or merge context
- [ ] the diff stats are from actual git output, not guessed
