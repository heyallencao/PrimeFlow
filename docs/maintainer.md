# PrimeFlow 维护者路径

这篇文档面向 PrimeFlow 仓库维护者，而不是首次安装和使用 PrimeFlow 的普通用户。

如果你只是想把 PrimeFlow 安装到自己的 agent 环境并开始使用，先看 [README.md](../README.md) 和 [installation.md](./installation.md)。

## 仓库内验证

如果你是在这个仓库里验证 PrimeFlow 本体，可以走下面这条路径：

```bash
npm run smoke
./primeflow install --home ./.tmp-home --agent claude
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --home ./.tmp-home --agent codex
```

这条路径的用途是：

- 验证 CLI 和安装逻辑没有回归
- 验证 release staged payload 可被成功安装
- 在不污染真实 agent 环境的前提下做仓库内测试

## `smoke`

```bash
npm run smoke
```

当前 smoke test 会覆盖：

- `doctor`
- `state init` / `state validate`
- `handoff create`
- `install --dry-run`
- 无 agent 目标时安装失败提示
- 单 agent 自动检测安装
- 多 agent 歧义提示
- `dist build`
- `install --source`

但 smoke test 不会替你证明真实 agent 里的 `/pf-*` 调用一定可用。对外发布前，至少再做一次当前 Claude / Codex / Gemini 版本里的手动验证，确认 `/pf-help` 能被 agent 正确发现和执行。

## 沙盒安装

如果你不想把安装写进真实 `~/.claude`、`~/.codex`、`~/.gemini`，可以显式指定：

```bash
./primeflow install --home ./.tmp-home --agent claude
```

这会把安装目标改到仓库内沙盒目录，例如：

- `./.tmp-home/.claude/skills/PrimeFlow`
- `./.tmp-home/.primeflow/runtime/PrimeFlow`
- `./.tmp-home/.agents/skills/pf-help`

## staged payload 验证

构建 staged payload：

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
```

再从该 payload 安装：

```bash
./primeflow install --source ./dist/release/PrimeFlow --home ./.tmp-home --agent codex
```

这条路径用于验证：

- `dist build` 复制了 manifest 定义的 payload
- `release.json` 被正确写入
- `install --source` 能从 staged payload 完整安装

## 什么时候看这篇文档

以下情况再来看这里：

- 你在改 CLI 安装逻辑
- 你在改分发模型
- 你在维护 smoke test
- 你要验证 release-install-stage
