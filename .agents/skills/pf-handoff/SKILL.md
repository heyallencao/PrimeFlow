---
name: pf-handoff
description: "跨会话交接 skill。用户明确表达要暂停、切会话、继续上一轮、恢复指定交接包或查看最近交接记录时使用。支持 handoff out / handoff in <id|latest> / handoff list。"
layer: orchestration
owner: handoff
inputs:
  - current_state
  - session_artifacts
outputs:
  - handoff_package
  - recovery_preview
---

# Handoff

## 一句话定义

把当前工作现场冻结成一个可恢复包，让下一会话不追问背景就能继续干活。

## 为什么这个 skill 存在

没有 handoff，跨会话的工作现场依赖"下一个 agent 运气够好能猜到上次做到哪了"。猜测不是恢复，它只是重新开始的慢速版本。handoff 的存在是为了让"切换会话"从信息损耗事件变成精确的状态传递。一个空模板比没有 handoff 更危险——它制造了"已交接"的假象。

## 定位

当用户明确要暂停、切换会话、交给其他 AI/人类、恢复上一轮，或查看最近交接记录时，进入 handoff。

handoff 不是总结报告，也不是聊天记录归档。  
它只做一件事：**冻结现场，恢复执行。**

## 不干什么

- handoff 不负责决定下一步 skill（那是 orchestrate 的事）
- handoff 不替代 state 管理
- handoff 不转储长聊天记录
- handoff 不在 `handoff in` 时直接执行下一步，必须先预览再确认

## 资源

- 脚本：`~/.agents/skills/PrimeFlow/orchestration/handoff/scripts/handoff_file.sh`
- 模板：`~/.agents/skills/PrimeFlow/orchestration/handoff/references/handoff-template.md`

## 双载体协议

每个 handoff 包有两个文件：

- `handoff.md`
  给下一会话直接阅读的交接包，必须包含 8 个槽位
- `snapshot.json`
  给 PrimeFlow 恢复状态和路由判断用的结构化快照

目录结构：

```text
.primeflow/handoff/<handoff_id>/
├── handoff.md
└── snapshot.json
```

## 支持的动作

### `handoff out`

触发信号：

- 先停一下
- 做个会话交接
- 当前现场先存一下
- 上下文快满了
- handoff out

### `handoff in <id|latest>`

触发信号：

- 继续刚才那一轮
- 恢复最近一次 handoff
- 恢复指定 handoff
- handoff in latest
- handoff in <id>

### `handoff list`

触发信号：

- 看看最近交接记录
- 列出最近 handoff
- handoff list

## 合规锚点

> **8 个槽位必须全部有实质内容，不是全填"未记录"。** 如果 8 个槽里有超过 2 个是"未记录"，说明这不是 handoff，是一个空模板。先补内容，再保存。
>
> **handoff in 之后不得直接执行下一步。** 必须先展示恢复预览，等待用户明确确认，才能继续。"感觉上下文够了"不算确认。
>
> **handoff 不是聊天记录归档。** 只写能帮下一会话继续干活的信息，删掉所有"过程叙述"。

## 八槽交接包

每份 `handoff.md` 必须包含：

1. 当前任务
2. 当前状态
3. 已完成
4. 关键决策
5. 关键约束
6. 关键文件
7. 下一步
8. 待确认

填写标准：

- 8 个槽位必须都有值
- 没内容时写 `未记录` 或 `无`
- `关键文件` 用 `path:line` + 一句话说明
- `下一步` 必须是动作句，不能写“继续推进”
- 只保留帮助下一会话继续干活的信息

## `handoff out` 工作流

### 步骤 1：创建 handoff 包

```bash
# 推荐：通过 PrimeFlow CLI 创建 handoff 包
# 若已全局安装，可把下行替换为 primeflow
_HANDOFF_DOC=$("${HOME}/.agents/skills/PrimeFlow/primeflow" handoff create "${_CURRENT_BLOCK:-primeflow-handoff}")
_HANDOFF_DIR=$(dirname "$_HANDOFF_DOC")
_HANDOFF_ID=$(basename "$_HANDOFF_DIR")
```

`create` 不只会建一个空模板，还会基于当前 `.primeflow/state.json` 预填一版 8 槽初稿。

### 步骤 2：写入 snapshot.json

`handoff create` 会自动同时生成：

- `handoff.md`
- `snapshot.json`

handoff skill 此时不需要再手工拼 `snapshot.json`。

### 步骤 3：检查并补强 handoff.md 八槽

`create` 已经会从 state 和现有 artifacts 填出一版可恢复初稿。  
handoff skill 这一步要做的是检查、补强和压缩，而不是从空白开始重写。

至少要确认这些内容已经写实：

- `当前任务`
  来源：`current_block`，没有就写当前任务主题
- `当前状态`
  来源：`current_stage` + 当前卡点
- `已完成`
  来源：最近已产出的 artifacts、已完成动作
- `关键决策`
  来源：`last_decision`
- `关键约束`
  来源：`risk_level`、scope boundary、已知限制
- `关键文件`
  来源：`plan_document`、`test_contract`、`review_report`、当前主要改动文件
- `下一步`
  来源：当前 `current_stage` 对应的恢复动作
- `待确认`
  来源：唯一 blocker，没有就写 `无`

### 步骤 4：压缩

- 保留事实、结论、动作、阻塞
- 删除过程性叙述
- 删除不能帮助下一会话继续执行的背景

### 步骤 5：固定输出

```text
Handoff saved.

  ID:   {handoff_id}
  File: .primeflow/handoff/{handoff_id}/handoff.md

  Next session -> handoff in {handoff_id}
```

## `handoff in <id|latest>` 工作流

### 步骤 1：解析目标

```bash
_HANDOFF_TARGET="${1:-latest}"
if [ "$_HANDOFF_TARGET" = "latest" ]; then
  _HANDOFF_DOC=$("${HOME}/.agents/skills/PrimeFlow/primeflow" handoff latest)
else
  _HANDOFF_DOC=$("${HOME}/.agents/skills/PrimeFlow/primeflow" handoff resolve "$_HANDOFF_TARGET")
fi
_HANDOFF_DIR=$(dirname "$_HANDOFF_DOC")
```

### 步骤 2：读取交接包

```bash
sed -n '1,40p' "$_HANDOFF_DIR/snapshot.json"
sed -n '1,60p' "$_HANDOFF_DOC"
```

### 步骤 3：给恢复预览

恢复预览至少覆盖：

- 当前任务
- 当前状态
- 关键文件
- 下一步
- 是否存在阻塞

推荐句式：

`我已恢复现场，下一步是：{handoff.md 中记录的下一步}。是否继续执行？`

### 步骤 4：等待确认

- 用户确认前，不执行下一步
- 用户拒绝时，停在恢复预览阶段
- 若 `待确认` 阻塞执行，只提 1 个最关键问题

## `handoff list`

执行：

```bash
"${HOME}/.agents/skills/PrimeFlow/primeflow" handoff list
```

## Decision 契约

**decision**: handoff-saved / handoff-previewed
**confidence**: 0.95
**rationale**: handoff 已保存或已恢复，下一会话可在显式确认后继续执行
**fallback**: 如果包损坏或缺字段，基于已有信息恢复，并提示缺失项
**escalate**: false
**next_skill**: `orchestrate`（handoff in 用户确认后）
**next_action**: handoff out 保存现场，或 handoff in 预览恢复

## 质量检查清单

- [ ] `handoff.md` 的 8 个槽位都已填写
- [ ] `handoff.md` 不是一份全是 `未记录` 的空模板
- [ ] `snapshot.json` 已写入
- [ ] 输出了 handoff ID
- [ ] `handoff in` 时先做了恢复预览
- [ ] 用户确认前没有直接执行下一步
- [ ] 交接包内容足以让下一会话继续干活
