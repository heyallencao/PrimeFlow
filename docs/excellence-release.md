# PrimeFlow Excellence Release

This document describes the changes delivered in the excellence release, what each change does, how to use the new capabilities, and what to expect when upgrading from a prior installation.

## Summary

The excellence release rewrites all 18 SKILL.md files from RFC-style protocol specs into executable procedure manuals, adds shared voice infrastructure, upgrades the CLI with three new commands, and introduces a structured knowledge base.

The core shift: skills now tell the agent exactly what to do at each step, instead of only explaining what the step should mean.

## What Changed

### 1. All 18 Skills Rewritten to Executable Standard

Every `SKILL.md` now follows a consistent structure:

```text
Frontmatter (unchanged)
Preamble reference (1 line)
Compressed summary (5-10 lines)
═══════════════════════════════
PROCEDURE (the dominant section)
  Step N: exact action
    - command: exact bash/tool call
    - expected: what output to look for
    - if X: decision branch
    - failure: what went wrong and what to do
═══════════════════════════════
Exception Handling (2-4 exception paths per skill)
Decision Contract
State Update
Telemetry
Quality Checklist
```

The content ratio inverted from roughly 80/20 (philosophy/steps) to 10/90 (context/procedure).

Each skill now includes:
- exact bash commands at each step
- decision branches (if X then Y)
- failure mode handling
- 2-4 explicit exception paths with trigger, procedure, recovery, and state update

### 2. Shared Voice System (`templates/preamble.md`)

A shared preamble is referenced by every SKILL.md. It defines:

- **Voice**: write like a senior engineer talking to a trusted colleague. Banned words, banned phrases, style rules, concreteness standard.
- **AskUser format**: context then question then recommendation then lettered options. Always give a recommendation.
- **Jargon list**: 25 terms glossed on first use per skill run.
- **Anti-slop rules**: no em dashes as clause separators, no stacked adjectives, no rhetorical questions.

This makes all 18 skills read as one coherent system rather than 18 independent authors.

### 3. First-Run Ritual (`pf-help`)

`/pf-help` now runs a progressive onboarding sequence on first use:

1. First run: one-paragraph intro, quickstart link
2. Telemetry consent: community/anonymous/off (defaults to off)
3. Proactive skill suggestion consent (defaults to false)

Each gate fires exactly once, controlled by flag files under `.primeflow/`. Subsequent runs skip the ritual and go straight to the routing table.

### 4. Review Specialist System (`decision/review/specialists/`)

Reviewer personas are extracted into standalone prompt files:

```text
decision/review/specialists/
├── correctness.md
├── testing.md
├── maintainability.md
├── project-standards.md
├── security.md
├── performance.md
├── data-migration.md
├── reliability.md
└── adversarial.md
```

Each specialist file defines:
- check scope (what to examine)
- report format (JSON schema for findings)
- skip condition (when to skip this specialist)
- severity calibration (examples per level)

Specialist files serve three purposes:
1. inline reference for sequential review (all hosts)
2. subagent prompt for parallel review dispatch (Claude Code)
3. extension points for domain-specific specialists (add a `.md` file, it gets picked up)

The review procedure includes:
- confidence gating (discard findings below 0.60)
- deduplication by fingerprint (file + line bucket +/-3 + normalized title)
- confidence boosting (2+ independent specialists flag same issue: +0.10 up to 1.0)
- fix classification (safe_auto / gated_auto / manual / advisory)

### 5. Scaled QA Pipeline (`pf-qa`)

QA is no longer a 3-tag Playwright check. It runs a scaled pipeline:

| Phase | Always runs? | Purpose |
|---|---|---|
| 1. Setup | yes | detect staging URL, Playwright, e2e structure |
| 2. Framework detection | yes | identify test runner, find e2e directory |
| 3. Test execution | yes | run tagged scenarios |
| 4. Interactive testing | if Playwright available | walk user-facing paths |
| 5. Health check | if runtime accessible | console errors, network failures |
| 6. Triage | yes | rank findings, identify top N |
| 7. Fix loop | if bugs found | apply fixes within budget |
| 8. Final QA | yes | re-run full suite |
| 9. Report | yes | coverage, bugs, residual |
| 10. Regression tests | if fixes applied | trace codepath, write matching tests |

Backend-only projects get phases 1-3, 6-9. Full frontend gets all 10.

Self-regulation:
- fix budget starts at 15, hard cap at 50
- WTF-likelihood score: reverts +15%, multi-file fixes +5%
- WTF > 20%: stop and ask user

### 6. CI/CD-Aware Ship Pipeline (`pf-ship`)

Ship now detects the project's CI/CD setup before producing commands. A new CLI command does the detection:

```bash
./primeflow detect-ci
```

Output:

```json
{
  "type": "github-actions",
  "test_cmd": "npm test",
  "coverage_cmd": null,
  "deploy_cmd": null,
  "target_branch": "main"
}
```

Detection covers: GitHub Actions, Jenkins, Make, Node (package.json), Python (pyproject.toml).

When detection succeeds, `pf-ship` produces project-specific commands. When detection returns unknown, it falls back to advisory mode with improved prompts.

The ship procedure also includes a cross-model second opinion step: if `codex` or `gemini` CLI is available, run a lightweight secondary review and synthesize findings (overlap = high confidence, unique = blind spot).

### 7. Circuit Breakers (per-skill loop prevention)

Six new state fields enforce per-skill iteration limits:

| Field | Skill | Limit | Action on limit |
|---|---|---|---|
| `implement_scope_expansions` | pf-implement | 3 expansions | pause and ask user |
| `verify_failure_count` | pf-verify | 2 failures | route to diagnose |
| `qa_fix_count` | pf-qa | 50 (hard cap) | stop and ask |
| `qa_wtf_likelihood` | pf-qa | 0.20 (20%) | stop and ask |
| `roundtable_low_info_answers` | pf-roundtable | 2 consecutive | force conclusion |
| `writing_plan_revisions` | pf-writing-plan | 3 revisions | escalate to roundtable |

Counters reset to 0 when the skill completes or when routing moves to a different stage.

### 8. Developer Profile (`primeflow profile`)

A new profile system accumulates user preferences across sessions:

```bash
./primeflow profile init
./primeflow profile set autonomy autonomous
./primeflow profile set scope_appetite conservative --inferred
./primeflow profile show
```

Shape:

```json
{
  "version": "1.0.0",
  "scope_appetite": "moderate",
  "risk_tolerance": "medium",
  "detail_preference": "standard",
  "autonomy": "confirm-important",
  "architecture_care": "medium",
  "archetype_hint": null,
  "declared": {},
  "inferred": {},
  "updated_at": null
}
```

User-origin gating:
- `declared`: only the user's own chat messages can write here
- `inferred`: tool output and AI suggestions can write here, but NOT to `declared`
- `declared` always wins over `inferred` for the effective value

V1 scope: observational only. No behavioral changes yet. The profile is surfaced in handoff previews.

### 9. Knowledge Base with CLI Search (`primeflow knowledge`)

A structured knowledge base lives in `docs/solutions/` with frontmatter-indexed files:

```yaml
---
name: state-lock-race
type: bug
category: runtime-errors
keywords: [state, lock, race, concurrent, stale]
module: orchestrate
date: 2026-04-18
---
```

CLI commands:

```bash
./primeflow knowledge search state lock race   # scored search
./primeflow knowledge list                     # list all artifacts
./primeflow knowledge check                   # discoverability + frontmatter check
```

Search scores candidates by keyword match against frontmatter and body content. Results are sorted by relevance.

The `pf-knowledge` skill now uses `./primeflow knowledge search` instead of `echo "Search: [keywords]"`.

### 10. Subagent Dispatch for Review (Claude Code)

When running under Claude Code, `pf-review` can dispatch specialist personas as parallel subagents using the Task tool, instead of running them sequentially in a single context.

Mode detection:

```bash
if [ -d ".claude" ]; then
  _REVIEW_MODE="parallel"
else
  _REVIEW_MODE="sequential"
fi
```

In parallel mode, each specialist runs as an independent subagent with its specialist file as the prompt. This provides specialist isolation (no cross-contamination) and independent confidence (no anchoring bias).

On all other hosts, specialists run sequentially inline using the same specialist files. The review report includes an isolation level field: "single-agent" or "multi-agent".

### 11. Test Command Reference (`templates/test-commands.md`)

A shared reference file for framework-specific test commands (Python, Node, Java, Go, Shell, Rust). Skills reference this instead of inlining all framework variants.

### 12. Excellence Plan (`docs/excellence-plan.md`)

The full improvement plan with three waves, dependency analysis, context budget constraints, exception coverage requirements, and cross-agent consistency contract. This document lives in the repo for future reference and iteration.

## New State Fields

Nine new fields in `.primeflow/state.json`:

| Field | Type | Default | Purpose |
|---|---|---|---|
| `implement_scope_expansions` | int | 0 | scope creep counter |
| `verify_failure_count` | int | 0 | verification failure counter |
| `qa_fix_count` | int | 0 | QA fix budget counter |
| `qa_wtf_likelihood` | float | 0.0 | QA self-regulation score |
| `roundtable_low_info_answers` | int | 0 | consecutive low-info answer counter |
| `writing_plan_revisions` | int | 0 | plan revision counter |
| `first_run_complete` | bool | false | onboarding ritual finished |
| `telemetry_consent` | string/null | null | community/anonymous/off |
| `proactive_consent` | bool/null | null | agent may suggest skills |

## New CLI Commands

| Command | What it does |
|---|---|
| `primeflow detect-ci` | detect CI/CD setup, output structured JSON |
| `primeflow profile init/get/set/show` | manage developer profile |
| `primeflow knowledge search/list/check` | search and manage knowledge base |

## New Files

```text
templates/preamble.md                                    shared voice, AskUser format, jargon list
templates/test-commands.md                              framework-specific test commands
decision/review/specialists/correctness.md              correctness reviewer
decision/review/specialists/testing.md                  testing reviewer
decision/review/specialists/maintainability.md          maintainability reviewer
decision/review/specialists/project-standards.md        project standards reviewer
decision/review/specialists/security.md                 security reviewer
decision/review/specialists/performance.md              performance reviewer
decision/review/specialists/data-migration.md           data migration reviewer
decision/review/specialists/reliability.md              reliability reviewer
decision/review/specialists/adversarial.md              adversarial reviewer
decision/review/checklist.md                            review checklist
support/developer-profile.schema.json                   profile JSON schema
docs/solutions/runtime-errors/state-lock-race.md        sample bug-track artifact
docs/solutions/patterns/test-first-skip-safe.md         sample knowledge-track artifact
docs/excellence-plan.md                                 full improvement plan
docs/excellence-release.md                              this document
```

## Upgrading

If you already have PrimeFlow installed:

1. Pull the latest main branch
2. Reinstall: `./primeflow install --agents claude,codex,gemini`
3. Restart your agent
4. The first `/pf-help` run will trigger the onboarding ritual (one-time only)

Existing `.primeflow/state.json` files will continue to work. The new fields are added with defaults on next `state init`. Existing workflow state (current_stage, verify_result, etc.) is preserved.

Existing `docs/solutions/` content without frontmatter will still be found by `knowledge search`, but scored lower than frontmatter-indexed files. Run `./primeflow knowledge check` to see which artifacts need frontmatter added.

## What Was Not Changed

- The 18-skill set (no new skills, no removed skills)
- Decision contract labels and semantics
- State file version (still 1.0.0)
- The `primeflow` CLI entry point
- Install paths and distribution model
- The core workflow contract (flexible entry, honest exit)

## Known Limitations

- Subagent dispatch only works on Claude Code. Codex and Gemini fall back to sequential inline review.
- `detect-ci` does best-effort parsing of workflow files. Complex GitHub Actions with matrix builds or reusable workflows may not have all commands detected.
- Developer profile V1 is observational only. No skills change behavior based on profile yet.
- Knowledge search is keyword-based, not semantic. Richer retrieval (embedding-based) is a future possibility.
- The circuit breaker counters are tracked in state but the skills must actively check and increment them. A skill that skips its counter logic will bypass the breaker.
