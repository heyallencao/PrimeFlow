# PrimeFlow for Codex

Guide for using PrimeFlow with Codex through the installed public `pf-*` skills.

## Quick Install

Tell Codex:

```text
Fetch and follow instructions from https://raw.githubusercontent.com/heyallencao/PrimeFlow/refs/heads/main/.codex/INSTALL.md
```

## Manual Installation

```bash
git clone https://github.com/heyallencao/PrimeFlow.git ~/.codex/PrimeFlow
cd ~/.codex/PrimeFlow
./primeflow install --agent codex
```

Then restart Codex.

## First Run

After restart, paste one of these directly into Codex:

```text
/pf-help
```

```text
/pf-orchestrate Route this task from the correct entry mode and choose the smallest safe next step.
```

```text
/pf-brief Compress the context below into a one-page execution brief and recommend the next skill.
```

## Generate Codex Skill Docs

If you want the Codex-facing public skill wrappers directly in the repo, run:

```bash
./primeflow gen skill-docs --agent codex --output ./.agents/skills --force
```

This generates one public `pf-*` skill directory per PrimeFlow entry under `.agents/skills/`.

## How It Works

PrimeFlow installs the public `pf-*` skills to:

- `~/.agents/skills/pf-help`
- `~/.agents/skills/pf-orchestrate`
- `~/.agents/skills/pf-handoff`
- `~/.agents/skills/pf-review`
- ...

It also installs the shared PrimeFlow runtime to:

- `~/.primeflow/runtime/PrimeFlow`

Codex reads the public `pf-*` skills from `~/.agents/skills/pf-*`. The shared runtime stays under `~/.primeflow/runtime/PrimeFlow` for CLI access and shared assets. This prevents duplicate skill entries in the Codex UI.

## Usage

After restart, Codex can call PrimeFlow directly with `/pf-*`.

Recommended first entries:

- `help` when you do not know where to start
- `orchestrate` when you want formal routing
- `handoff` when you want to pause or resume work
- `verify` when code already exists and you need fresh evidence

## Related Docs

- [Quickstart](./quickstart.md)
- [Language Policy](./language-policy.md)
- [Installation](./installation.md)
