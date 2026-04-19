# Keystone Installation Guide

This document answers three questions:

- how to install Keystone today
- how Keystone is used after installation in different agents
- which install paths are productized today versus which ones are still maintainer-oriented

If you are new to Keystone, start with [README.md](../README.md) first. The README explains what Keystone is and when to use it. This document focuses on installation and agent-specific behavior.

## Install Keystone

Keystone is open source, but it is not currently shipped as a public npm package. The supported install paths today are:

- install from a local repository checkout with `./keystone install`
- install from the remote bootstrap script

`package.json` intentionally remains `private` until npm publishing becomes a supported distribution path rather than an accidental side effect.

If you already cloned the repository:

```bash
./keystone install
```

If you still need a local checkout:

```bash
git clone https://github.com/heyallencao/Keystone.git keystone
cd keystone
./keystone install
```

For the remote install script:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash
```

The remote install script follows the same install contract as `./keystone install`:

- if exactly one supported host is detected, it installs there automatically
- if no supported host is detected, rerun it with `--agent`
- if multiple supported hosts are detected, rerun it with `--agent` or `--agents`

Examples:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash -s -- --agent codex
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash -s -- --agents claude,codex
```

To overwrite an existing installation:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash -s -- --force
```

## Agent Target Selection

`./keystone install` tries to detect supported agent targets automatically:

- if exactly one supported agent target is detected, Keystone installs to that target
- if no supported target is detected, Keystone asks you to pass `--agent`
- if multiple targets are detected, Keystone requires an explicit selection and does not install to all of them by default

Explicit single-target install:

```bash
./keystone install --agent claude
./keystone install --agent codex
./keystone install --agent gemini
```

Install to multiple targets:

```bash
./keystone install --agents claude,codex
```

Dry run only:

```bash
./keystone install --dry-run --agent claude
```

## Installation Requirements

- Node.js 18+
- Git

Optional environment check:

```bash
./keystone doctor
```

If you want to inspect an alternate installation home:

```bash
./keystone doctor --home ./.tmp-home
```

`doctor` reports:

- Node, Git, and Playwright detection
- where `.keystone` paths will be written
- which supported agent targets were found under the inspected `HOME`
- which install command is recommended for that target environment

## Installation Layout

Keystone installs two layers:

1. public `ks-*` skills
2. the shared Keystone runtime bundle

Public skills are installed under:

- `~/.agents/skills/ks-help`
- `~/.agents/skills/ks-orchestrate`
- `~/.agents/skills/ks-handoff`
- `~/.agents/skills/ks-review`
- ...

The shared runtime bundle is installed under:

- `~/.keystone/runtime/Keystone`

Agent-specific results:

- Claude: `~/.claude/skills/Keystone` points to the shared runtime and command aliases are created under `~/.claude/commands`
- Codex: public `ks-*` skills are read from `~/.agents/skills/ks-*`
- Gemini: public `ks-*` skills are read from `~/.agents/skills/ks-*`

If you are validating installation logic inside the repository rather than installing into your real environment, use `--home` to target a sandbox path.

## Bundle Contents

The runtime bundle includes the full Keystone skill set:

- `help`
- `orchestrate`
- `handoff`
- `roundtable`
- `brief`
- `writing-plan`
- `test-first`
- `implement`
- `verify`
- `diagnose`
- `bug-triage`
- `review`
- `qa`
- `pr-prep`
- `ship`
- `release`
- `docs-writer`
- `knowledge`

Public `ks-*` skills are generated under `~/.agents/skills` or the equivalent `--home` sandbox path.

## After Installation

Restart the target agent so it rescans installed skills.

Then start with one of these:

```text
/ks-help
```

```text
/ks-orchestrate Route this task from the correct entry mode and choose the smallest safe next step.
```

Keystone is not a single-entry system, but `help` and `orchestrate` are the safest defaults for a first run.

## Common Commands

The most common commands for regular users are:

```bash
./keystone install
./keystone doctor
```

Explicit target examples:

```bash
./keystone install --agent claude
./keystone install --agent codex
./keystone install --agent gemini
```

Multi-agent install:

```bash
./keystone install --agents claude,codex
```

Dry run:

```bash
./keystone install --dry-run --agent claude
```

Maintainer-oriented commands:

```bash
./keystone dist build --output ./dist/release/Keystone
./keystone install --source ./dist/release/Keystone --agent codex
./keystone gen skill-docs --agent codex --output ./.agents/skills --force
./keystone scaffold list
./keystone scaffold plan
./keystone scaffold review-report
```

These maintainer commands validate staged payloads and installation behavior, but they still do not imply npm publication. For the product/distribution boundary, see [distribution-model.md](./distribution-model.md).

For deeper maintainer workflows, see [maintainer.md](./maintainer.md).
