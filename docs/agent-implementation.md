# PrimeFlow Agent Implementation

这份文档回答的是：

- PrimeFlow 的 skill 在不同 agent 里，哪些东西必须保持一致
- 哪些东西允许按 agent 能力做适配
- 当前实现时，应该优先守哪一层

这不是安装文档，也不是方法论总览。

它服务的是一个更具体的问题：

> 同一个 PrimeFlow skill，在 Claude、Codex、Gemini 里怎么做到“体验不同，但语义不漂”。

## 当前优先级

当前阶段，PrimeFlow 的主优先级是：

1. **skill 语义一致**
2. **入口命名一致**
3. **Decision 契约一致**
4. **agent 调用方式按能力适配**
5. CLI 作为辅助，不是核心定义来源

也就是说：

- skill 才是产品本体
- distribution 和 CLI 是支撑层
- 不要为了某个 agent 的局部体验，反过来改坏 skill 本身的边界

## 必须一致的部分

这些东西跨 agent 必须保持一致：

### 1. Skill 角色与边界

例如：

- `help` 只能做 onboarding，不变成第二个 `orchestrate`
- `brief` 只能压输入，不替代 `roundtable`
- `bug-triage` 只能分流，不替代 `diagnose`
- `pr-prep` 只能整理交付上下文，不替代 `release`
- `docs-writer` 只能整理事实文档，不替代 `knowledge`

如果某个 agent 里为了“更顺手”把边界改掉，那就不是 PrimeFlow 的 agent 适配，而是另一套 workflow。

### 2. Decision 契约

每个 skill 输出的这些字段必须保持一致：

- `decision`
- `confidence`
- `rationale`
- `fallback`
- `escalate`
- `next_skill`
- `next_action`

agent 可以改变展示方式，但不能改变这些字段的语义。

### 3. 主链和回退关系

这些关系不能因 agent 变化而漂移：

- `verify -> review`
- `verify fail_bug -> diagnose`
- `verify fail_spec -> writing-plan`
- `review pass -> qa? / ship`
- `release -> knowledge`

### 4. 公开 skill 名称

对外公开名称保持一致：

- `help`
- `brief`
- `bug-triage`
- `orchestrate`
- `roundtable`
- `writing-plan`
- `test-first`
- `implement`
- `verify`
- `review`
- `pr-prep`
- `qa`
- `ship`
- `release`
- `docs-writer`
- `knowledge`
- `handoff`

不同 agent 可以有不同调用方式，但不要出现同一能力在不同 agent 里换名字的情况。

## 允许适配的部分

下面这些可以按 agent 能力做适配：

### 1. 入口形态

- Claude：`/pf-*`
- Codex：`/pf-*`
- Gemini：`/pf-*`

差异点更多体现在 agent 集成方式和 alias 暴露，不在“怎么叫起它”。

### 2. 输出包装

同一个 skill 在不同 agent 里，可以：

- 用不同的提示语气
- 用不同的展示包装
- 用不同的 agent 集成方式暴露入口

但不应改动核心结构和退出语义。

### 3. 辅助工具依赖

例如：

- 某个 agent 更容易接 slash command
- 某个 agent 更容易调用本地 CLI
- 某个 agent 更适合通过 skill bundle 直接读取文件

这些都可以适配，但不应成为 skill 协议本身的一部分。

## 当前推荐实现层次

实现顺序建议固定为：

1. 先定义 skill 本体
2. 再定义跨 agent 一致的输入输出
3. 再做 agent 入口适配
4. 最后再补 CLI 和 distribution 体验

如果顺序反过来，就会出现：

- Claude 版很好用
- Codex / Gemini 版只能“差不多”
- 最终 skill 本体反而没有一个稳定的公共语义

## Agent 适配检查清单

每新增一个 skill，至少回答这几题：

### 1. 语义有没有漂

- 这个 skill 在不同 agent 里做的是不是同一件事？

### 2. 下一步有没有漂

- `next_skill` 是否仍然指向同一条主链？

### 3. 它不替代谁有没有漂

- 不会在某个 agent 里偷偷吞掉隔壁 skill 的职责？

### 4. 首用入口有没有统一

- 用户能否在不同 agent 里找到同一组公开 skill 名？

### 5. Agent 差异说明有没有写回 skill

- 对于高频入口 skill，是否在对应 `SKILL.md` 中写清“agent 差异只影响触发方式，不影响 skill 边界”？

### 6. 最小输出示例有没有统一

- 对于高频直达 skill，是否在 `SKILL.md` 中给出一个最小输出示例？
- 不同 agent 可以换包装，但输出骨架、字段顺序和主链语义最好尽量保持一致

### 7. 主链后半段有没有一样收紧

- `review / release / knowledge` 这类后半段 skill，是否也写清了 agent 差异注意事项？
- 是否也有最小输出示例，避免前半段很规范、后半段又重新漂掉？

## 推荐文档落点

当你在做 agent 实现或 agent 适配时，优先同步更新这些地方：

- `primeflow.manifest.json`
- `README.md`
- `FRAMEWORK.md`
- `docs/decision-matrix.md`
- 对应的 `SKILL.md`
- 本文档

不要只改某个 agent 侧入口，而不回写公共协议说明。

## Manifest 约定

`primeflow.manifest.json` 现在除了 skill 列表，还可以表达 agent-facing 元数据：

- `agentFacing.primaryEntrySkills`
- `agentFacing.highFrequencySkills`
- `agentFacing.closeoutSkills`
- `agentFacing.recommendedByIntent`
- `agentFacing.menuOrder`
- `agentFacing.presentationDefaults`
- 每个 skill 的 `entry_class`
- 每个 skill 的 `class_priority`

这层元数据的目的不是替代 `SKILL.md`，而是让不同 agent 在做入口暴露时，优先拿同一份公共分类，而不是各自手写一套菜单逻辑。

尤其是：

- `recommendedByIntent` 用来回答“用户说的是哪类意图，应该先推荐哪个 skill”
- `menuOrder` 用来回答“同一组 skill 在不同 agent 里应该按什么顺序暴露”
- `presentationDefaults` 用来回答“某个 agent 默认更适合用什么调用形态、优先高亮哪些 section”
- `entry_class` 用来回答“这个 skill 属于首用入口、主链还是收口层”
- `class_priority` 用来回答“同一 `entry_class` 内谁排前面”

注意这层语义边界：

- `menuOrder` 是 section 级的权威顺序
- `class_priority` 不是全局排序，不用来覆盖 `closeout`、`incident` 这类混合 section 的顺序
- 如果某个 agent 要渲染一个 section，先看 `menuOrder`
- 如果某个 agent 要临时生成“同类 skill 列表”，再看 `entry_class + class_priority`

## 当前阶段的取舍

当前阶段明确做这个取舍：

- **优先**：skill 语义和 agent 一致性
- **次优先**：安装和 CLI 体验

这意味着：

- CLI 可以先弱一点
- 只要 skill 契约和 agent 入口一致，产品就还在往正确方向长
- 真正危险的是 agent 实现分叉，而不是少一个 CLI 命令

## 第一轮 Done 标准

- 团队知道哪些东西跨 agent 不能变
- 团队知道哪些东西可以做 agent 适配
- 新增 skill 时有统一的 agent 检查清单
- 不再默认把 CLI 当成 PrimeFlow 的唯一核心入口

更具体的 `decision / next_skill / fallback` 对照，可直接看 [`docs/decision-matrix.md`](./decision-matrix.md)。
