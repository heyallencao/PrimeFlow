# Keystone for Codex

Guide for using Keystone with Codex through the installed public `ks-*` skills.

## Quick Install

Tell Codex:

```text
Fetch and follow instructions from https://raw.githubusercontent.com/heyallencao/Keystone/refs/heads/main/.codex/INSTALL.md
```

## Manual Installation

```bash
git clone https://github.com/heyallencao/Keystone.git ~/.codex/Keystone
cd ~/.codex/Keystone
./keystone install --agent codex
```

Then restart Codex.

## First Run

After restart, paste one of these directly into Codex:

```text
/ks-help
```

```text
/ks-orchestrate Route this task from the correct entry mode and choose the smallest safe next step.
```

```text
/ks-brief Compress the context below into a one-page execution brief and recommend the next skill.
```

## Generate Codex Skill Docs

If you want the Codex-facing public skill wrappers directly in the repo, run:

```bash
./keystone gen skill-docs --agent codex --output ./.agents/skills --force
```

This generates one public `ks-*` skill directory per Keystone entry under `.agents/skills/`.

## How It Works

Keystone installs the public `ks-*` skills to:

- `~/.agents/skills/ks-help`
- `~/.agents/skills/ks-orchestrate`
- `~/.agents/skills/ks-handoff`
- `~/.agents/skills/ks-review`
- ...

It also installs the shared Keystone runtime to:

- `~/.keystone/runtime/Keystone`

Codex reads the public `ks-*` skills from `~/.agents/skills/ks-*`. The shared runtime stays under `~/.keystone/runtime/Keystone` for CLI access and shared assets. This prevents duplicate skill entries in the Codex UI.

## Usage

After restart, Codex can call Keystone directly with `/ks-*`.

Recommended first entries:

- `help` when you do not know where to start
- `orchestrate` when you want formal routing
- `handoff` when you want to pause or resume work
- `verify` when code already exists and you need fresh evidence

## Related Docs

- [Quickstart](./quickstart.md)
- [Language Policy](./language-policy.md)
- [Installation](./installation.md)
