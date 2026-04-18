# PrimeFlow for Codex

Guide for using PrimeFlow with Codex via installed PrimeFlow skills.

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
/pf-orchestrate 判断这个任务该从哪个 entry mode 接入，再路由到最小安全下一步。
```

```text
/pf-brief 把下面这些散乱背景压成一页可执行简报，并推荐下一步 skill。
```

## Generate Codex Skill Docs

If you want the Codex-specific skill docs explicitly in the repo, run:

```bash
./primeflow gen skill-docs --agent codex --output ./.agents/skills --force
```

This generates one `pf-*` skill directory per PrimeFlow entry under `.agents/skills/`.

## How It Works

PrimeFlow installs the public `pf-*` skills to:

- `~/.agents/skills/pf-help`
- `~/.agents/skills/pf-orchestrate`
- `~/.agents/skills/pf-handoff`
- `~/.agents/skills/pf-review`
- ...

It also installs the PrimeFlow support bundle to:

- `~/.primeflow/runtime/PrimeFlow`

Codex uses the public `pf-*` skills directly from:

- `~/.agents/skills/pf-*`

The support bundle stays in `~/.primeflow/runtime/PrimeFlow` for CLI access and shared assets. Codex only sees the public `pf-*` skills under `~/.agents/skills`, which avoids duplicate skill entries in the UI.

## Usage

After restart, Codex can call PrimeFlow directly with `/pf-*`. You can:

- call a skill directly, such as `/pf-orchestrate`
- start with `/pf-help` when you do not know the right entry yet

Recommended first entries:

- `help` when you do not know where to start
- `orchestrate` when you want formal routing
- `handoff` when you want to pause or resume work
