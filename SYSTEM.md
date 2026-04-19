# Keystone System Architecture

> If this is your first contact with Keystone, read [README.md](./README.md) and [docs/walkthrough.md](./docs/walkthrough.md) first. This file is for readers who want the workflow layers, state flow, and routing rules.

## System Positioning

Keystone is a workflow skill framework for real delivery work. It keeps a clear mainline, allows flexible entry, and holds a high closeout standard at verification, review, QA, ship, and release.

The external product model has three layers:

- skill package: the Keystone skills themselves
- distribution layer: installation, host integration, and aliases
- companion tooling: the `keystone` CLI

Keystone is not trying to stitch unrelated systems together. It is trying to define one coherent operating model:

- it cares about real delivery loops without becoming infrastructure-heavy
- it cares about knowledge compounding without turning into documentation overhead
- it cares about engineering discipline without forcing every task into the same linear entry

Its core idea is not "always start from the beginning." It is:

- allow entry from any valid stage
- accept converged offline conclusions as valid input
- keep verification, review, and release honest

> Flexible entry, honest exit.

## Layered Architecture

```text
Layer 5: Orchestration
- orchestrate: entry judgment, global routing, state management
- handoff: session transfer, recovery preview, handoff record lookup

Layer 4: Decision
- roundtable: brainstorm / align / challenge
- brief: task compression before formal planning
- writing-plan: full-plan / delta-plan / execution-card
- review: multi-persona review with confidence gating

Layer 3: Execution
- test-first: default behavior locking
- implement: bounded execution of the current block
- verify: evidence collection
- diagnose: root-cause investigation
- bug-triage: spec gap vs implementation bug vs rollback candidate

Layer 2: Operation
- qa: conditional real runtime validation
- pr-prep: reviewer-ready PR closeout context
- ship: delivery execution and pre-release checks
- release: honest release closeout

Layer 1: Support
- help: first-run entry
- docs-writer: stable documentation drafting
- knowledge: retrieve, update, create, refresh
```

## Main Workflow

### Standard delivery path

```text
roundtable -> writing-plan -> test-first -> implement -> verify -> review -> qa? -> ship -> release -> knowledge
```

### Flexible entry paths

```text
aligned-offline -> writing-plan -> test-first / implement
plan-ready -> test-first / implement
build-ready -> verify -> review
release-ready -> qa? / ship / release when verify/review evidence already exists
incident -> diagnose -> implement / rollback
```

### Exception loops

```text
verify finds a bug -> diagnose -> implement -> verify
verify finds a spec problem -> writing-plan
review blocks -> implement or roundtable
ship canary fails -> diagnose -> implement -> ship
knowledge completes -> wait for the next task
```

## Entry Modes

`orchestrate` decides the entry mode first and routes from there:

| entry mode | meaning | default next skill |
|---|---|---|
| `from-scratch` | new work still needs exploration and convergence | `roundtable` |
| `aligned-offline` | the direction already exists and needs formalization | `writing-plan` |
| `plan-ready` | the plan exists and execution should begin | `test-first` or `implement` |
| `build-ready` | code exists and evidence is missing | `verify` |
| `release-ready` | closeout is near and final evidence paths remain | `qa? / ship / release` |
| `incident` | production failure or abnormal behavior | `diagnose` |

### `plan-ready` selection

- if behavior, interface, data, or user paths change, default to `test-first`
- if the work is a low-risk config/copy/no-behavior fix, direct `implement` may be acceptable
- if execution reveals underestimated risk, raise `risk_level` and route back to `test-first` or `writing-plan`

## State Flow Between Skills

```text
orchestrate
  -> entry contract
  -> roundtable
  -> writing-plan
  -> test-first
  -> implement
  -> verify
  -> review
  -> qa
  -> ship
  -> release
  -> knowledge
```

Key semantics:

- `orchestrate` decides how the task enters
- `roundtable` converges direction
- `writing-plan` defines the current executable block
- `test-first` locks behavior before implementation when required
- `verify` collects fresh evidence
- `review` is the formal gate
- `qa` is conditional, not universal
- `release` is where disclosure becomes explicit

## Minimum Acceptance Paths

These are protocol-level validation paths, not mandatory paths for every task:

1. `from-scratch`: `roundtable -> writing-plan -> test-first -> implement -> verify -> review -> release`
2. `aligned-offline`: `writing-plan -> test-first -> implement -> verify -> review -> release`
3. `plan-ready low risk`: `implement -> verify -> review -> release`
4. `plan-ready high risk`: `test-first -> implement -> verify -> review -> release`
5. `build-ready`: `verify -> review -> ship`
6. `release-ready`: `qa? / ship / release` when verify/review evidence already exists

Each path should confirm:

- entry-mode judgment is correct
- the entry contract was triggered at the right strength
- closeout logic stays coherent

## Capability Strategy

| capability | default implementation | fallback |
|---|---|---|
| browser testing | Playwright-based automation | manual validation |
| browser automation | project-local automation | manual confirmation |
| pre-ship checklist | Keystone checklist | simplified checklist |
| knowledge | Keystone retrieval/update loop | text-only fallback |
| persona review | Keystone multi-persona review | single-persona fallback |

## Handoff Design

Keystone handoff is not just a note for the next session. It is a minimal recoverable package:

- `handoff.md`: the human-readable 8-slot package
- `snapshot.json`: structured state for routing and recovery
- `handoff_id`: the explicit recovery handle

Why both artifacts exist:

- state alone can tell the next session where it was, but not always what to do
- natural-language summary alone is unstable for routing recovery

Recovery rules:

- never auto-load the latest handoff silently
- restore only after an explicit `handoff in`
- show a recovery preview before execution resumes

Responsibility split:

- `handoff` owns package creation, restore preview, and record lookup
- `orchestrate` only detects that the request is a handoff request and routes there

## Design Intent

Keystone intentionally:

- keeps a clear mainline without forcing every task to start at the same first step
- defaults to `test-first` while preserving bounded low-risk exceptions
- puts the hardest requirements at `verify`, `review`, and `release`
- keeps `qa` conditional
- keeps `knowledge` lightweight
