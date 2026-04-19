# Keystone Agent Implementation

This document answers a practical implementation question:

> How do Claude, Codex, and Gemini deliver different host experiences without letting Keystone semantics drift?

It is not an installation guide and not a methodology overview.

## Current Priority Order

At the current stage, Keystone implementation should prioritize:

1. skill semantic consistency
2. public entry-name consistency
3. Decision Contract consistency
4. host-specific invocation adaptation
5. CLI as support, not as the primary definition source

This means:

- skills are the product surface
- distribution and CLI are support layers
- host-level convenience should never rewrite skill boundaries

## What Must Stay Consistent

### 1. Skill role and boundary

Examples:

- `help` stays onboarding and does not become a second `orchestrate`
- `brief` compresses input and does not replace `roundtable`
- `bug-triage` classifies and does not replace `diagnose`
- `pr-prep` packages delivery context and does not replace `release`
- `docs-writer` organizes factual docs and does not replace `knowledge`

If a host changes those boundaries for convenience, that is not host adaptation. It is a different workflow.

### 2. Decision Contract

These fields must keep the same meaning across hosts:

- `decision`
- `confidence`
- `rationale`
- `fallback`
- `escalate`
- `next_skill`
- `next_action`

Hosts may change presentation, but not the semantics.

### 3. Mainline and rollback relationships

These should not drift by host:

- `verify -> review`
- `verify fail_bug -> diagnose`
- `verify fail_spec -> writing-plan`
- `review pass -> qa? / ship`
- `release -> knowledge`

### 4. Public skill names

Public names should stay stable:

- `help`
- `brief`
- `bug-triage`
- `orchestrate`
- `roundtable`
- `writing-plan`
- `test-first`
- `implement`
- `verify`
- `review`
- `pr-prep`
- `qa`
- `ship`
- `release`
- `docs-writer`
- `knowledge`
- `handoff`

Hosts may expose them differently, but the names should not fork.

## What May Be Adapted

### 1. Entry shape

- Claude: `/ks-*`
- Codex: `/ks-*`
- Gemini: `/ks-*`

The real difference is usually how the host exposes the entry, not what it is called.

### 2. Output wrapping

The same skill may use:

- different tone
- different framing
- different host integration surfaces

But the core structure and exit semantics should remain stable.

### 3. Helper-tool dependencies

Examples:

- one host may surface slash commands more naturally
- one host may call local CLI flows more easily
- one host may load files more directly through the skill bundle

Those are valid host adaptations, but they should not become part of the skill protocol itself.

## Recommended Implementation Order

Implementation should usually proceed in this order:

1. define the core skill
2. define cross-host input/output consistency
3. adapt the host entry layer
4. add CLI and distribution polish

If the order is reversed, you get:

- one host with a polished experience
- other hosts with a "close enough" implementation
- no stable shared semantic layer underneath

## Host Adaptation Checklist

When adding a new skill, answer these:

1. Did the semantics drift?
2. Did `next_skill` drift?
3. Did the "does not replace X" boundary drift?
4. Can users still find the same public skill names across hosts?
5. Are host-specific invocation differences documented back into the skill when needed?
6. Do high-frequency skills include a stable minimal output example?
7. Did the closeout-stage skills stay just as disciplined as the front-half skills?

## Recommended Update Points

When implementing or adapting a host surface, keep these in sync:

- `keystone.manifest.json`
- `README.md`
- `docs/decision-matrix.md`
- the relevant `SKILL.md`
- this document

Do not only change the host entry surface while leaving the shared protocol explanation stale.

## Manifest Conventions

`keystone.manifest.json` can now express host-facing metadata such as:

- `agentFacing.primaryEntrySkills`
- `agentFacing.highFrequencySkills`
- `agentFacing.closeoutSkills`
- `agentFacing.recommendedByIntent`
- `agentFacing.menuOrder`
- `agentFacing.presentationDefaults`
- per-skill `entry_class`
- per-skill `class_priority`

This metadata does not replace `SKILL.md`. It gives hosts a shared categorization source instead of separate hand-written menu logic.

In particular:

- `recommendedByIntent` answers which skill should be recommended first
- `menuOrder` answers how sections should be exposed
- `presentationDefaults` answers which sections and invocation styles a host should prefer
- `entry_class` answers which layer the skill belongs to
- `class_priority` answers which skill leads within that class

Boundary rules:

- `menuOrder` is the authority for section ordering
- `class_priority` is not a global sort
- section rendering should look at `menuOrder` first
- ad hoc same-class lists should look at `entry_class + class_priority`
