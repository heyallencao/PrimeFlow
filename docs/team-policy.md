# PrimeFlow Team Policy

这份文档回答的是：

- 团队如何在不 fork PrimeFlow 核心 skill 的前提下共享规则
- 哪些东西可以覆写
- 哪些东西不能碰

## 设计目标

Team Policy Overlay 的目标不是把 PrimeFlow 变成一个重量级配置系统，而是让小团队能版本化地表达：

- 我们对 `qa_required` 的默认判断
- 我们对 review gate 的最低要求
- 我们对 release 披露的最低要求
- 我们对 handoff 交接内容的额外约束

一句话：

> policy 是团队规则，不是运行时状态。

## 状态边界

PrimeFlow 的状态边界要保持很硬：

- `.primeflow/` 只放运行时状态、telemetry、handoff 和派生工件
- team policy 必须放在可版本控制的仓库文件里
- 不把团队长期规则写进 `.primeflow/`

推荐位置：

- `primeflow.policy.json`

如果团队有强烈偏好，也可以用：

- `primeflow.policy.toml`

但这一轮建议先统一为 JSON，降低解析和维护成本。

## Policy 能覆写什么

当前建议只开放少数高价值覆写点：

### 1. QA 默认策略

可表达：

- 哪些类型的改动默认 `qa_required = true`
- 哪些类型的改动默认 `qa_required = false`

适合的规则：

- 前端用户路径默认进 `qa`
- 纯脚本或纯文档默认不进 `qa`

### 2. Review Gate

可表达：

- review 通过前最低需要哪些输入
- 团队对 P0 / P1 的默认处理口径
- 哪些模块触发额外 reviewer persona

### 3. Release 披露要求

可表达：

- 哪些未执行验证必须披露
- 哪些风险级别必须写进 release statement

### 4. Handoff 扩展槽位

可表达：

- 除标准 8 槽外，团队是否要求额外记录
- 例如：值班联系人、回滚命令、发布窗口

## Policy 不能覆写什么

这些东西不应由 policy 覆写：

- PrimeFlow 的主链阶段定义
- `orchestrate` 的核心路由职责
- `verify` / `review` / `release` 的诚实原则
- `.primeflow/state.json` 的运行时含义

也就是说，policy 可以调团队口径，但不能把 PrimeFlow 改成另一套系统。

## 最小文件格式

建议的 `primeflow.policy.json`：

```json
{
  "version": 1,
  "qa": {
    "default_required_for": [
      "frontend-user-path",
      "browser-interaction",
      "critical-integration"
    ],
    "default_skipped_for": [
      "docs-only",
      "copy-only",
      "internal-script"
    ]
  },
  "review": {
    "block_on": ["P0", "P1"],
    "extra_personas": {
      "auth": ["security-reviewer"],
      "migration": ["data-migrations-reviewer"]
    }
  },
  "release": {
    "must_disclose": [
      "skipped-qa",
      "partial-qa",
      "known-risks"
    ]
  },
  "handoff": {
    "extra_slots": [
      "rollback-command",
      "oncall-owner"
    ]
  }
}
```

## 推荐解释方式

policy 文件的值建议偏声明式，而不是脚本式：

- 写“哪些情况默认触发”
- 不写复杂表达式执行器
- 不把团队 policy 做成另一套 DSL

这样更容易 code review，也更容易在不同 agent 里保持一致。

## 团队落地建议

推荐顺序：

1. 先只定义 `qa` 和 `release`
2. 再补 `review` gate
3. 最后再看是否真的需要 handoff 扩展槽位

不要一开始把所有维度都配满，否则容易出现“规则很多，但没人真正遵守”。

## 与 Manifest 的关系

当前阶段，policy 可以是独立仓库文件，不要求 manifest 立即强绑定它。

后续如果要做更强的分发或安装提示，可以考虑在 `primeflow.manifest.json` 增加：

- policy file path
- policy schema version

但这属于下一阶段能力，不是这一轮的必需项。

## 维护原则

- policy 改动应和普通代码一样走 code review
- policy 变更要写清楚为什么改
- 如果 policy 与 PrimeFlow 核心原则冲突，以核心原则为准

## 第一轮 Done 标准

- 团队知道 policy 文件该放哪里
- 团队知道哪些规则可以覆写
- `.primeflow/` 与 policy 的边界清楚
- 团队可以基于示例文件开始讨论自己的默认口径
