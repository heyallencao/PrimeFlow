# Plan: English-First Canonical Foundation

## Plan Type
`delta-plan`

## Direction Source
This plan came from the `ks-roundtable` conclusion that Keystone should not stop at translating the homepage. The target was to move every default public-facing and runtime-facing surface toward English, with Chinese no longer acting as the canonical source for core product behavior.

## Current Block
Establish the English-first canonical foundation so new international users can understand Keystone, install it, and enter the core workflow through the default entry surfaces, while the first critical runtime skills no longer default to Chinese.

## Scope

### Included
- define a canonical language policy: `English-first for canonical surfaces; Chinese only as an optional mirror for human-facing docs`
- rewrite the repository root entry and initial install/onboarding entry
- translate the first minimum viable runtime path into English
- freeze key terminology so later skill migrations do not drift
- define a priority rule for later migration waves based on entry value and runtime impact

### Excluded (Scope Boundaries)
- translating all 18 skills in one batch
- translating every historical draft, roadmap note, and internal analysis file
- keeping bilingual runtime `SKILL.md`
- building a full Chinese mirror site
- deciding npm publishing, site redesign, or branding changes
- building the full collaboration surface in the same block

## Done Criteria
- a language policy doc exists and is referenced from an active public surface
- [README.md](/Users/allen/Workspace/projects/personal/Keystone/README.md), [docs/README.codex.md](/Users/allen/Workspace/projects/personal/Keystone/docs/README.codex.md), and at least one install/quickstart doc are English-first
- the canonical `SKILL.md` files for `ks-help`, `ks-orchestrate`, `ks-writing-plan`, `ks-verify`, and `ks-review` are English while keeping decision labels, state keys, and telemetry semantics stable
- targeted canonical files no longer contain Chinese body text
- `npm run smoke` passes after the migration
- the next migration waves are explicitly identified instead of left vague

## Entry Conditions
- Keystone's default public language is intentionally switching to English
- runtime `SKILL.md` files will remain single-language English
- this block is intentionally the foundation rather than a full-repo big-bang rewrite

## Risk Level
- **risk_level**: `high`
- **Why**: this changes the public product positioning and the default runtime language of core skills, so translation drift could become behavioral drift.

## TDD Routing
- **Default next skill**: `test-first`

## QA Expectation
- **qa_required**: `false`
- **Why**: no browser QA is required, but smoke runs, file scanning, and manual semantic spot checks are required.

## Technical Decisions
- English is the only canonical language for active runtime and public-facing product surfaces
- Chinese belongs in mirror or archive layers, not embedded in runtime prompt assets
- migration should happen by priority waves, not by translating directories indiscriminately
- translation must preserve decision labels, confidence rules, next-skill constraints, state keys, and telemetry schema
- key terminology such as `fresh evidence`, `honest exit`, `entry mode`, and `Decision Contract` should remain stable across waves

## Dependencies
- historical draft: [readme-rewrite-draft.md](/Users/allen/Workspace/projects/personal/Keystone/archive/zh-CN/claude-optimization/readme-rewrite-draft.md)
- historical template: [skill-english-template.md](/Users/allen/Workspace/projects/personal/Keystone/archive/zh-CN/claude-optimization/skill-english-template.md)
- install and smoke entry points: [package.json](/Users/allen/Workspace/projects/personal/Keystone/package.json), [keystone](/Users/allen/Workspace/projects/personal/Keystone/keystone)

## Next Step
**next_skill**: `test-first`
