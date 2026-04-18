# PrimeFlow 分发模型

## V2 冻结结论

PrimeFlow 在 V2 下不是“先研究 repo 再手工拼 skill”的仓库产物，而是可按 agent 直接安装的 skill product。

冻结后的公共模型只有这一条：

1. 用户直接安装；若环境里只检测到一个 agent 目标，PrimeFlow 自动选中它。
2. PrimeFlow 把完整 bundle 安装到支持包目录，并把公开 `pf-*` skills 平铺到 `.agents/skills/`。
3. PrimeFlow 只为 Claude 挂支持包入口层；Codex / Gemini 直接使用公开 `pf-*` skills。
4. 用户按 agent 原生方式调用 PrimeFlow。

默认支持包目录：

- `~/.primeflow/runtime/PrimeFlow`

默认 agent 入口目标：

- Claude: `~/.claude/skills/PrimeFlow`
- Codex: `~/.agents/skills/pf-*`
- Gemini: `~/.agents/skills/pf-*`

Claude 的 `/pf-*` command files 安装到：

- `~/.claude/commands`

`~/.primeflow` 现在就是默认公共安装契约的一部分。

## 单一真相

分发单一真相是仓库根目录的 `primeflow.manifest.json`。它定义：

- 产品身份、summary、description
- 默认安装模型和默认入口 skill
- 支持的 agent 目标与各自默认安装目标
- 安装 payload
- 完整 skill bundle 清单
- Claude 的 `/pf-*` aliases
- 各 agent 的调用提示

以下产物必须由这份 manifest 收敛一致：

- `./primeflow install` 行为
- `./primeflow dist build` 产物内容
- Claude command files
- README 与安装文档中的 agent 说明

## 安装单位

PrimeFlow 的安装单位是完整 bundle，不是碎片 skill。V2 冻结的 bundle 包含：

- `orchestrate`
- `handoff`
- `roundtable`
- `writing-plan`
- `test-first`
- `implement`
- `verify`
- `diagnose`
- `review`
- `qa`
- `ship`
- `release`
- `knowledge`

安装任一 agent 目标时，这 18 个 skills 必须整包进入支持包目录，同时公开 `pf-*` skills 会平铺到 `.agents/skills/`。

## Agent 调用契约

PrimeFlow 统一的是 skill identity、公开命名和 `/pf-*` 入口。

默认起点：

- `orchestrate`

agent 调用方式：

- Claude: 直接使用 `/pf-help`、`/pf-orchestrate`、`/pf-review`、`/pf-verify` 等 `/pf-*`
- Codex: 安装后重启，直接使用 `/pf-help`、`/pf-orchestrate` 等 `/pf-*`
- Gemini: 安装后重启，直接使用 `/pf-help`、`/pf-orchestrate` 等 `/pf-*`

这里要注意：

- 三个 agent 对外都统一暴露 `/pf-*` 公开入口
- Claude 额外生成 agent 侧 command alias；Codex / Gemini 直接读取已安装的公共 `pf-*` skills
- 这代表公开入口已经统一，但具体展示、补全和菜单体验仍由 agent 能力决定

`pf-*` 是公开稳定命名，不是临时 workaround。它同时用于：

- Claude command files
- 文档中的公开能力名
- manifest 中的 alias 定义

## 当前已冻结的安装路线

这一轮只冻结两条路线，而且成熟度不同：

1. `repo-install`

```bash
./primeflow install
```

这是当前仓库里可直接执行的默认安装入口。若需要覆盖自动检测，仍可显式传 `--agent`。

2. `release-install-stage`

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --agent codex
```

这代表“先构建 staged payload，再从该 payload 安装”的路线。它已经可验证，但还不是 npm 公开发布。

以下内容明确不在这一轮：

- npm 公开发布
- marketplace
- agent 市场化分发
- 真正的 release archive 分发

## 行为要求

V2 下的 CLI 和文档必须同时满足：

- `install` 默认优先自动检测唯一 agent 目标
- 检测不到 agent 目标时提示显式 `--agent`
- 检测到多个 agent 目标时要求显式选择，不默认多装
- 安装位置与 manifest 一致
- 安装内容与 manifest 的 bundle 一致
- Claude 额外生成 `/pf-*` command files；Codex / Gemini 生成公共 `pf-*` skill 目录
- `dist build` 产物身份清楚标记为 staged payload
- `install --source` 明确消费 staged payload，而不是把 repo-install 和 release-install 混成一条线
- 对外发布前，至少在当前 Claude / Codex / Gemini 版本里各做一次真实 `/pf-help` 调用验证
