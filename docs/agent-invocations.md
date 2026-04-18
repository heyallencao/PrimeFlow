# PrimeFlow Agent Invocations

这份文档只回答一个问题：

> 在不同 agent 里，用户应该怎么把同一个 PrimeFlow skill 叫起来。

它不定义 skill 本身的语义，skill 语义以各自的 `SKILL.md` 为准。

## 调用原则

跨 agent 调用时，保持这三点不变：

- skill 名称不变
- skill 边界不变
- 下一步主链语义不变

当前冻结契约下，三个 agent 都统一使用 `/pf-*`。

如果某个 agent 要做入口菜单或首用推荐，优先读取 `primeflow.manifest.json` 里的：

- `agentFacing.recommendedByIntent`
- `agentFacing.menuOrder`
- `agentFacing.presentationDefaults`
- 每个 skill 的 `entry_class`
- 每个 skill 的 `class_priority`

不要在 agent 侧重新发明一套意图到 skill 的映射表。

## 首用入口

当前推荐的首用入口分三类：

- `pf-help`
  当用户不知道从哪开始
- `pf-orchestrate`
  当用户要让 PrimeFlow 正式判断 entry mode 和下一步
- `pf-handoff`
  当用户要暂停、恢复、切换会话

区分原则要写死：

- `pf-help` 是”先给我推荐入口”
- `pf-orchestrate` 是”正式判断 entry mode 并推进主链”
- `pf-handoff` 是”冻结或恢复现场”
- 不要在某个 agent 里把这三者揉成一个含混的超级入口

## Claude

Claude 当前最适合用 `/pf-*` 形式调用。

示例：

```text
/pf-help
/pf-orchestrate
/pf-writing-plan
/pf-review
```

更具体一点：

```text
/pf-help
我想给现有设置页补一个通知开关，但还不确定该从哪个 PrimeFlow skill 开始。
```

```text
/pf-bug-triage
线上支付回调最近会偶发失败，我想先判断这是 spec 问题、实现 bug，还是需要先止损。
```

## Codex

Codex 当前也直接使用 `/pf-*` 调用。

推荐说法：

```text
/pf-help
```

```text
/pf-brief 把下面背景压成一页 brief
```

```text
/pf-pr-prep 把这轮改动整理成 PR 上下文
```

安装层说明：

- PrimeFlow 支持包安装在 `~/.primeflow/runtime/PrimeFlow`
- Codex 直接读取 `~/.agents/skills/pf-*/SKILL.md`
- 不再额外挂 `~/.codex/skills/PrimeFlow`，避免 Skills 列表出现重复项
- 安装后需要重启一次 Codex，让 agent 重新扫描 skills
- 重启后直接使用 `/pf-help`、`/pf-orchestrate`、`/pf-review` 这类公开 skill 名

## Gemini

Gemini 当前也直接使用 `/pf-*` 调用。

推荐说法：

```text
/pf-orchestrate 判断这个任务该从哪个 entry mode 接入。
```

```text
/pf-docs-writer 把这轮结果压成一份 maintainer note。
```

## 同一 skill 的 Agent 对照

### `help`

- Claude：`/pf-help`
- Codex：`/pf-help`
- Gemini：`/pf-help`

### `brief`

- Claude：`/pf-brief`
- Codex：`/pf-brief`
- Gemini：`/pf-brief`

### `bug-triage`

- Claude：`/pf-bug-triage`
- Codex：`/pf-bug-triage`
- Gemini：`/pf-bug-triage`

### `pr-prep`

- Claude：`/pf-pr-prep`
- Codex：`/pf-pr-prep`
- Gemini：`/pf-pr-prep`

### `docs-writer`

- Claude：`/pf-docs-writer`
- Codex：`/pf-docs-writer`
- Gemini：`/pf-docs-writer`

### `orchestrate`

- Claude：`/pf-orchestrate`
- Codex：`/pf-orchestrate`
- Gemini：`/pf-orchestrate`

## 不建议的做法

- 不要为了某个 agent 把 skill 改名
- 不要让某个 agent 里的 `help` 变成真正的路由中枢
- 不要让某个 agent 里的 `orchestrate` 变成吞掉所有首用入口的“唯一入口”
- 不要让某个 agent 里的 `brief` 直接替代 `roundtable`
- 不要让某个 agent 里的 `pr-prep` 变成发布决策器

## 维护建议

每次新增一个高频直达 skill，都建议同步更新：

- `primeflow.manifest.json`
- `README.md`
- `docs/agent-implementation.md`
- 这份 `docs/agent-invocations.md`

这样“skill 是什么”和“用户怎么叫起它”才能一起收口。
