---
name: ks-review
description: "Formal quality gate with multi-persona review, confidence thresholds, and QA routing based on fresh verification evidence."
layer: decision
owner: review
inputs:
  - diff
  - plan_document
  - verification_report
outputs:
  - review_report
  - findings
  - review_verdict
entry_modes:
  - build-ready
  - release-ready
---

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

# Review

Turns verification evidence into a formal quality decision. Verify collects evidence; review interprets it.

**Responsible for**: structured multi-specialist review, finding dedup, confidence gating, qa_required decision, verdict.
**Not responsible for**: collecting evidence (verify), fixing code (implement), runtime testing (qa).

---

## Procedure

### Step 1: Confirm prerequisites

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
_VERIFY_RESULT=$($_KS_CLI state get verify_result 2>/dev/null | tr -d '"')
_PLAN_DOC=$($_KS_CLI state get artifacts.plan_document 2>/dev/null | tr -d '"')

echo "Verify result: $_VERIFY_RESULT"
echo "Plan document: $_PLAN_DOC"
```

- if verify_result is null/missing: **stop**. Route back to verify. No fresh evidence means no review.
- if plan_document is null: warn, continue (plan may not exist for controlled exceptions).
- if both missing: **stop**. This review has no basis.

### Step 2: Measure diff scope

```bash
_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "HEAD~10")
_FILE_COUNT=$(git diff --name-only $_BASE | wc -l | tr -d ' ')
_LINES=$(git diff --numstat $_BASE | awk '{sum += $1 + $2} END {print sum}')
echo "Changed files: $_FILE_COUNT | Changed lines: $_LINES"
```

- expected: file count and line count
- use these to determine whether adversarial specialist should activate (>200 lines or high-risk surface)

### Step 3: Select specialists

Specialist files live in `decision/review/specialists/`. Reference each by path.

**Always-on** (read every review):
- `specialists/correctness.md`
- `specialists/testing.md`
- `specialists/maintainability.md`
- `specialists/project-standards.md`

**Conditional** (activate based on diff content):

| Specialist | Activate when |
|---|---|
| `specialists/security.md` | diff touches auth, public endpoints, user input, permissions, credentials |
| `specialists/performance.md` | diff touches DB queries, caching, async, loops over collections, rendering |
| `specialists/data-migration.md` | diff touches migration files, schema, model definitions |
| `specialists/reliability.md` | diff touches retries, timeouts, background jobs, error handling, concurrency |
| `specialists/adversarial.md` | diff >200 lines OR high-risk surface (auth, payments, data integrity) |

**Skip check**: before running each specialist, read its skip condition. If the diff does not match its activation trigger, skip it and log why.

### Step 4: Run each specialist

For each selected specialist, read the file and execute its check scope against the diff.

Each specialist returns structured findings:

```json
{
  "reviewer": "specialist-name",
  "findings": [
    {
      "file": "path:line",
      "issue": "concrete problem statement",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["fact 1", "fact 2"],
      "autofix_class": "safe_auto|gated_auto|manual|advisory"
    }
  ],
  "residual_risks": [],
  "testing_gaps": []
}
```

**Execution modes** (detect which mode to use):

| Mode | When | How |
|---|---|---|
| Sequential (inline) | default, all hosts except Claude Code | read each specialist file, apply its check scope one at a time |
| Parallel (subagent) | Claude Code (detected by `.claude/` directory existing in project) | dispatch each specialist as a subagent with the specialist file as its prompt |

**Mode detection**:
```bash
if [ -d ".claude" ]; then
  _REVIEW_MODE="parallel"
  echo "Review mode: parallel (Claude Code detected)"
else
  _REVIEW_MODE="sequential"
  echo "Review mode: sequential"
fi
```

### Parallel dispatch (Claude Code only)

When `_REVIEW_MODE=parallel`, dispatch each specialist using the Task tool. Each specialist becomes an independent subagent.

**Task call format**:
```
Task(
  subagent_type: "worker",
  description: "review specialist: [name]",
  prompt: "You are the [specialist name] reviewer.\n\nRead the specialist instructions:\n[SPECIALIST_FILE_CONTENT]\n\nReview this diff against the current plan:\n\n[DIFF_CONTENT]\n\nReturn ONLY structured JSON findings in the format specified by the specialist file."
)
```

**Collection**:
- issue all specialist Task calls in parallel (same message, multiple Task invocations)
- collect all returned JSON findings
- proceed to Step 5 (confidence gate) with the combined findings

**Advantages of parallel dispatch**:
- specialist isolation: each specialist sees only the diff and its own check scope, no cross-contamination
- independent confidence: no anchoring bias from seeing other specialists' findings first
- genuine multi-perspective: each specialist is a fresh context

**Sequential execution** (all other hosts):
- read specialist files one at a time, apply check scope mentally
- keep findings from each specialist separate until Step 5
- note in review report: "single-agent review, no specialist isolation"

### Step 5: Confidence gate

Discard every finding with confidence < 0.60. No severity exception.

```bash
# Filter: keep only findings where confidence >= 0.60
# Rationale: a confident wrong finding is worse than no finding
```

- expected: some findings removed
- if all findings removed: report "no actionable findings after confidence gate"

### Step 6: Deduplicate findings

Fingerprint algorithm:
```
fingerprint = normalize(file_path) + line_bucket(line, +/-3) + normalize(title)
```

- normalize: lowercase, remove punctuation, collapse whitespace
- line_bucket: group line numbers within +/-3 of each other
- if 2+ findings share the same fingerprint: merge them, keep highest severity and highest confidence

**Confidence boosting**:
- if 2+ independent specialists flag the same issue (same fingerprint): raise confidence by +0.10, up to max 1.0
- this is the only way to increase confidence above what a single specialist assigned

### Step 7: Classify fixes

| autofix_class | Who applies | When |
|---|---|---|
| `safe_auto` | review skill directly | deterministic local fix (typo, missing import, unused variable) |
| `gated_auto` | user approves first | fix is known but changes behavior |
| `manual` | human in follow-up | requires judgment, design decision, or multi-file change |
| `advisory` | report only | low-impact note, no action required |

### Step 8: Present findings by severity

**Interactive mode** (default):

```
Step 8a: present P0 findings
  → user accepts, rejects, or modifies each
  → accepted safe_auto items may be applied immediately

Step 8b: present P1 findings
  → same flow

Step 8c: present P2 findings
  → accept or mark advisory

Step 8d: present P3 findings
  → report only, no action needed
```

**Report-only mode**: skip interaction, just list all findings sorted by severity.

**Autofix mode**: apply all safe_auto fixes without confirmation, report gated_auto and manual items.

### Step 9: Decide qa_required

| Condition | qa_required |
|---|---|
| Diff touches user-facing path (browser, form, navigation) | `true` |
| Diff touches critical integration chain (payment, auth flow, data pipeline) | `true` |
| Diff is internal script, config, non-interactive backend fix | `false` |
| Uncertain | `true` (safer default) |

```bash
$_KS_CLI state set qa_required "$_QA_REQUIRED" >/dev/null
```

- qa_required must be explicit before review exits. null is not valid.

### Step 10: Render verdict

| Verdict | Condition |
|---|---|
| `pass` | no unresolved P0/P1 findings |
| `pass_with_risks` | only P2/P3 remain, all disclosed |
| `blocked` | unresolved P0/P1 findings exist |

### Step 11: Generate review report

```markdown
## Review Report

**Scope**: [files changed, line count]
**Intent**: [purpose of the change]
**Specialists run**: [list of specialists that ran]
**Specialists skipped**: [list with skip reasons]
**Mode**: sequential / parallel (Claude Code)
**Review mode**: interactive / report-only / autofix
**Isolation**: single-agent / multi-agent (specialist isolation)

### P0 - Critical
| # | File | Issue | Specialist | Confidence | Route |
|---|---|---|---|---|---|
| 1 | path:line | description | name | 0.XX | safe_auto/gated_auto/manual |

### P1 - High
[same table format]

### P2 - Moderate
[same table format]

### P3 - Low
[summary only, no table]

### Applied Fixes
- [list of auto-applied fixes]

### Residual Work
- [manual/advisory items remaining]

### Verdict
- **[pass / pass_with_risks / blocked]**

### QA Routing
- **qa_required**: [true / false]
- **reason**: [why]
```

### Step 12: Update state

```bash
_REVIEW_RESULT="${REVIEW_RESULT:?pass|pass_with_risks|blocked}"
_QA_REQUIRED="${QA_REQUIRED:?true|false}"
_KS_CLI="${KEYSTONE_CLI:-./keystone}"

$_KS_CLI state set current_stage "review" >/dev/null
$_KS_CLI state set review_result "$_REVIEW_RESULT" >/dev/null
$_KS_CLI state set qa_required "$_QA_REQUIRED" >/dev/null

case "$_REVIEW_RESULT" in
  pass)
    _EXIT_NEXT=$([ "$_QA_REQUIRED" = "true" ] && echo "qa" || echo "ship")
    _EXIT_REASON="Review passed"
    ;;
  pass_with_risks)
    _EXIT_NEXT=$([ "$_QA_REQUIRED" = "true" ] && echo "qa" || echo "ship")
    _EXIT_REASON="Review passed with disclosed risks"
    ;;
  blocked)
    _EXIT_NEXT="implement"
    _EXIT_REASON="Review blocked by P0/P1 findings"
    ;;
esac

$_KS_CLI state set exit_code "ok" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

### Step 13: Emit telemetry

```bash
mkdir -p .keystone/telemetry/events
echo "{\"skill\":\"review\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"review-$_REVIEW_RESULT\",\"confidence\":0.9,\"review_result\":\"$_REVIEW_RESULT\",\"qa_required\":$_QA_REQUIRED,\"findings_p0\":${P0_COUNT:-0},\"findings_p1\":${P1_COUNT:-0},\"specialists_run\":${SPECIALIST_COUNT:-4}}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

---

## Exception: No fresh evidence from verify

- **Trigger**: verify_result is null or missing
- **Procedure**: stop review immediately, route back to verify
- **Recovery**: user runs verify, then returns to review
- **State update**: next_skill=verify, exit_reason="Review requires fresh verify evidence"

## Exception: Conflicting specialist findings at same severity

- **Trigger**: two specialists disagree (one says P0, other says P3) on same issue
- **Procedure**: use the higher severity, but note the disagreement in the finding's evidence field
- **Recovery**: present to user with both perspectives, let user decide
- **State update**: none (conflict is recorded in findings, not in state)

## Exception: Diff is empty

- **Trigger**: `git diff` shows no changes
- **Procedure**: report "empty diff, nothing to review", set review_result=pass with caveat
- **Recovery**: user checks whether changes were committed or branch is correct
- **State update**: review_result=pass, qa_required=false

## Exception: qa_required is null after review

- **Trigger**: Step 9 was skipped
- **Procedure**: this should never happen. If it does, default qa_required=true and log a warning
- **Recovery**: review continues with qa_required=true
- **State update**: qa_required=true

---

## Extension Mechanism

To add a domain-specific specialist:
1. create a new file in `decision/review/specialists/` (e.g., `accessibility.md`)
2. follow the same structure: check scope, report format, skip condition, severity calibration
3. add the activation trigger to Step 3 in this SKILL.md
4. the specialist will be picked up by the review procedure automatically

## Decision Contract

**decision**: `review-[pass|pass-with-risks|blocked]`
**confidence**: 0.9
**rationale**: Verification evidence exists, specialist findings were confidence-gated and deduplicated, qa_required is explicit.
**fallback**: If blocked, return to implement for fixes.
**escalate**: false
**next_skill**: qa (if qa_required=true) or ship (if qa_required=false)
**next_action**: Enter the routed closeout skill.

## Quality Checklist

- [ ] verify evidence was confirmed before review started
- [ ] always-on specialists ran
- [ ] conditional specialists activated by diff content
- [ ] confidence gate removed findings below 0.60
- [ ] dedup was applied
- [ ] qa_required is explicit (not null)
- [ ] verdict matches the finding state
- [ ] review report includes specialists run and skipped
