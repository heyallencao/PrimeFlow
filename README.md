# Keystone

[![CI](https://github.com/heyallencao/Keystone/actions/workflows/ci.yml/badge.svg)](https://github.com/heyallencao/Keystone/actions/workflows/ci.yml)


> AI agents that know when to stop, verify, and say no instead of only pushing forward.

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash
```

After installation, restart your agent and start with `/ks-help`.

To overwrite an existing installation:

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash -s -- --force
```

---

Keystone is a workflow skill bundle for Claude, Codex, and Gemini.

It does not force every task to start from the same first step. It does force every claim of "done" to be backed by fresh evidence.

In one line:

> **Flexible entry, honest exit.**

## What Keystone Is

Most AI agent workflows optimize for one thing: looking finished.

You ask for a feature, the agent confidently returns code, and the conversation moves on before anyone proves that tests passed, edge cases were handled, or the behavior was actually verified. Keystone is built around a different contract:

> An agent may enter from any valid stage, but it may not declare completion without fresh evidence.

That evidence can come from tests, review findings, QA runs, deployment signals, or incident investigation. Without new evidence, there is no honest "done".

## Why It Exists

Keystone is for teams and solo builders who already trust agents to produce output, but do not trust them to police themselves.

It is especially useful when you want:

- a consistent way to route work into the right workflow stage
- explicit decisions instead of vague "probably fine" handoffs
- cross-session continuity through shared state and handoff artifacts
- a definition of done that depends on evidence, not confidence alone

## How It Differs From Other Agent Frameworks

Keystone lives in the same problem space as tools like `superpowers` and `gstack`, but it optimizes for a different layer.

| Project | Strongest layer | What Keystone adds |
|---|---|---|
| `superpowers` | automatic skill triggering, TDD-first execution, subagent loops | stateful routing and honest closeout |
| `gstack` | team personas, browser QA, release loops, productized entry points | a unified contract for when to continue, when to stop, and when to disclose risk |
| **Keystone** | entry-mode routing, decision contracts, honest exit, shared state, handoff, telemetry | more like a workflow kernel than a loose prompt collection |

## 18 Skills, 5 Layers

```text
Orchestration  -> orchestrate, handoff
Decision       -> roundtable, brief, writing-plan, review
Execution      -> test-first, implement, verify, diagnose, bug-triage
Operations     -> qa, pr-prep, ship, release
Support        -> help, docs-writer, knowledge
```

Every skill follows the same operating contract:

- **Decision contract**: every skill returns `decision`, `confidence`, `rationale`, and `next_skill`
- **Honest exit**: no verifiable evidence, no claim of completion
- **Shared state**: workflow context is stored in `.keystone/state.json`
- **Telemetry**: routing and execution decisions are logged for review and handoff

## Common Paths

**Starting from scratch**

```text
/ks-orchestrate -> /ks-roundtable -> /ks-writing-plan -> /ks-test-first -> /ks-implement -> /ks-verify -> /ks-review -> /ks-ship -> /ks-release
```

**You already know what to change**

```text
/ks-writing-plan -> /ks-test-first -> /ks-implement -> /ks-verify -> /ks-review
```

**Bug reported, root cause unknown**

```text
/ks-bug-triage -> /ks-diagnose -> /ks-implement -> /ks-verify -> /ks-ship
```

**Pause and resume later**

```text
/ks-handoff
```

## Quick Start

### 1. Install

Requirements: Node.js 18+ and Git.

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/Keystone/main/scripts/install.sh | bash
```

Keystone is open source, but it is not published as an npm package today. The supported install paths are the repository install flow and the remote install script above. `package.json` remains intentionally `private` until npm publishing becomes a real supported release path.

Manual install:

```bash
git clone https://github.com/heyallencao/Keystone.git keystone
cd keystone
./keystone install --agents claude,codex,gemini
./keystone doctor
```

### 2. Restart your agent

Keystone installs public `ks-*` skills into `~/.agents/skills` and the shared runtime into `~/.keystone/runtime/Keystone`.

### 3. Start with one of these

```text
/ks-help
```

```text
/ks-orchestrate Route this task from the correct entry mode and push it to the smallest safe next step.
```

```text
/ks-verify Collect fresh evidence for the current change before claiming it is ready for review.
```

## Documentation

- [Language Policy](docs/language-policy.md) - canonical language rules for docs and runtime skills
- [Quickstart](docs/quickstart.md) - first-run walkthrough in one small real task
- [Installation](docs/installation.md) - install modes, agent targets, dry runs, and `--home`
- [Golden Paths](docs/golden-paths.md) - recommended skill chains for common situations
- [Walkthrough](docs/walkthrough.md) - an end-to-end example
- [Examples](examples/README.md) - copyable prompts for Claude, Codex, and Gemini
- [Releasing](RELEASING.md) - staged payload release path for maintainers
- [Keystone for Codex](docs/README.codex.md) - Codex-specific install and usage guide
- [Agent Implementation](docs/agent-implementation.md) - implementation notes and compatibility details
- [Distribution Model](docs/distribution-model.md) - runtime layout, packaging, and dist builds
- [Team Policy](docs/team-policy.md) - shared QA, review, and release rules
- [State Structure](STATE.md) - workflow state fields and semantics
- [Known Solutions](docs/solutions/) - indexed knowledge artifacts for recurring bugs and patterns

## Language Policy

Keystone is now **English-first across canonical surfaces**:

- English is the canonical language for README, primary docs, and runtime `SKILL.md`
- Chinese may exist as a mirror for human-facing docs
- Runtime skills should not be bilingual, because mixed-language prompts increase ambiguity and token cost

See [docs/language-policy.md](docs/language-policy.md) for the full policy.
