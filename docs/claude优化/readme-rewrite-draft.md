# README 重写草稿

> 历史草稿说明：本文是 README 改写过程稿，不是当前正式 README。
> 当前真实 agent 契约：Claude / Codex / Gemini 统一使用 `/pf-*`，公共 skill 位于 `.agents/skills/pf-*`。

> 对标 gstack/superpowers 的 README 质量，重写 PrimeFlow README 的第一屏到第三屏

**更新说明**：已修正技能数量（18，非19），移除尚未落地的 browse/security，
安装命令改为真实命令 `./primeflow install`。

---

## 设计原则

1. **第一屏决定去留**：5秒内让工程师决定"要还是不要"
2. **差异化优先**：第一屏必须说清楚和 gstack/superpowers 不同在哪
3. **动作优先**：每个区块后面都有一个可以立刻做的动作
4. **诚实**：不夸大，方法论的真实价值就足够有吸引力

---

## 草稿正文

---

# PrimeFlow

> AI coding agents that know when to **stop, verify, and say no** — not just execute.

```bash
git clone https://github.com/heyallencao/PrimeFlow.git primeflow
cd primeflow && ./primeflow install
```

[Terminal GIF: showing a full bug-triage → diagnose → implement flow with state updates]

---

## The problem with AI coding agents

Most AI agents are optimized for one thing: **appearing done**.

Ask them to implement a feature, and they'll output code confidently — regardless of whether the tests pass, the edge cases are covered, or the verification was actually performed. The agent says "done." But is it?

PrimeFlow is built around a different contract:

> **Flexible entry. Honest exit.**

Your agent can start from any stage of the workflow — mid-implementation, post-review, incident response. But it can only claim completion when it has **fresh evidence**: tests that pass, a review that flagged real issues, a canary that held.

No fresh evidence. No "done."

---

## How it's different from gstack and superpowers

| | superpowers | gstack | **PrimeFlow** |
|-|-------------|--------|---------------|
| Focus | Execution methodology | Virtual engineering team | **Decision quality system** |
| State management | None | None | **56-field state.json + routing matrix** |
| Decision confidence | None | None | **0.0–1.0 score on every decision** |
| Honest exit enforcement | None | None | **Blocks "done" without fresh evidence** |
| Telemetry & retrospective | None | Manual /retro | **Auto-generated from decision logs** |
| Multi-agent support | Multi | Claude-first | **Claude + Codex + Gemini** |
| Skills | 14 | 23 | **18 (principled 5-layer architecture)** |

superpowers teaches your agent **how** to code. gstack gives your agent **roles** to play. PrimeFlow gives your agent a **conscience**.

---

## 18 Skills, 5 Layers

```
Orchestration ──── orchestrate · handoff
Decision ────────── roundtable · brief · writing-plan · review
Execution ───────── test-first · implement · verify · diagnose · bug-triage
Operation ───────── qa · pr-prep · ship · release
Support ─────────── help · docs-writer · knowledge
```

Every skill shares the same protocol:
- **Decision Contract**: `decision`, `confidence`, `rationale`, `next_skill`
- **Honest exit rules**: can't claim done without evidence
- **State integration**: reads and writes a shared `.primeflow/state.json`
- **Telemetry**: every decision is logged with a confidence score

---

## Common Paths

**Starting from scratch:**
```
orchestrate → roundtable → writing-plan → test-first → implement → verify → review → ship → release
```

**Quick fix (you know what to change):**
```
writing-plan → implement → verify → review → pr-prep
```

**Bug came in, cause unknown:**
```
bug-triage → diagnose → implement → verify → ship
```

**Resuming across sessions:**
```
handoff in → [continue from saved state]
```

**Reviewing someone else's PR:**
```
review → [autofix safe issues] → pr-prep
```

**Production incident:**
```
orchestrate (incident mode) → diagnose → ship (rollback) → release
```

---

## Install

**Requirements**: Node.js 18+, Git, Claude Code (or Codex / Gemini)

```bash
git clone https://github.com/heyallencao/PrimeFlow.git primeflow
cd primeflow

# Auto-detects your agent target (Claude / Codex / Gemini)
./primeflow install

# Verify environment
./primeflow doctor
```

After install, restart Claude Code and run `/pf-help` to see all available skills.

**Supported agents:**
- Claude Code → `/pf-[skill-name]` slash commands
- Codex → `pf-[skill-name]` skill directories (auto-scanned)
- Gemini → skill bundle at `~/.gemini/skills/PrimeFlow`

Want to install to a specific agent target only?
```bash
./primeflow install --agent claude
./primeflow install --agents claude,codex
./primeflow install --dry-run --agent gemini   # preview without writing
```

---

## First 5 Minutes

You don't need to understand all 18 skills to start.

**Don't know where to begin:**
```
/pf-help
```

**Have a new task:**
```
/pf-orchestrate
```

**Have a fuzzy requirement to compress into a brief:**
```
/pf-brief
```

**Something broke and you're not sure what kind of bug:**
```
/pf-bug-triage
```

**Done with changes, want to prep a PR:**
```
/pf-pr-prep
```

---

## Documentation

- [Common Paths](docs/golden-paths.md) — 6 scenarios, step by step
- [Installation Guide](docs/installation.md) — hosts, dry-run, sandbox, doctor
- [Walkthrough](docs/walkthrough.md) — end-to-end example from scratch
- [Framework Spec](FRAMEWORK.md) — skill protocol, decision contracts, telemetry
- [System Architecture](SYSTEM.md) — layer design, routing matrix, entry modes
- [State Schema](STATE.md) — all 56 state fields
- [Team Policy](docs/team-policy.md) — shared QA/review/release rules for teams
- [Examples](examples/README.md) — copy-paste invocations for Claude, Codex, Gemini

---

## Philosophy

PrimeFlow is built on one observation: **the biggest risk in AI-assisted coding isn't slow output — it's false confidence**.

An agent that halts and says "I need evidence before I can call this done" is worth more than an agent that ships confidently and leaves bugs for production to find.

This is why every skill in PrimeFlow has an honest exit condition. This is why `verify` can only return `pass` with fresh test results, not code inspection. This is why `release` must disclose what was skipped, not just what was done.

---

## License

MIT · Made by [YOUR_NAME]

---

*If PrimeFlow changes how you think about AI agents, consider [sharing it](https://github.com/heyallencao/PrimeFlow) with your team.*

---

## 写作注记（给作者参考）

### 哪些部分最重要

1. **第二段（The problem）**：这是整个 README 的灵魂。工程师必须在这里感到"是的，我有这个问题"
2. **对比表格**：让人快速理解差异化，加了"Multi-agent support"行，这是 PrimeFlow 的额外优势
3. **Common Paths**：6条路径覆盖90%场景，让人立刻知道怎么用
4. **Install 区块**：展示了完整的安装选项，但默认路径只有两行

### 需要替换的占位符

- [ ] `YOUR_NAME` → 真实姓名
- [ ] Terminal GIF → 用 `vhs` 或 `asciinema` 录制

### 可选：更强的开场钩子（HN 风格）

如果想要更个人化、更有故事感的版本（适合 Hacker News）：

```markdown
# PrimeFlow

> I built this after watching an AI agent confidently ship broken code
> for the third time in a week. It said "done." The tests didn't pass.
> It didn't notice.

PrimeFlow is a skill system for Claude Code that enforces a simple rule:
**your agent can say "done" only when it has fresh evidence that things actually work.**
```

### 当前草稿 vs HN 版选择建议

- **GitHub README** → 用当前草稿（更完整，更结构化）
- **HN Show HN 帖** → 用 HN 版开场钩子，更口语化，更有个人故事
- **中文掘金/知乎** → 重新用中文写，不是翻译，而是针对中文读者的叙事

### 关于"Philosophy"段落

这段是点睛之笔，建议保留。它把技术框架上升到工程哲学的高度，让人觉得"这个作者不只是在写工具，他在思考AI编程的本质"。这种感觉是建立个人影响力的关键。
