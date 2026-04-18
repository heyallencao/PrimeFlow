# PrimeFlow Agent Compatibility Matrix

This document does not define a new protocol.

It answers one question:

> Is `primeflow.manifest.json` already strong enough to generate consistent entry surfaces across Claude, Codex, and Gemini?

Consistency here does not mean identical UI. It means:

- recommendation logic stays aligned
- section grouping stays aligned
- public skill names and ordering stay aligned
- invocation differences come from host capability, not from a different workflow

## Current Conclusion

With the current manifest, PrimeFlow can already express:

- intent-to-skill recommendation through `recommendedByIntent`
- section-level ordering through `menuOrder`
- agent presentation defaults through `presentationDefaults`
- shared skill grouping through `entry_class`
- stable within-group ordering through `class_priority`

That means host integrations no longer need to invent their own entry taxonomy.

This matrix does not replace real host validation. Before release, Claude, Codex, and Gemini should still each run a real `/pf-help` or equivalent public entry.

## Claude

### Expected Consumption

- invocation style: `slash-command`
- highlighted sections:
  - `primaryEntry`
  - `highFrequency`
  - `closeout`

### Entry Example

```text
Primary Entry:
- /pf-help
- /pf-orchestrate
- /pf-handoff

High Frequency:
- /pf-help
- /pf-brief
- /pf-bug-triage
- /pf-pr-prep
- /pf-docs-writer

Closeout:
- /pf-review
- /pf-pr-prep
- /pf-ship
- /pf-release
- /pf-docs-writer
- /pf-knowledge
```

### Consistency Read

- Claude can use slash commands as the main interaction surface
- `help` still only recommends entry; it does not own formal routing
- `orchestrate` remains the routing hub and should not be disguised as the only valid entry

## Codex

### Expected Consumption

- invocation style: `slash-command`
- highlighted sections:
  - `primaryEntry`
  - `highFrequency`
  - `mainline`

### Entry Example

```text
Primary Entry:
- /pf-help
- /pf-orchestrate
- /pf-handoff

High Frequency:
- /pf-brief
- /pf-bug-triage
- /pf-pr-prep
- /pf-docs-writer

Mainline:
- /pf-orchestrate
- /pf-roundtable
- /pf-writing-plan
- /pf-test-first
- /pf-implement
- /pf-verify
- /pf-review
- /pf-qa
- /pf-ship
- /pf-release
- /pf-knowledge
```

### Consistency Read

- Codex now uses `/pf-*` directly like Claude
- `mainline` ordering comes from `menuOrder`
- same-class fallback ordering can use `entry_class + class_priority`

## Gemini

### Expected Consumption

- invocation style: `slash-command`
- highlighted sections:
  - `primaryEntry`
  - `highFrequency`
  - `mainline`

### Consistency Read

- Gemini currently follows the same `/pf-*` contract as Codex
- if Gemini later wants different highlighted sections, `presentationDefaults` should change before any skill semantics change

## Current Protocol Boundary

This matrix also confirms a few boundaries:

- `recommendedByIntent` handles recommendation, not section ordering
- `menuOrder` is the authority for section-level ordering
- `class_priority` only matters within the same `entry_class`
- agent display differences should be expressed through `presentationDefaults`

## Not Yet Defined

This protocol is sufficient for entry presentation, but it does not yet define:

- host-side search keywords
- short titles, badges, or icons per skill
- separate display copy for beginners versus power users

Those can be added later without changing the workflow contract.
