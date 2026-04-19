# Keystone Excellence Plan

> From principled protocol to lived product.

This plan addresses the gap between Keystone's current state (a solid workflow contract with clean routing semantics) and the excellence bar set by superpowers and gstack (agent skills that feel like a product, not a spec). It is organized into three waves by impact and dependency order.

## Current Diagnosis

| Dimension | Current | Excellence Bar |
|---|---|---|
| Skill content | RFC-style prose: 80% philosophy, 20% steps | Executable procedures: 10% context, 90% step-by-step with decision trees, exact commands, failure modes |
| Voice | None — each skill generates its own tone | Shared voice system: banned vocabulary, concreteness standard, anti-slop rules, consistent formatting |
| Onboarding | Static routing table | Progressive disclosure ritual: first-run intro, telemetry consent, skill suggestions, one-time-only |
| Review personas | Mental exercise: single agent "thinks about" each persona | Parallel specialist dispatch with inline prompts, structured output, dedup, and confidence boosting |
| QA | Skeleton: Playwright check + 3 grep tags | Scaled pipeline (7-10 phases based on project type), fix budget, regression test generation |
| Ship/Release | Advisory echo: "recommended: git merge X" | CI/CD detection, generated pipeline, cross-model second opinion when available |
| Spiral prevention | Diagnose only (3-loop cap) | Per-skill circuit breakers: fix budgets, WTF-likelihood, scope-expansion caps |
| User adaptation | Stateless: every session starts from zero | Developer profile accumulation, archetype matching, preference inference |
| Knowledge | grep-only retrieval against docs/solutions/ | Categorized frontmatter, overlap scoring, discoverability verification |
| Cross-model | Single-agent mono-model review | Dual-model review synthesis when secondary model CLI is available |

---

## Wave 1: Make Skills Executable (highest impact, minimal new infrastructure)

These changes transform every SKILL.md from "what this means" into "what to do right now". They require only lightweight additions: a shared preamble template, flag files for onboarding, and a few state fields for first-run gating. No new CLI commands or runtime services.

### 1.1 Shared Preamble

**What**: A `templates/preamble.md` file injected (by reference) into every SKILL.md.

**Contents**:
- Voice definition (~40 lines): banned words (delve, crucial, robust, comprehensive, nuanced, leverage, utilize), banned phrases ("here's the kicker", "let me break this down"), style rules (short paragraphs, concrete nouns, active voice, name the file/function/line)
- Concreteness standard: "does this sound like a real builder talking to another builder?"
- Anti-slop rules: no em dashes as clause separators, no filler hedging, no generic optimism
- AskUser format: context → question → recommendation → lettered options (for any skill that needs to ask the user)
- Writing style jargon list (~75 terms with one-sentence gloss on first use per skill)

**Done when**:
- [ ] `templates/preamble.md` exists with voice, AskUser format, jargon list
- [ ] every SKILL.md has `> Preamble: see templates/preamble.md` at the top
- [ ] at least 3 skills have been rewritten to demonstrate the voice in practice

**Effort**: medium (writing the preamble is a design exercise, injection is a reference line)

### 1.2 Rewrite ks-help as First-Run Ritual

**What**: Replace the static routing table with a progressive onboarding sequence gated by flag files.

**Flow**:
1. No `.keystone/.first-run` → show one-paragraph intro ("Flexible entry, honest exit. Here is how to finish your first real task in 5 minutes."), offer quickstart link, create flag file
2. No `.keystone/.telemetry-consent` → ask telemetry preference (community / anonymous / off), write to state, create flag file
3. No `.keystone/.proactive-consent` → ask whether agent may proactively suggest skills, create flag file
4. Subsequent runs → skip all ritual, go straight to routing table (current behavior)

**Rules**:
- each gate fires exactly once
- never nag again
- if user skips (non-interactive), default to off and create flag silently

**Done when**:
- [ ] `/ks-help` checks 3 flag files before showing the routing table
- [ ] first-run shows intro + quickstart
- [ ] telemetry and proactive consent are asked once
- [ ] flag files are created under `.keystone/`
- [ ] subsequent runs skip the ritual
- [ ] 3 new state fields (`first_run_complete`, `telemetry_consent`, `proactive_consent`) are documented in STATE.md

**Effort**: small

### 1.3 Rewrite All 18 SKILL.md Files to Executable Standard

**What**: Invert the content ratio from 80/20 (philosophy/steps) to 10/90 (context/procedure).

**New structure for each SKILL.md**:
```
Frontmatter (unchanged)
Preamble reference (1 line)
What + Why + When (5-10 lines, compressed from current)
Responsibility boundary (3-5 lines, compressed)
Compliance anchors (3-5 lines, compressed)
═══════════════════════════════
PROCEDURE (the new bulk)
═══════════════════════════════
Step 1: [exact action]
  - command: [exact bash/tool call]
  - expected: [what output to look for]
  - if X: [decision branch]
  - if Y: [decision branch]
  - failure: [what went wrong and what to do]
Step 2: ...
...
Decision contract (unchanged)
State update (unchanged)
Telemetry (unchanged)
Quality checklist (unchanged)
```

**Priority order** (by user impact + dependency chain):
1. `ks-orchestrate` — the system entry point; if orchestrate is not executable, users never reach downstream skills. Loop detection, handoff recognition, state validation before routing
2. `ks-help` — already covered in 1.2; first-run ritual + routing table
3. `ks-review` — specialist prompts, structured output schema, dedup algorithm, confidence boosting (see 1.4 for specialist extraction strategy)
4. `ks-verify` — evidence priority with exact commands per framework type
5. `ks-diagnose` — 4-phase method (collect → hypothesize → validate → conclude) with per-phase gates
6. `ks-implement` — scope discipline with concrete scope-creep detection steps
7. `ks-qa` — phased pipeline scaled to project size, fix budget, regression test generation
8. `ks-ship` — CI/CD-aware advisory pipeline (see 2.2 for CLI support needed)
9. `ks-release` — risk threshold matrix, release statement with executed/skipped split
10. `ks-roundtable` — per-mode question templates, role activation rules, exit condition decision tree
11. `ks-writing-plan` — scope test with concrete examples, done-criteria strengthening examples
12. `ks-test-first` — red-green-refactor with framework-specific command templates
13. `ks-handoff` — 8-slot validation checklist, compression rules, recovery preview template
14. `ks-bug-triage` — fast decision tree with symptom examples
15. `ks-brief` — denoise examples, one-sentence compression test
16. `ks-pr-prep` — auto-detect diff stats, generated PR description template
17. `ks-docs-writer` — fact-checking procedure against verify/review artifacts
18. `ks-knowledge` — retrieval procedure with overlap scoring

**Done when**:
- [ ] every SKILL.md has procedure section as the dominant content
- [ ] every procedure step has either exact commands or explicit decision branches
- [ ] at least 5 skills have failure-mode handling at each step
- [ ] the voice is consistent across all 18 files (preamble compliance)

**Effort**: large (this is the biggest single item)

### 1.4 Extract Review Specialists into Separate Files

**What**: Extract reviewer personas from ks-review into standalone prompt files under `decision/review/specialists/`. This eliminates the triple-rewrite problem (inline → extract → subagent) by committing to the file-based structure from the start. The files serve as both inline reference and future subagent prompts.

**Why now instead of Wave 3**: Writing inline prompts in 1.3 and then extracting them later and then rewriting them as subagent prompts is waste. Files work for all three modes: the SKILL.md references them by path, inline execution reads them sequentially, and subagent dispatch passes them as subagent prompts. No rewrites needed later.

**Structure**:
```
decision/review/
├── SKILL.md
├── specialists/
│   ├── correctness.md
│   ├── testing.md
│   ├── maintainability.md
│   ├── project-standards.md
│   ├── security.md
│   ├── performance.md
│   ├── data-migration.md
│   ├── reliability.md
│   └── adversarial.md
└── checklist.md
```

Each specialist file (30-50 lines):
- check scope: what to examine
- report format: JSON schema for findings
- skip condition: when to skip this specialist
- severity calibration: 2-3 examples per severity level
- extension note: "add domain-specific specialists (e.g., accessibility.md) to this directory"

**Persona list** (expanded from current):
- Always-on: correctness, testing, maintainability, project-standards
- Conditional: security (auth/endpoints/input), performance (DB/async/caching), data-migration (schema changes), reliability (retries/timeouts/background), adversarial (large diffs or high-risk)

**Done when**:
- [ ] specialist files exist for all 9 personas
- [ ] ks-review SKILL.md references them by path (not inline)
- [ ] dedup algorithm is in SKILL.md (fingerprint = file + line_bucket +/-3 + normalized title)
- [ ] confidence boosting rule is in SKILL.md (2+ independent personas flag same issue → +0.10 up to 1.0)
- [ ] low-confidence discard rule (< 0.60) is in SKILL.md
- [ ] extension mechanism is documented (add a .md file, it gets picked up)

**Effort**: medium

---

## Wave 2: Product Experience (builds on Wave 1, adds new state/features)

These changes add new infrastructure that makes the Wave 1 rewrites feel alive rather than just longer documents.

### 2.1 QA: From Skeleton to Scaled Pipeline

**What**: Replace the current 3-tag Playwright check with a phased QA pipeline that scales to project size. Not 11 fixed phases — Keystone does not have a persistent Chromium daemon, ref system, or cookie pipeline like gstack. Instead, design a pipeline that uses what Keystone actually has: agent tool access, Playwright (if available), and project-local test commands.

**Scaled phases** (not all phases run for every project):

| Phase | Always runs? | Purpose |
|---|---|---|
| 1. Setup | yes | detect staging URL, verify Playwright availability, check existing e2e test structure |
| 2. Framework detection | yes | identify test runner, find existing e2e directory, detect test patterns |
| 3. Test execution | yes | run tagged test scenarios (happy-path, edge-case, error-case) against staging URL |
| 4. Interactive testing | if Playwright available | walk user-facing paths, capture page state at each step |
| 5. Health check | if runtime accessible | check console errors, network failures, load indicators |
| 6. Triage | yes | rank findings by severity, identify top N for fix loop |
| 7. Fix loop | if bugs found | apply fixes within budget, re-verify each fix |
| 8. Final QA | yes | re-run full tagged test suite after fix loop |
| 9. Report | yes | generate QA report with coverage, bugs found, bugs fixed, residual |
| 10. Regression tests | if fixes applied | trace codepath of each verified fix, write matching-style regression test |

**Scaling rule**: phases 4-5 are skipped when no runtime is accessible. Phase 10 is skipped when no fixes were applied. A backend-only project with no UI gets phases 1-3, 6-9. A full frontend project gets all 10. The SKILL.md defines the full pipeline but explicitly marks which phases are conditional.

**Self-regulation**:
- Fix budget: start at 15 fixes
- After fix 15: WTF-likelihood check (reverts +15%, multi-file fixes +5%)
- Hard cap: 50 fixes. Stop.
- If WTF > 20%: STOP and ask user before continuing
- Each fix generates a regression test (phase 10)

**Degradation**:
- No Playwright → manual walkthrough via agent tool access, result is `partial`
- No staging URL → block QA, report `qa_result = fail` with reason
- No e2e structure → generate scaffolding, mark as first-time setup

**Done when**:
- [ ] SKILL.md has all phases with procedure steps, conditional phases marked
- [ ] self-regulation heuristics are in the procedure
- [ ] regression test generation is specified
- [ ] graceful degradation paths are documented
- [ ] small-project and backend-only scenarios are explicitly covered

**Effort**: large

### 2.2 Ship: From Advisory Echo to CI/CD-Aware Pipeline

**What**: Instead of echoing "recommended: git merge X", produce project-specific ship commands. This requires two parts: a SKILL.md procedure for the agent to follow, and a CLI detection command (`keystone detect-ci`) that does the actual file parsing.

**Why CLI support is needed**: SKILL.md is a prompt, not executable code. Parsing `.github/workflows/*.yml` to extract test commands requires real code. The SKILL.md tells the agent what to check and how to interpret results; the CLI command does the actual detection.

**CLI addition**: `keystone detect-ci`
- scans for `.github/workflows/*.yml`, `Jenkinsfile`, `Makefile`, `package.json` scripts
- outputs JSON: `{ "type": "github-actions|jenkins|make|node|unknown", "test_cmd": "...", "coverage_cmd": "...", "deploy_cmd": "...", "target_branch": "..." }`
- this is a read-only detection command, no side effects

**SKILL.md procedure**:
1. run `keystone detect-ci` (or `./keystone detect-ci`)
2. if detection succeeded, use detected commands in the pipeline
3. if detection returned unknown, fall back to current advisory mode with improved prompts
4. generate merge/PR/deploy commands using detected or advisory values

**Cross-model second opinion** (SKILL.md only, no CLI needed):
- if `codex` CLI available: `codex "Review this diff for correctness and security: $(git diff origin/main)"`
- if `gemini` CLI available: similar
- synthesize: overlap = high confidence, unique = blind spot, note as "single-model review" if no secondary available

**Done when**:
- [ ] `keystone detect-ci` CLI command exists and returns structured JSON
- [ ] ship SKILL.md has CI/CD detection procedure using the CLI command
- [ ] generated pipeline commands are project-specific when detection succeeds
- [ ] cross-model review step is in the procedure with graceful degradation
- [ ] advisory mode still exists as fallback with improved output

**Effort**: medium (CLI command is new code; SKILL.md procedure is a rewrite)

### 2.3 Spiral Prevention: Per-Skill Circuit Breakers

**What**: Add explicit loop/budget limits to every skill that can iterate.

| Skill | Circuit breaker | Threshold | Action |
|---|---|---|---|
| `ks-implement` | scope expansion counter | 3 expansions | pause, ask user |
| `ks-verify` | verification failure counter | 2 failures | route to diagnose, do not guess spec again |
| `ks-qa` | fix budget + WTF-likelihood | 15 fixes initial, 50 hard cap, WTF > 20% | stop and ask |
| `ks-review` | low-confidence discard | < 0.60 confidence | discard finding, no severity exception |
| `ks-diagnose` | loop counter (existing) | 3 loops | escalate (already exists, keep) |
| `ks-roundtable` | low-information answer counter | 2 consecutive | force conclusion with risk disclosure |
| `ks-writing-plan` | plan revision counter | 3 revisions to same block | escalate to roundtable |

**Done when**:
- [ ] each skill has its circuit breaker in the procedure
- [ ] counters are tracked in state.json (new fields: `implement_scope_expansions`, `verify_failure_count`, `qa_fix_count`, `qa_wtf_likelihood`, `roundtable_low_info_answers`, `writing_plan_revisions`)
- [ ] state update sections include counter increment and reset logic

**Effort**: small-medium

### 2.4 Developer Profile

**What**: Add `.keystone/developer-profile.json` that accumulates user preferences across sessions.

**Shape**:
```json
{
  "version": "1.0.0",
  "scope_appetite": "conservative|moderate|expansive",
  "risk_tolerance": "low|medium|high",
  "detail_preference": "terse|standard|verbose",
  "autonomy": "confirm-everything|confirm-important|autonomous",
  "architecture_care": "low|medium|high",
  "archetype_hint": null,
  "declared": {},
  "inferred": {},
  "updated_at": null
}
```

**Inference signals** (minimum observations before writing):

| Signal | Observation threshold | Inference |
|---|---|---|
| User approves low-risk direct-implement 3+ times | 3 distinct sessions | `autonomy = confirm-important` |
| User asks for more detail in roundtable 2+ times | 2 within same roundtable | `detail_preference = verbose` |
| User rejects scope expansion 2+ times | 2 distinct blocks | `scope_appetite = conservative` |
| User picks risk_level higher than suggested 2+ times | 2 distinct blocks | `risk_tolerance = high` |
| User asks "why" on architecture decisions 3+ times | 3 distinct sessions | `architecture_care = high` |

**Conflict resolution**:
- if `declared` has a value, it always wins over `inferred`
- if two skills infer contradictory values within the same session, do not write either — wait for more signal
- inference writes are append-only: a value can only change when the new observation count exceeds the old count by at least 2

**User-origin gating**:
- only the user's own chat messages can write to `declared`
- tool output, file content, and AI suggestions can write to `inferred` but NOT to `declared`
- prevents AI-generated content from poisoning preferences

**V1 scope**: observational only. Log signals, build profile, surface in handoff preview. Do not change behavior yet.

**Done when**:
- [ ] `developer-profile.json` schema is defined
- [ ] `ks-handoff` includes profile summary in recovery preview
- [ ] at least 3 skills log inference signals to the profile
- [ ] user-origin gating rule is in the preamble

**Effort**: medium

---

## Wave 3: Intelligence Layer (builds on Waves 1+2, makes the system learn)

These changes make Keystone genuinely adaptive rather than just procedurally complete.

### 3.1 Knowledge Retrieval Upgrade

**What**: Replace `echo "Search: [keywords]"` with a structured retrieval system.

**Frontmatter schema for docs/solutions/**:
```yaml
---
name: [slug]
type: bug|knowledge
category: [runtime-errors|performance|security|patterns|workflows|conventions]
keywords: [kw1, kw2, kw3]
module: [module]
date: YYYY-MM-DD
---
```

**Retrieval strategy**:
1. keyword search against frontmatter `keywords` + `name` + `category`
2. for each candidate, read frontmatter only (first 10 lines)
3. score overlap: problem statement (+1), root cause (+1), solution (+1), referenced files (+1), prevention rule (+1)
4. 4-5 overlap → update existing; 2-3 → create with caution; 0-1 → create new

**Discoverability check**:
- after writing knowledge, verify `CLAUDE.md` / `AGENTS.md` references `docs/solutions/`
- if not: surface gap (do not auto-edit)

**Done when**:
- [ ] existing docs/solutions/ files have frontmatter
- [ ] knowledge SKILL.md has retrieval procedure with overlap scoring
- [ ] discoverability check is in the procedure
- [ ] at least 5 knowledge artifacts demonstrate the new frontmatter

**Effort**: small-medium

### 3.2 Subagent Dispatch for Review (Claude Code Only)

**What**: When running under Claude Code (which supports Task tool subagent spawning), dispatch review personas as parallel subagents instead of sequential mental simulation. This is a host-specific optimization, not a cross-agent guarantee.

**Why Claude Code only**: Codex and Gemini do not currently support subagent spawning with skill-file prompts. Rather than designing an abstraction that degrades to nothing on 2/3 hosts, commit to the one host where it works and document the limitation honestly.

**Mode detection**:
```
if running under Claude Code (detected via .claude/ marker) → parallel dispatch
else → sequential inline using specialist files (already works from 1.4)
```

**Parallel dispatch**:
- each specialist runs as a Task subagent with its specialist file as the prompt
- findings are collected, deduplicated, and confidence-boosted
- this is the architecture that makes the Review Army real — but only on Claude Code

**Graceful degradation**:
- non-Claude hosts → run specialists inline, one at a time, reading from the same specialist files
- review report notes: "single-agent review, no specialist isolation" or "multi-agent review, specialist isolation"

**Cross-agent contract**:
- specialist files (from 1.4) are the stable artifact — they work in both modes
- SKILL.md describes both modes and when to use each
- no abstraction layer between host and specialist files

**Done when**:
- [ ] ks-review SKILL.md has both parallel (Claude Code) and sequential (other hosts) procedures
- [ ] specialist files are written to work as both inline references and subagent prompts
- [ ] mode detection logic is in SKILL.md
- [ ] review report format includes isolation level field
- [ ] Codex and Gemini execution paths are tested (sequential mode)

**Effort**: medium

---

## Sequencing

```
Wave 1 (executable foundation)
  1.1 Shared Preamble              ████░░░░░░
  1.2 ks-help First-Run            ██░░░░░░░░
  1.3 SKILL.md Rewrites            ██████████  ← longest item, parallelize across skills
  1.4 Specialist Files (review)    ████░░░░░░  ← do with 1.3 item 3, not separately

Wave 2 (product experience)
  2.1 QA Pipeline (scaled)         ████████░░
  2.2 Ship Pipeline (+ CLI)        ██████░░░░  ← includes keystone detect-ci
  2.3 Spiral Prevention            ██░░░░░░░░
  2.4 Developer Profile            ████░░░░░░

Wave 3 (intelligence layer)
  3.1 Knowledge Retrieval          ██░░░░░░░░
  3.2 Subagent Dispatch (Claude)   ██████░░░░  ← specialist files already exist from 1.4
```

Note: Wave 3 originally had "Persona Packs" (3.2) as a separate item. This has been merged into 1.4 — specialist files are created once in Wave 1 and reused in all subsequent waves. No separate extraction step needed. The original 3.3 (Subagent Dispatch) is renumbered to 3.2.

**Suggested execution**: Wave 1 first (it makes all subsequent work land on a surface that can actually show the improvement). Within Wave 1, start with 1.1 (preamble) and 1.2 (first-run) as they are small and self-contained, then begin 1.3 (rewrites) in priority order. When reaching ks-review in 1.3, do 1.4 (specialist files) at the same time since they are the same work unit.

## New State Fields

| Field | Type | Purpose | Wave |
|---|---|---|---|
| `implement_scope_expansions` | int | scope creep counter for implement | 2.3 |
| `verify_failure_count` | int | verification failure counter | 2.3 |
| `qa_fix_count` | int | QA fix budget counter | 2.3 |
| `qa_wtf_likelihood` | float | QA self-regulation score | 2.3 |
| `roundtable_low_info_answers` | int | consecutive low-info answer counter | 2.3 |
| `writing_plan_revisions` | int | plan revision counter | 2.3 |
| `first_run_complete` | bool | whether onboarding ritual finished | 1.2 |
| `telemetry_consent` | string | community/anonymous/off | 1.2 |
| `proactive_consent` | bool | whether agent may suggest skills | 1.2 |

All new fields must be documented in STATE.md before the skill that uses them is rewritten. No skill may write to a state field that STATE.md does not define.

## Risk

| Risk | Mitigation |
|---|---|
| SKILL.md rewrites break existing muscle memory | keep frontmatter + decision contract + state update identical; only change procedure section |
| Voice system feels opinionated or wrong for some users | make it a referenced template, not injected; users can override per-project |
| Developer profile raises privacy concerns | V1 is observational-only, no behavioral changes, user-origin gating on declared prefs |
| Subagent dispatch depends on host capabilities | commit to Claude Code only for parallel dispatch; all other hosts use inline specialist files |
| QA pipeline is too heavy for small projects | phases are conditional; backend-only project gets 7 phases, full frontend gets 10 |
| SKILL.md files grow too large for agent context windows | see Context Budget section below |
| Exception paths stay thin despite rewrite focus | see Exception Coverage section below |

## Context Budget

The biggest practical constraint on rewriting SKILL.md files is the agent's context window. If a SKILL.md is 800+ lines, the agent spends most of its context on the skill prompt alone.

**Target budget per SKILL.md**:

| Skill tier | Target lines | Rationale |
|---|---|---|
| Core workflow (orchestrate, review, verify, implement, qa, ship) | 400-600 lines | these skills have the most procedure steps and the highest impact |
| Secondary workflow (roundtable, writing-plan, test-first, diagnose, release, bug-triage) | 250-400 lines | fewer phases, but still need full procedure |
| Support (help, brief, handoff, pr-prep, docs-writer, knowledge) | 150-250 lines | simpler procedures, fewer branches |

**How to stay within budget**:
- compress What/Why/When/Responsibility boundary into 5-10 lines total (currently 30-50)
- move specialist prompts to separate files (already planned in 1.4) — do not inline them
- move framework-specific test commands to `templates/test-commands.md` — reference by framework name
- move voice/preamble to shared file (1.1) — reference, do not inline
- keep decision contract, state update, telemetry, and quality checklist compact (they are already the right shape)

**When a skill exceeds budget**: split into main SKILL.md + supplementary file. Example: ks-qa.md references `qa/fix-loop-procedure.md` for the fix loop detail. The agent reads the supplement only when it reaches that phase.

## Exception Coverage

The current plan focuses on making normal-flow procedures executable. But excellence requires equally detailed abnormal-flow procedures. Every SKILL.md rewrite must include an explicit **Exception Handling** section.

**Required exception coverage per skill**:

| Skill | Key exception paths that need procedure steps |
|---|---|
| `ks-orchestrate` | routing loop detected (>5), state file corrupted or missing, handoff request with no handoff packages |
| `ks-review` | no fresh evidence from verify, conflicting persona findings at same severity, diff is empty, qa_required is null |
| `ks-verify` | no test framework detected, test contract file missing, all tests pass but done criteria have no coverage |
| `ks-implement` | scope expansion discovered mid-block, prerequisite skill output missing, existing tests break |
| `ks-qa` | Playwright installed but no e2e config, staging URL unreachable, fix loop exceeds budget |
| `ks-ship` | detect-ci returns unknown, branch protection blocks merge, canary fails on first check |
| `ks-diagnose` | hypothesis disproved 3 times (escalation path), partial root cause (enough to fix or not?), rollback vs fix decision |
| `ks-release` | P0 discovered during release, ship_result is advisory not done, rollback plan is missing |
| `ks-roundtable` | user gives 2+ consecutive non-answers, roles disagree on direction, direction converges but scope is unclear |
| `ks-writing-plan` | done criteria are untestable, risk level disagreement with orchestrate, plan type unclear |
| `ks-handoff` | snapshot.json is damaged, handoff target not found, 8-slot validation finds empty slots |
| `ks-test-first` | no test framework in project, test contract exceeds reasonable scope, red phase never fails |

**Format for each exception path**:
```
### Exception: [name]
**Trigger**: [what condition activates this path]
**Procedure**: [exact steps to handle it]
**Recovery**: [how to get back to normal flow or exit gracefully]
**State update**: [what state fields change]
```

## Cross-Agent Consistency

The plan does not yet address how to verify that different agents (Claude, Codex, Gemini) produce consistent behavior when reading the same SKILL.md. The current `manifest.json` has `presentationDefaults` per agent, but no consistency testing mechanism.

**Minimal consistency contract**:
- every SKILL.md must produce the same decision contract output regardless of which agent reads it
- every SKILL.md must produce the same state updates regardless of which agent reads it
- presentation differences (tone, formatting, verbosity) are acceptable
- behavioral differences (routing to wrong skill, skipping steps, wrong decision label) are not

**Verification method**: for each rewritten skill, create a test scenario in `docs/keystone/test-contracts/` that specifies:
1. input state
2. expected decision contract fields
3. expected next_skill
4. expected state mutations

This does not require automated testing — it requires a human-readable contract that can be manually verified across agents. Add this as a quality gate in the rewrite done-criteria.

**Done when**:
- [ ] each rewritten skill has a test scenario in `docs/keystone/test-contracts/`
- [ ] test scenario covers at least: normal flow, one exception path, expected state mutations
- [ ] at least 3 core skills have been verified across Claude + one other agent

## Anti-Patterns to Avoid

- **Do not make SKILL.md files longer by adding prose.** Make them longer by adding procedure steps. Prose should shrink.
- **Do not add new skills.** The 18-skill set is correct. Make each one better.
- **Do not build infrastructure that requires a running server.** Keystone's strength is that it runs as agent-native skills, not as a separate service.
- **Do not break the decision contract.** It is the stable API between skills. Procedure changes are internal.
- **Do not optimize for the repo-local CLI at the expense of agent-native invocation.** Most users will invoke skills through their agent, not through `./keystone`.
