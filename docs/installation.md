# PrimeFlow 安装说明

这篇文档只回答三件事：

- PrimeFlow 现在怎么安装
- 安装后在不同 agent 里怎么用
- 哪些体验已经产品化，哪些还只是当前实现现状

默认心智模型也很简单：

- CLI 主要负责安装和诊断
- 真正的使用发生在 Claude / Codex / Gemini 这些 agent 里
- 所以普通用户通常只需要先 `install`，然后回到 agent 里调用 PrimeFlow skill

如果你第一次接触 PrimeFlow，建议先读 [README.md](../README.md)。README 负责解释 PrimeFlow 是什么、适合从哪些入口接入；这篇文档只讲安装和 agent 差异。

如果你还没把仓库拉到本地，可以先这样开始：

```bash
git clone https://github.com/heyallencao/PrimeFlow.git primeflow
cd primeflow
./primeflow install
```

## 当前支持的安装路线

对普通用户，推荐路径只有一条：

1. 在仓库里运行 `./primeflow install`
2. 重启对应 agent，让它重新扫描已安装技能
3. 回到 agent 里，从 `help` 或 `orchestrate` 开始

```bash
./primeflow install
```

`repo-install` 现在会优先自动检测 agent 目标：

- 只检测到一个 agent 目标时，直接安装到该 agent
- 检测不到 agent 目标时，提示使用 `--agent`
- 检测到多个 agent 目标时，要求显式选择，不会默认多装

如果你想显式指定 agent 目标：

```bash
./primeflow install --agent claude
```

如果你想一次安装到多个 agent：

```bash
./primeflow install --agents claude,codex
```

如果只想预览安装动作：

```bash
./primeflow install --dry-run --agent claude
```

如果你是通过远端安装脚本重新安装，并且要覆盖已有目录：

```bash
curl -fsSL https://raw.githubusercontent.com/heyallencao/PrimeFlow/main/scripts/install.sh | bash -s -- --force
```

高级安装路线：`release-install-stage`

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --agent codex
```

当前不要把未来可能的 `npx primeflow install` 当成同等级入口。

## 安装前提

- Node.js 18+
- git

可先检查环境：

```bash
./primeflow doctor
```

如果你要检查一个替代安装目标，而不是当前真实 `HOME`，可以显式传入：

```bash
./primeflow doctor --home ./.tmp-home
```

`doctor` 现在会告诉你：

- Node / git / playwright 的检测结果
- `.primeflow` 相关路径会落在哪里
- 当前诊断目标 `HOME` 下检测到了哪些 agent 目标
- 在这个目标 `HOME` 语境下，下一步适合运行什么 `install` 命令

边界说明：

- 默认不传 `--home` 时，`doctor` 检查的是当前真实 `HOME`
- 如果你要用 `install --home <path>` 做沙盒或 CI 安装，先用同一个 `--home` 跑 `doctor`
- `doctor` 只做环境和 agent 目标检测，不替代实际安装时的成功/失败结果

## 安装目标

默认安装模型是“公开 `pf-*` skills + PrimeFlow 支持包”。

主要使用层位于：

- `~/.agents/skills/pf-help`
- `~/.agents/skills/pf-orchestrate`
- `~/.agents/skills/pf-handoff`
- `~/.agents/skills/pf-review`
- ...

PrimeFlow 支持包位于：

- `~/.primeflow/runtime/PrimeFlow`

各 agent 的安装结果：

- Claude: `~/.claude/skills/PrimeFlow`
- Codex: 公共 `pf-*` skills 位于 `~/.agents/skills/pf-*`
- Gemini: 公共 `pf-*` skills 位于 `~/.agents/skills/pf-*`

如果你在仓库里验证安装逻辑，而不是作为普通用户安装到自己环境，可以显式指定 `--home` 把目标改到沙盒目录。例如：

- `./.tmp-home/.primeflow/runtime/PrimeFlow`
- `./.tmp-home/.claude/skills/PrimeFlow`
- `./.tmp-home/.agents/skills/pf-help`
- `./.tmp-home/.agents/skills/pf-orchestrate`
- `./.tmp-home/.agents/skills/pf-handoff`

## 安装完整 bundle

PrimeFlow 安装的是整套 bundle。支持包中会包含：

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

公共 `pf-*` skill 会生成到 `~/.agents/skills` 或对应的 `--home` 沙盒路径。
Claude 还会额外生成 `/pf-*` command files 到 `~/.claude/commands` 或对应的 `--home` 沙盒路径。
Claude 的 `~/.claude/skills/PrimeFlow` 会指向这份支持包。
Codex / Gemini 则直接读取 `~/.agents/skills/pf-*`，不再额外挂 runtime mount，避免在 Skills 列表里出现重复项。

## 常用命令

对普通用户来说，CLI 里最重要的通常只有两个命令：

- `./primeflow install`
- `./primeflow doctor`

```bash
./primeflow install
```

显式指定单个 agent 目标：

```bash
./primeflow install --agent claude
./primeflow install --agent codex
./primeflow install --agent gemini
```

一次安装到多个 agent：

```bash
./primeflow install --agents claude,codex
```

预览安装动作：

```bash
./primeflow install --dry-run --agent claude
```

下面这些更偏维护、验证或分发场景：

从 staged payload 安装：

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --agent codex
```

单独生成 Codex skill docs：

```bash
./primeflow gen skill-docs --agent codex --output ./.agents/skills --force
```

生成模板骨架：

```bash
./primeflow scaffold list
./primeflow scaffold plan
./primeflow scaffold review-report
```

如果你是在仓库内做 smoke test 或 release payload 验证，再使用 `--home ./.tmp-home` 这样的沙盒路径。维护者路径见 [maintainer.md](./maintainer.md)。

## 安装后怎么用

安装完成后，重点不再是继续用 CLI，而是回到 agent 里直接调用 PrimeFlow。

PrimeFlow 不是单一起点系统。默认推荐入口是 `orchestrate`，但不是唯一入口。

如果你只想装完马上跑通一次，直接复制下面这句到你的 agent 里：

- Claude: `/pf-help`
- Codex: `/pf-help`
- Gemini: `/pf-help`

常见入口：

- `help`
- `brief`
- `bug-triage`
- `orchestrate`
- `writing-plan`
- `review`
- `diagnose`
- `pr-prep`
- `docs-writer`
- `handoff`

agent 调用方式：

- Claude: `/pf-help`、`/pf-brief`、`/pf-bug-triage`、`/pf-pr-prep`、`/pf-docs-writer`、`/pf-orchestrate` 等可直接调用
- Codex: 安装后重启一次，让 Codex 重新扫描已安装的 PrimeFlow skills；之后直接用 `/pf-help`、`/pf-orchestrate`
- Gemini: 安装后重启一次，让 Gemini 重新扫描已安装的 PrimeFlow skills；之后直接用 `/pf-help`、`/pf-orchestrate`

PrimeFlow 统一的是入口语义、公开命名和 `/pf-*` 调用形式。

当前体验现状：

- Claude / Codex / Gemini 都统一用 `/pf-*`
- 公共 `pf-*` skill 位于 `~/.agents/skills`
- Claude 额外提供 `~/.claude/commands/pf-*.md` 作为 agent 侧 alias

## 首次使用建议

第一次使用时，不要先试图理解全部 18 个 skills。

更好的方式是：

- 先跑一次 `./primeflow doctor`
- 先安装到你的 agent 环境
- 重启 agent，让它重新扫描 PrimeFlow
- 先选一个符合当前场景的入口
- 再直接描述你的任务

如果你不知道该从哪个 skill 进，优先从 `help` 进入。
如果你是从零开始，优先从 `orchestrate` 进入。
如果你已经在线下对齐方案，直接从 `writing-plan` 进入更自然。
如果你已经有改动并准备正式过审，直接从 `review` 进入更自然。

## staged payload 的定位

`./primeflow dist build --output ./dist/release/PrimeFlow` 生成的是 staged payload，不是最终发布包。

这一轮已经明确的行为：

- `dist build` 复制 manifest 声明的 payload
- staged payload 会带 `release.json`
- `install --source <path>` 按 staged payload 安装

这一轮尚未完成的内容：

- npm 公开发布
- 真正的 release archive
- marketplace 分发
