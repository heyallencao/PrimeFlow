# PrimeFlow Framework

All PrimeFlow skills follow this framework so the workflow remains consistent, composable, and usable in real team collaboration.

## 0. Core Principles

### Flexible Entry

Tasks may enter from any reasonable stage. PrimeFlow does not require every request to begin at `roundtable`.

### Declared Context

If the task does not start from scratch, the current state, source of truth, and missing context should be declared explicitly.

### Risk-Based Escalation

When risk rises, context is incomplete, or disagreement expands, the workflow should route back to an earlier stage instead of pushing forward blindly.

### Honest Exit

Verification, review, release, and knowledge closeout must remain strict and evidence-based.

### Runtime Note

PrimeFlow's main product is the installed skill package inside the host environment. The CLI is companion tooling for installation, state, handoff, and scaffolding.

The repository-local CLI entry is:

```text
./primeflow ...
```

Implications:

- cross-host skill semantics are the first priority
- the CLI matters, but it is not the only carrier of the PrimeFlow contract
- first-run users should not need to understand shell or `jq` fragments before using PrimeFlow
- shell snippets in this document and in skills remain compatibility examples, not the preferred first-run entry
- the preferred path is to use host-installed skills first and the CLI second

### Cross-Agent Note

Different hosts may expose different entry UX, but these must stay aligned:

- skill names
- skill boundaries
- the Decision Contract
- mainline routing semantics and rollback semantics

For implementation details, see [docs/agent-implementation.md](./docs/agent-implementation.md).

## 1. Frontmatter Format

```yaml
---
name: [skill-name]
description: "[one sentence: what it does + when to use it]"
layer: [layer-name]
owner: [owner-name]
inputs:
  - input_name
outputs:
  - output_name
entry_modes:
  - from-scratch
  - aligned-offline
---
```

Rules:

- `name` should match the skill directory name
- `description` should tell users when to call the skill
- `layer` should be one of `orchestration`, `decision`, `execution`, `operation`, or `support`

## 2. Decision Contract

Every skill should end with a stable decision payload:

```yaml
**decision**: [stable kebab-case label such as review-pass / block-defined / qa-pass]
**confidence**: [0.0-1.0 self-assessed confidence]
**rationale**: [2-3 sentences]
**fallback**: [what to do if the decision cannot hold]
**escalate**: [true or false]
**next_skill**: [next skill name]
**next_action**: [one concrete next action]
```

Rules:

- keep `decision` stable and machine-friendly
- put semantic detail in `rationale`, not inside `decision`
- avoid vague values such as "pending" or "continue"

### Additional Context For Non-Scratch Tasks

When the task does not enter as `from-scratch`, the skill should usually also expose:

```yaml
**entry_mode**: [from-scratch / aligned-offline / plan-ready / build-ready / release-ready / incident]
**source_of_truth**: [PRD / issue / meeting outcome / offline discussion / existing code]
**risk_level**: [low / medium / high]
```

### Escalation Heuristics

| Situation | escalate |
|---|---|
| decision is clear and bounded | false |
| user must participate in a direction tradeoff | true |
| new unapproved risk appears | true |
| `diagnose` still has no root cause after 3 loops | true |

## 3. Skill Preamble

Every skill should begin by checking the current state. Prefer the PrimeFlow CLI instead of exposing raw `jq` as the default entry:

```bash
_CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch: $_CURRENT_BRANCH"

_PENDING=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Pending changes: $_PENDING"

if [ -f ".primeflow/state.json" ]; then
  _CURRENT_STAGE=$(./primeflow state get current_stage 2>/dev/null | tr -d '"')
  _LAST_SKILL=$(./primeflow state get last_skill 2>/dev/null | tr -d '"')
  _ENTRY_MODE=$(./primeflow state get entry_mode 2>/dev/null | tr -d '"')
  _RISK_LEVEL=$(./primeflow state get risk_level 2>/dev/null | tr -d '"')
  echo "Current stage: $_CURRENT_STAGE"
  echo "Last skill: $_LAST_SKILL"
  echo "Entry mode: $_ENTRY_MODE"
  echo "Risk level: $_RISK_LEVEL"
fi
```

Compatibility notes:

- inside the PrimeFlow repo, prefer `./primeflow`
- if you need the explicit Node path, use `node bin/primeflow.mjs`
- if PrimeFlow is vendored under a `PrimeFlow/` directory, use `./PrimeFlow/primeflow`
- legacy shell and `jq` snippets remain acceptable migration examples

### Entry Contract Triggering

- low-risk, well-bounded tasks may use a compact entry summary
- medium-risk tasks should usually include a short entry contract
- high-risk tasks, multi-party work, cross-stage entry, or release work should include the full entry contract

### Risk Level Ownership

`risk_level` is assigned by default in `orchestrate` and written into `.primeflow/state.json`.

Later skills may adjust it, but they must:

- explain the reason
- update state accordingly

Default guidance:

| Risk level | Typical shape |
|---|---|
| `low` | copy/config tweaks, internal script changes, small fixes with no behavior change |
| `medium` | ordinary feature work, interface changes, bounded implementation tasks |
| `high` | user-path changes, data changes, release work, incidents, multi-party high-impact changes |

## 4. State File

The state file, field definitions, and handoff protocol are defined in [STATE.md](./STATE.md). Treat `STATE.md` as the authority for state structure.

## 5. Exception Routing

### `verify` routes

| verify result | route |
|---|---|
| pass | review |
| fail_spec | writing-plan |
| fail_bug | diagnose |

### `diagnose` routes

| diagnose result | route |
|---|---|
| root cause found | implement |
| rollback needed | ship |
| unknown after 3 loops | escalate=true |

### `review` routes

| review result | route |
|---|---|
| pass | `qa` when runtime validation is required, otherwise `ship` |
| pass_with_risks | `qa` when runtime validation is required, otherwise `ship` with explicit disclosure |
| blocked | `implement` or, when direction is no longer clear, `roundtable` |

### `qa` activation

| Condition | Enter `qa`? |
|---|---|
| user path, browser interaction, or critical integration path exists | yes |
| frontend feature or high-risk runtime behavior | yes |
| internal script, small refactor, or non-interactive backend fix | no, may route directly to `ship` with disclosure in `release` |

`qa_required` uses:

- `true`: must enter `qa`
- `false`: `qa` not required

## 6. Layer Contract

PrimeFlow is built around five layers:

- `orchestration`: route and recover
- `decision`: converge, compress, formalize, and gate
- `execution`: lock, implement, verify, diagnose
- `operation`: validate runtime, ship, release
- `support`: onboard, document, compound knowledge

The workflow should feel flexible at entry and strict at closeout.

## 7. Design Intent

PrimeFlow intentionally:

- keeps a clear mainline without forcing all work to start at step one
- defaults to `test-first`, while preserving bounded low-risk exceptions
- puts its hardest constraints at `verify`, `review`, and `release`
- treats `qa` as conditional closeout instead of mandatory ceremony
- treats `knowledge` as lightweight compounding instead of documentation tax

In one line:

> Flexible entry, honest exit.
