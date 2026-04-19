# Keystone Agent Invocations

This document answers one question:

> How should users call the same Keystone skill in different hosts?

It does not define skill semantics. Each `SKILL.md` does that.

## Invocation Principles

Across hosts, keep these stable:

- the skill name
- the skill boundary
- the mainline meaning of the next step

Under the current frozen contract, all three hosts use `/ks-*`.

If a host wants menus or first-run recommendations, it should read:

- `agentFacing.recommendedByIntent`
- `agentFacing.menuOrder`
- `agentFacing.presentationDefaults`
- each skill's `entry_class`
- each skill's `class_priority`

Do not reinvent a separate host-only intent-to-skill map.

## Primary Entry Set

The current primary entry trio is:

- `ks-help`
  when the user does not know where to start
- `ks-orchestrate`
  when Keystone should formally determine entry mode and the next step
- `ks-handoff`
  when the user wants to pause, restore, or switch sessions

Those distinctions should stay explicit:

- `ks-help` = recommend an entry
- `ks-orchestrate` = route formally
- `ks-handoff` = freeze or restore execution context

Do not merge them into one vague super-entry in any host.

## Claude

Claude currently fits `/ks-*` directly.

Examples:

```text
/ks-help
/ks-orchestrate
/ks-writing-plan
/ks-review
```

```text
/ks-help
I want to add a notification toggle to an existing settings page, but I am not sure which Keystone skill should handle it first.
```

```text
/ks-bug-triage
Production payment callbacks are failing intermittently. Classify whether this looks like a spec problem, an implementation bug, or a rollback candidate.
```

## Codex

Codex also uses `/ks-*` directly.

Examples:

```text
/ks-help
```

```text
/ks-brief Compress the background below into a one-page brief.
```

```text
/ks-pr-prep Turn this round of work into reviewer-ready PR context.
```

Installation notes:

- the shared runtime lives in `~/.keystone/runtime/Keystone`
- Codex reads `~/.agents/skills/ks-*/SKILL.md` directly
- Keystone does not mount a separate `~/.codex/skills/Keystone` skill tree, which avoids duplicate entries
- restart Codex after installation so it rescans skills

## Gemini

Gemini also uses `/ks-*` directly.

Examples:

```text
/ks-orchestrate Determine which entry mode this task should use.
```

```text
/ks-docs-writer Compress the result of this round into a maintainer note.
```

## Cross-Host Skill Reference

### `help`

- Claude: `/ks-help`
- Codex: `/ks-help`
- Gemini: `/ks-help`

### `brief`

- Claude: `/ks-brief`
- Codex: `/ks-brief`
- Gemini: `/ks-brief`

### `bug-triage`

- Claude: `/ks-bug-triage`
- Codex: `/ks-bug-triage`
- Gemini: `/ks-bug-triage`

### `pr-prep`

- Claude: `/ks-pr-prep`
- Codex: `/ks-pr-prep`
- Gemini: `/ks-pr-prep`

### `docs-writer`

- Claude: `/ks-docs-writer`
- Codex: `/ks-docs-writer`
- Gemini: `/ks-docs-writer`

### `orchestrate`

- Claude: `/ks-orchestrate`
- Codex: `/ks-orchestrate`
- Gemini: `/ks-orchestrate`

## Practices To Avoid

- renaming a skill for one host
- letting `help` become the routing authority
- letting `orchestrate` absorb every first-run entry
- letting `brief` replace `roundtable`
- letting `pr-prep` become a release decision tool

## Maintenance Notes

Whenever a new high-frequency direct-entry skill is added, update:

- `keystone.manifest.json`
- `README.md`
- `docs/agent-implementation.md`
- this document
