# Keystone vNext Roadmap

This roadmap is a compact English rewrite of the active Keystone vNext direction.

## North Star

Keystone should feel less like a personal workflow bundle and more like a shareable, installable workflow product with a clear public entry path, stronger closeout discipline, and better host consistency.

## Non-Goals

- replacing existing host products with a fully separate Keystone app
- shipping marketplace distribution before the install and runtime model is stable
- adding more skills before the current ones are easier to discover and trust

## Current Block

Make Keystone easier to enter, easier to trust, and easier to ship across hosts without compromising the workflow contract.

## Plan Type

`full-plan`

## Direction Source

This roadmap reflects the current Keystone product direction after the English-first and OSS-readiness migration work.

## Scope

### Included

- better first-run entry surfaces
- higher-quality direct-entry skills
- clearer golden paths
- stronger team policy overlay
- better install, upgrade, and doctor experiences
- better templates, examples, and distribution clarity

### Excluded

- a full marketplace launch
- a separate visual product shell
- uncontrolled skill proliferation

## Done Criteria

- entry surfaces are discoverable and coherent
- direct-entry skills reduce friction instead of creating parallel workflows
- delivery closeout is easier to trust
- team policy and distribution guidance are easier to adopt

## Risk Level

- **risk_level**: `medium`
- **Why**: most roadmap work is product-shaping and distribution-shaping rather than deep runtime-contract change, but some changes still affect entry semantics and install behavior

## TDD Routing

- **Default next skill**: `writing-plan` for each concrete roadmap slice

## QA Expectation

- **qa_required**: `false`
- **Why**: roadmap items mostly need planning, docs, and product-surface verification rather than browser QA by default

## Technical Decisions

- keep the core skill contract stable
- prioritize discoverability and trust before adding many new capabilities
- prefer manifest-driven consistency over host-specific drift

## P0: Must-Have Capabilities

### 1. Start Here / Help Layer

- clarify first-run entry points
- make `help` useful without turning it into a routing hub
- keep host entry affordances aligned

### 2. High-Frequency Direct-Entry Skills

- keep `brief`, `bug-triage`, `pr-prep`, and `docs-writer` high quality
- ensure they reduce startup friction without swallowing neighboring responsibilities

### 3. Golden Paths

- keep the common user paths short and memorable
- make stop/continue/rollback decisions obvious

### 4. Team Policy Overlay

- let teams standardize QA, review, release, and handoff requirements without distorting the core workflow

### 5. Install / Upgrade / Doctor Experience

- improve clarity of install paths
- improve doctor recommendations
- make staged payload and runtime layout easier to reason about

## P1: Should-Have Capabilities

### 1. Templates And Scaffolds

- provide more useful working templates
- reduce the cost of producing plans, reviews, and release notes

### 2. Extensible Skill Mechanism

- make extension points clearer without destabilizing the core bundle

### 3. Example Repositories And Cases

- provide stronger concrete examples of Keystone in use

### 4. Team-Versioned Distribution

- support more explicit team overlays and versioned policy distribution

## P2: Nice-To-Have Capabilities

### 1. Telemetry Visualization

- make routing and outcome telemetry easier to read

### 2. Persona Packs

- make specialized reviewer or decision personas easier to package

### 3. Scenario Packs

- support more opinionated scenario bundles without rewriting the core workflow

## Recommended Sequence

### Phase 1

- entry surfaces
- direct-entry skills
- public docs and examples
- installation clarity

### Phase 2

- team policy overlay
- templates and scaffolds
- stronger examples and case studies

### Phase 3

- telemetry visibility
- extension and packaging improvements
- optional persona/scenario packs

## Suggested Directory Evolution

- keep canonical public docs easy to find
- keep internal planning artifacts separate from public docs
- keep runtime bundle structure aligned with manifest truth

## Next Execution-Card Candidates

- host-facing search and badge metadata
- improved doctor messaging
- stronger example repositories
- team policy versioning

## Next Steps

Turn the next roadmap slice into a focused execution card instead of implementing the roadmap as one giant block.
