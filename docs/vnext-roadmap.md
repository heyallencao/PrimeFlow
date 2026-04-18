# PrimeFlow vNext Roadmap

这份 roadmap 的目标，不是继续把 PrimeFlow 做成“更完整的流程图”，而是把它推进成一套对重度用户和小团队都更好用的开源 skill product。

当前判断：

- PrimeFlow 的主 workflow 已经完整
- 下一阶段的短板主要在产品化入口、高频直达 skill、团队分发与扩展
- 本轮优先级以 adoption、默认体验、团队复用为先，不以新增流程节点为先

## North Star

PrimeFlow 要从：

- workflow kernel

走到：

- opinionated skill suite

一句话目标：

> 让重度用户装上就能连续工作，让小团队拿去就能共享同一套协作纪律。

## 非目标

当前阶段不优先做：

- 继续细分已有阶段型 workflow
- 先做更重的 telemetry 面板
- 先扩张更多低频 persona
- 为了“完整”而增加更多抽象层

## 当前块

定义 PrimeFlow vNext 的第一阶段 roadmap，明确 P0 / P1 / P2 能力补位、范围边界、默认顺序和落地路径。

## 计划类型

`delta-plan`

## 方向来源

- roundtable 结论：PrimeFlow 当前更像 workflow operating system，而不是成熟的 skill product
- 用户目标：优先服务重度 AI coding 用户和小团队；优先强化 workflow 方法论与高价值 skill

## 范围

### 包含

- 新增能力层分组
- 优先级分层
- 建议新增的 skill 名称
- 产品化与团队化补位项
- 推荐的落地顺序
- 建议的目录和实现落点

### 不包含

- 具体每个新 skill 的完整正文实现
- CLI 全量命令设计细节
- telemetry / state schema 的全面重构
- 发布节奏、版本号和里程碑日期承诺

## 停线（Done Criteria）

- 能清楚回答“PrimeFlow 下一批最该补什么”
- 至少有一组可直接开工的 P0 列表
- 每项 P0 都能映射到明确的仓库落点
- 读者能区分“流程层补强”和“产品层补强”
- 能支撑后续把每个 P0 压成独立 execution card

## 风险分级

- **risk_level**: `medium`
- **为什么是这个等级**: 这是产品方向上的差量规划，不涉及线上行为，但会影响后续 skill 结构、README 入口和 CLI 演进。

## TDD 路由

- **默认后继**: `implement`
- **如果直接 implement，理由是**: 当前块是文档与产品规划沉淀，不涉及行为变更代码，也不需要先经过 `test-first`。

## QA 预期

- **qa_required**: `false`
- **依据**: 当前块不涉及浏览器交互路径和运行时用户行为。

## 技术决策

- Roadmap 以“能力层”而不是“仅按 skill 平铺”组织，避免后续看起来像零散功能堆积
- 先补 adoption 和 packaging，再补 deeper automation，避免内核越来越强但外部体感仍旧偏硬
- 新增 skill 尽量优先选择场景导向名称，而不是纯阶段导向名称

## P0：必须补的能力

### 1. Start Here / Help 层

目的：让第一次装 PrimeFlow 的重度用户，不必先读完整套框架，也能知道第一步怎么用。

契约边界：

- `start-here` / `help` 不是新的全局路由中枢
- 它的职责是 onboarding、场景分流说明和入口建议
- 真正的接入模式判断与下一步 skill 决策，仍由 `orchestrate` 负责
- 如果需要落到真实 workflow，`start-here` 最终应把用户导向现有 skill，而不是自己持有一套并行 decision contract

建议产物：

- 新增 `start-here` 或 `help` skill
- 提供按场景分流的入口说明
- 给出最小 golden paths
- 给出“什么时候用哪个 skill”的速查表

建议落点：

- `support/help/SKILL.md`
- README Quick Start 改为双入口：
- 安装入口
- 场景入口

默认路由约束：

- 用户需要“我该从哪开始”时，可先进入 `help`
- 用户一旦进入真实工作流，统一回到 `orchestrate` 或明确的既有 stage skill
- `help` 不维护独立 state，不改写现有 routing semantics

Done 标准：

- 新用户在 5 分钟内可以选中一个可执行入口
- README 首页不要求先理解全部层次架构
- `help` 与 `orchestrate` 的职责边界可用一句话解释清楚

### 2. 高频直达 Skill

目的：让 PrimeFlow 不只是“阶段工作流”，而是有一批装上就会高频使用的 skill。

生命周期约束：

- 每个新增 skill 都必须声明自己的进入条件、退出产物和回到主链的位置
- 它们是主链前置、侧车或收口加速器，不应形成第二条平行主链
- 新 skill 的价值在于缩短高频场景的起步与收口，不在于替代现有 stage 的核心职责

建议先补 4 个：

- `brief`
  把模糊需求压成一页任务简报，适合作为 roundtable 前置或轻量替代
- `bug-triage`
  把“坏了”快速分流成 spec 问题、实现问题、运行时问题或需要回滚
- `pr-prep`
  把变更整理成 PR 描述、验证说明、风险披露、发布备注
- `docs-writer`
  把实现结果压成 changelog、ADR、migration note 或 maintainer note

建议生命周期挂点：

- `brief`
  - 层级：`decision`
  - 用法：作为 `roundtable` 前置的轻量收敛器，或把用户原始输入压成可交给 `writing-plan` / `roundtable` 的摘要
  - 退出：输出 brief artifact，不直接替代 `roundtable` 的方向裁决
- `bug-triage`
  - 层级：`execution`
  - 用法：在“坏了，但还没判断这是 spec 问题、实现问题还是事故”时快速分流
  - 退出：只负责路由到 `writing-plan` / `diagnose` / `ship` 回滚判断，不自己替代根因调查
- `pr-prep`
  - 层级：`operation`
  - 用法：在 `review` 通过后、`ship` 前后整理交付信息
  - 退出：输出 PR/merge context，不替代 `release`
- `docs-writer`
  - 层级：`support`
  - 用法：在 `release` 或 `knowledge` 之后，把已完成事实压成稳定文档
  - 退出：不做发布决策，不替代 `knowledge` 的“值不值得沉淀”判断

建议落点：

- `decision/brief/SKILL.md`
- `execution/bug-triage/SKILL.md`
- `operation/pr-prep/SKILL.md`
- `support/docs-writer/SKILL.md`

Done 标准：

- 至少 3 个新增 skill 具备明确触发场景
- 它们不要求用户先理解完整主链才能用
- 每个 skill 都能明确回答“它不替代谁、它之后回到哪里”

### 3. Golden Paths

目的：把“PrimeFlow 怎么跑”从抽象方法论变成一眼能照着走的路径。

建议先补 6 条：

- 新功能路径
- 小修复路径
- build-ready 路径
- incident 路径
- PR 收口路径
- 会话切换路径

建议落点：

- `docs/golden-paths.md`
- README 增加 “Common Paths” 入口
- 每条路径尽量映射到明确 skill 名称

Done 标准：

- 每条路径不超过 8 步
- 每条路径能说明从哪里进、何时停、何时回退

### 4. Team Policy Overlay

目的：让 PrimeFlow 从“个人高手工作流”升级为“小团队共享工作方式”。

状态边界：

- 团队 policy 必须是版本化、可审查、可共享的静态配置
- `.primeflow/` 继续只承载运行时状态、telemetry、handoff 和派生工件
- 不把团队长期规则写进 runtime 目录，避免安装、清理、同步语义混乱

建议能力：

- 团队本地 policy 文件
- `qa_required` 判定覆写
- review gate 规则覆写
- release 披露模板覆写
- handoff 槽位扩展

建议落点：

- `docs/team-policy.md`
- `primeflow.manifest.json` 增加可选 policy 声明
- 仓库级 `primeflow.policy.json` 或 `primeflow.policy.toml`

Done 标准：

- 团队能在不 fork 核心 skill 的前提下定制最关键规则
- policy 与核心 skill 的职责边界清楚
- policy 文件可以被版本控制，而 `.primeflow/` 仍可安全忽略或清理

### 5. Install / Upgrade / Doctor 体验

目的：把安装从“能装”提升到“像产品”。

建议能力：

- `primeflow doctor`
- `primeflow upgrade`
- agent compatibility check
- alias / command 注册检查
- 安装完成后的 next steps 提示

建议落点：

- `bin/primeflow.mjs`
- `docs/installation.md`
- `docs/maintainer.md`

Done 标准：

- 用户能自查安装问题
- 升级路径可描述、可执行
- 安装后自动看到下一步推荐动作

## P1：应该补

### 1. 模板与脚手架层

建议补：

- plan template
- test contract template
- review report template
- release statement template
- incident report template

建议落点：

- `templates/`
- CLI 增加 `primeflow scaffold ...`

### 2. 可扩展 Skill 机制

建议补：

- custom skill registry
- team-local overrides
- capability tags
- manifest 扩展点

建议落点：

- `primeflow.manifest.json`
- `docs/distribution-model.md`
- `docs/maintainer.md`

### 3. 示例仓库与案例

建议补：

- demo repo walkthrough
- frontend example
- backend service example
- incident replay example

建议落点：

- `examples/` 或 `docs/examples/`

### 4. 团队版本化分发

建议补：

- 推荐 PrimeFlow 版本声明
- 团队统一安装说明
- 升级兼容说明

建议落点：

- `docs/distribution-model.md`
- `docs/team-adoption.md`

## P2：加分项

### 1. Telemetry 可视化

建议补：

- 最近路由历史
- 当前 stage 快照
- handoff 恢复记录
- release / review / qa 成功率

### 2. Persona Pack

建议补：

- security gate
- perf investigator
- migration reviewer
- design critic

### 3. 场景化 Pack

建议补：

- startup pack
- solo builder pack
- saas release pack
- incident pack

## 推荐顺序

### Phase 1

- `start-here` / `help`
- `brief`
- `bug-triage`
- `docs/golden-paths.md`

### Phase 2

- `pr-prep`
- `docs-writer`
- `primeflow doctor`
- README 和安装体验改造

### Phase 3

- team policy overlay
- template / scaffold 层
- team distribution guidance

## 建议目录变化

可新增这些目录或文件：

```text
docs/
  golden-paths.md
  team-policy.md
  team-adoption.md
  vnext-roadmap.md

templates/
  plan.md
  test-contract.md
  review-report.md
  release-statement.md
  incident-report.md

decision/
  brief/
    SKILL.md

operation/
  pr-prep/
    SKILL.md

support/
  docs-writer/
    SKILL.md
  help/
    SKILL.md
```

## 下一批 execution card 候选

建议后续按这个顺序拆卡：

1. `start-here` skill + README 首页改造
2. `brief` skill 初版
3. `docs/golden-paths.md`
4. `bug-triage` skill 初版
5. `primeflow doctor` 命令设计与实现
6. team policy overlay 设计文档

## 下一步

**下一 skill**：`writing-plan`

建议把上面的第 1 项拆成第一张 execution card：

- 当前块：`start-here entry flow`
- 目标：让 PrimeFlow 安装后第一次使用更顺，降低首次理解成本，同时保留方法论骨架
