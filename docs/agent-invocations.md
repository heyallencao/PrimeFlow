# PrimeFlow Agent Invocations

This document answers one question:

> How should users call the same PrimeFlow skill in different hosts?

It does not define skill semantics. Each `SKILL.md` does that.

## Invocation Principles

Across hosts, keep these stable:

- the skill name
- the skill boundary
- the mainline meaning of the next step

Under the current frozen contract, all three hosts use `/pf-*`.

If a host wants menus or first-run recommendations, it should read:

- `agentFacing.recommendedByIntent`
- `agentFacing.menuOrder`
- `agentFacing.presentationDefaults`
- each skill's `entry_class`
- each skill's `class_priority`

Do not reinvent a separate host-only intent-to-skill map.

## Primary Entry Set

The current primary entry trio is:

- `pf-help`
  when the user does not know where to start
- `pf-orchestrate`
  when PrimeFlow should formally determine entry mode and the next step
- `pf-handoff`
  when the user wants to pause, restore, or switch sessions

Those distinctions should stay explicit:

- `pf-help` = recommend an entry
- `pf-orchestrate` = route formally
- `pf-handoff` = freeze or restore execution context

Do not merge them into one vague super-entry in any host.

## Claude

Claude currently fits `/pf-*` directly.

Examples:

```text
/pf-help
/pf-orchestrate
/pf-writing-plan
/pf-review
```

```text
/pf-help
I want to add a notification toggle to an existing settings page, but I am not sure which PrimeFlow skill should handle it first.
```

```text
/pf-bug-triage
Production payment callbacks are failing intermittently. Classify whether this looks like a spec problem, an implementation bug, or a rollback candidate.
```

## Codex

Codex also uses `/pf-*` directly.

Examples:

```text
/pf-help
```

```text
/pf-brief Compress the background below into a one-page brief.
```

```text
/pf-pr-prep Turn this round of work into reviewer-ready PR context.
```

Installation notes:

- the shared runtime lives in `~/.primeflow/runtime/PrimeFlow`
- Codex reads `~/.agents/skills/pf-*/SKILL.md` directly
- PrimeFlow does not mount a separate `~/.codex/skills/PrimeFlow` skill tree, which avoids duplicate entries
- restart Codex after installation so it rescans skills

## Gemini

Gemini also uses `/pf-*` directly.

Examples:

```text
/pf-orchestrate Determine which entry mode this task should use.
```

```text
/pf-docs-writer Compress the result of this round into a maintainer note.
```

## Cross-Host Skill Reference

### `help`

- Claude: `/pf-help`
- Codex: `/pf-help`
- Gemini: `/pf-help`

### `brief`

- Claude: `/pf-brief`
- Codex: `/pf-brief`
- Gemini: `/pf-brief`

### `bug-triage`

- Claude: `/pf-bug-triage`
- Codex: `/pf-bug-triage`
- Gemini: `/pf-bug-triage`

### `pr-prep`

- Claude: `/pf-pr-prep`
- Codex: `/pf-pr-prep`
- Gemini: `/pf-pr-prep`

### `docs-writer`

- Claude: `/pf-docs-writer`
- Codex: `/pf-docs-writer`
- Gemini: `/pf-docs-writer`

### `orchestrate`

- Claude: `/pf-orchestrate`
- Codex: `/pf-orchestrate`
- Gemini: `/pf-orchestrate`

## Practices To Avoid

- renaming a skill for one host
- letting `help` become the routing authority
- letting `orchestrate` absorb every first-run entry
- letting `brief` replace `roundtable`
- letting `pr-prep` become a release decision tool

## Maintenance Notes

Whenever a new high-frequency direct-entry skill is added, update:

- `primeflow.manifest.json`
- `README.md`
- `docs/agent-implementation.md`
- this document
