# PrimeFlow Golden Paths

这份文档不是完整协议手册，而是“遇到常见场景时，直接该怎么走”的速查表。

每条路径都尽量满足三件事：

- 步数短
- skill 名称明确
- 什么时候该停、该回退写清楚

## 1. 新功能路径

适合：

- 从零开始做一个新功能
- 需求目标明确，但还没压成当前块

推荐路径：

```text
help -> orchestrate -> roundtable -> writing-plan -> test-first -> implement -> verify -> review
```

什么时候停：

- `review` 通过后，如果这轮只需要完成功能开发闭环，可以先停在这里

什么时候继续：

- 存在浏览器交互、关键集成链路或高风险运行时行为时，继续 `qa -> ship -> release`

什么时候回退：

- 方向不清楚 → 回 `roundtable`
- 当前块写不清楚 → 回 `writing-plan`
- 验证发现 bug → 去 `diagnose`
- 验证发现 spec 偏了 → 回 `writing-plan`

## 2. 小修复路径

适合：

- 小范围修正
- 已基本知道问题和范围
- 不一定需要完整从零探索

推荐路径：

```text
help -> brief -> writing-plan -> test-first / implement -> verify -> review
```

什么时候停：

- `review` 通过且不需要交付收口时可以停

什么时候继续：

- 要准备 PR 说明时，接 `pr-prep`
- 要进入正式交付时，接 `ship -> release`

什么时候回退：

- 写 plan 时发现其实范围不小 → 回 `roundtable`
- verify 发现不是实现 bug，而是 spec 本身不对 → 回 `writing-plan`

## 3. Build-Ready 路径

适合：

- 代码已经写完或写了一半
- 当前重点是验证、审查和收口

推荐路径：

```text
help -> verify -> review -> pr-prep -> ship -> release
```

什么时候停：

- 只需要完成代码审查和 PR 上下文时，可停在 `pr-prep`

什么时候继续：

- 需要发布结论或知识沉淀时，继续 `release -> knowledge`

什么时候回退：

- verify 发现 bug → 去 `diagnose`
- verify 发现 spec 不成立 → 回 `writing-plan`
- review blocked → 回 `implement`

## 4. Incident 路径

适合：

- 系统异常
- 测试挂了
- 用户路径坏了
- 线上或高影响环境出现回归

推荐路径：

```text
help -> bug-triage -> diagnose -> implement -> verify -> review
```

什么时候停：

- 根因已清楚、修复已验证，但尚未进入交付时可暂时停在 `review`

什么时候继续：

- 如果 triage 判断需要优先止损，走 `ship` 做回滚或交付建议

什么时候回退：

- triage 发现其实是 spec 问题 → 回 `writing-plan`
- diagnose 3 次循环仍无解 → escalate

## 5. PR 收口路径

适合：

- 代码和验证基本完成
- 现在要把改动整理成 reviewer 看得懂、maintainer 能接手的上下文

推荐路径：

```text
help -> verify -> review -> pr-prep -> docs-writer
```

什么时候停：

- PR 描述和交付上下文已经清楚时可停

什么时候继续：

- 需要进入交付执行 → `ship`
- 需要对外形成发布结论 → `release`

什么时候回退：

- verify 发现 bug → 去 `diagnose`
- verify 发现 spec 不成立 → 回 `writing-plan`
- review 发现问题 → 回 `implement`
- 文档依赖的事实还没稳定 → 回 `verify` / `review`

## 6. 会话切换路径

适合：

- 要暂停
- 要换 agent
- 要切新会话继续

推荐路径：

```text
help -> handoff out -> handoff in latest -> orchestrate
```

什么时候停：

- `handoff out` 完成后即可暂停

什么时候继续：

- 恢复后由 `orchestrate` 重新读取现场，决定下一步 skill

什么时候回退：

- 恢复预览发现 handoff 不对 → 不继续执行，重新选择 handoff 包

## 快速选路

如果你只想先选一个入口，用这张表：

| 现在的情况 | 先用什么 |
|-----------|---------|
| 完全不知道从哪开始 | `help` |
| 信息很多，但还没压成一句任务 | `brief` |
| 功能从零开始 | `orchestrate` |
| 问题出现了，但还没判断属于哪类 | `bug-triage` |
| 代码已写，想先拿证据 | `verify` |
| 要整理 PR 上下文 | `pr-prep` |
| 要整理 changelog / ADR / migration note | `docs-writer` |
| 要暂停或恢复 | `handoff` |

## 使用建议

- 第一次使用时，不要背所有 skill，先选最像你当前状态的一条路径
- 路径是推荐，不是强制；但回退规则最好遵守
- 如果你发现一条路径里总出现 3 个并列分支，说明这条路径还需要继续收敛
