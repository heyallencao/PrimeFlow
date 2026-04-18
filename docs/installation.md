# PrimeFlow Installation Guide

This document answers three questions:

- how to install PrimeFlow today
- how PrimeFlow is used after installation in different agents
- which install paths are productized today versus which ones are still maintainer-oriented

If you are new to PrimeFlow, start with [README.md](../README.md) first. The README explains what PrimeFlow is and when to use it. This document focuses on installation and agent-specific behavior.

## Install PrimeFlow

PrimeFlow is open source, but it is not currently shipped as a public npm package. The supported install paths today are:

- install from a local repository checkout with `./primeflow install`
- install from the remote bootstrap script

`package.json` intentionally remains `private` until npm publishing becomes a supported distribution path rather than an accidental side effect.

If you already cloned the repository:

```bash
./primeflow install
```

If you still need a local checkout:

```bash
git clone https://github.com/heyallencao/PrimeFlow.git primeflow
cd primeflow
./primeflow install
```

For the remote install script:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/PrimeFlow/main/scripts/install.sh | bash
```

The remote install script follows the same install contract as `./primeflow install`:

- if exactly one supported host is detected, it installs there automatically
- if no supported host is detected, rerun it with `--agent`
- if multiple supported hosts are detected, rerun it with `--agent` or `--agents`

Examples:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/PrimeFlow/main/scripts/install.sh | bash -s -- --agent codex
curl -fsSL https://raw.githubusercontent.com/heyallencao/PrimeFlow/main/scripts/install.sh | bash -s -- --agents claude,codex
```

To overwrite an existing installation:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/PrimeFlow/main/scripts/install.sh | bash -s -- --force
```

## Agent Target Selection

`./primeflow install` tries to detect supported agent targets automatically:

- if exactly one supported agent target is detected, PrimeFlow installs to that target
- if no supported target is detected, PrimeFlow asks you to pass `--agent`
- if multiple targets are detected, PrimeFlow requires an explicit selection and does not install to all of them by default

Explicit single-target install:

```bash
./primeflow install --agent claude
./primeflow install --agent codex
./primeflow install --agent gemini
```

Install to multiple targets:

```bash
./primeflow install --agents claude,codex
```

Dry run only:

```bash
./primeflow install --dry-run --agent claude
```

## Installation Requirements

- Node.js 18+
- Git

Optional environment check:

```bash
./primeflow doctor
```

If you want to inspect an alternate installation home:

```bash
./primeflow doctor --home ./.tmp-home
```

`doctor` reports:

- Node, Git, and Playwright detection
- where `.primeflow` paths will be written
- which supported agent targets were found under the inspected `HOME`
- which install command is recommended for that target environment

## Installation Layout

PrimeFlow installs two layers:

1. public `pf-*` skills
2. the shared PrimeFlow runtime bundle

Public skills are installed under:

- `~/.agents/skills/pf-help`
- `~/.agents/skills/pf-orchestrate`
- `~/.agents/skills/pf-handoff`
- `~/.agents/skills/pf-review`
- ...

The shared runtime bundle is installed under:

- `~/.primeflow/runtime/PrimeFlow`

Agent-specific results:

- Claude: `~/.claude/skills/PrimeFlow` points to the shared runtime and command aliases are created under `~/.claude/commands`
- Codex: public `pf-*` skills are read from `~/.agents/skills/pf-*`
- Gemini: public `pf-*` skills are read from `~/.agents/skills/pf-*`

If you are validating installation logic inside the repository rather than installing into your real environment, use `--home` to target a sandbox path.

## Bundle Contents

The runtime bundle includes the full PrimeFlow skill set:

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

Public `pf-*` skills are generated under `~/.agents/skills` or the equivalent `--home` sandbox path.

## After Installation

Restart the target agent so it rescans installed skills.

Then start with one of these:

```text
/pf-help
```

```text
/pf-orchestrate Route this task from the correct entry mode and choose the smallest safe next step.
```

PrimeFlow is not a single-entry system, but `help` and `orchestrate` are the safest defaults for a first run.

## Common Commands

The most common commands for regular users are:

```bash
./primeflow install
./primeflow doctor
```

Explicit target examples:

```bash
./primeflow install --agent claude
./primeflow install --agent codex
./primeflow install --agent gemini
```

Multi-agent install:

```bash
./primeflow install --agents claude,codex
```

Dry run:

```bash
./primeflow install --dry-run --agent claude
```

Maintainer-oriented commands:

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --agent codex
./primeflow gen skill-docs --agent codex --output ./.agents/skills --force
./primeflow scaffold list
./primeflow scaffold plan
./primeflow scaffold review-report
```

These maintainer commands validate staged payloads and installation behavior, but they still do not imply npm publication. For the product/distribution boundary, see [distribution-model.md](./distribution-model.md).

For deeper maintainer workflows, see [maintainer.md](./maintainer.md).
