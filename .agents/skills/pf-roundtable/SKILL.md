---
name: pf-roundtable
description: "方向收敛 skill。支持 brainstorm / align / challenge 三种模式，用于从零探索、快速对齐或反方审视现有方案。"
layer: decision
owner: roundtable
inputs:
  - task_description
  - constraints
outputs:
  - roundtable_report
  - direction_decision
entry_modes:
  - from-scratch
  - aligned-offline
---

# Roundtable

## 一句话定义

方向收敛中枢——通过 Socratic 追问和多角色内部预判，把模糊问题、已有方向或现成方案压成清晰结论。

## 为什么这个 skill 存在

跳过 roundtable 会让 agent 把"用户当前最响的那句话"当作方向，而不是"这轮真正值得做的事"。没有方向收敛，后面所有执行都建立在一个从未被质疑的假设上。roundtable 存在是为了在资源投入之前，先把这个假设暴露出来。

## 定位

当真正卡住的是这些问题时，进入 roundtable：
- 先做什么
- 哪条路更值
- 这轮该做大还是做小
- 要不要现在做
- 看起来像实现问题，其实先要讨论方向

当这些问题已经清楚时，不要进入 roundtable，直接去 writing-plan。

## 三种模式

| 模式 | 何时用 | 目标 |
|------|-------|------|
| `brainstorm` | 从零开始，问题还没压定 | 发现方向，形成候选路径 |
| `align` | 线下或上游已有方向，需要快速对齐 | 补齐前提、边界和最小闭环 |
| `challenge` | 方案已定，但想做反方审视 | 找风险、盲区、被忽略的代价 |

模式选择原则：

- 任务从零开始：默认 `brainstorm`
- 线下已经讨论过：优先 `align`
- 已有方案但不想盲目执行：进入 `challenge`

### 快速决策树

按这三题判断：

1. 当前是不是还没有可执行方向？
   是 → `brainstorm`
2. 已有方向是否基本成立，只需要补齐边界、依赖和最小闭环？
   是 → `align`
3. 已有方向是否看起来能做，但你担心风险、代价或遗漏？
   是 → `challenge`

灰区处理：

- 线下讨论过，但你不确定旧结论现在还适不适用：先 `challenge`
- 看起来方向清楚，但还说不出这轮最小闭环：先 `align`
- 问题还散着，连“这轮到底决定什么”都压不出来：回到 `brainstorm`

## 不干什么

- roundtable 管方向，不写执行任务
- roundtable 不做技术设计（那是 writing-plan 或 design 的事）
- roundtable 不做代码实现
- roundtable 不做质量关口

## 角色池

角色定义以内为准，不需要外部文件。

### 角色定义

| 角色 | 职责描述 | 代表问题 |
|------|---------|---------|
| `product-manager` | 产品价值、用户需求、优先级取舍 | 这个功能对用户真的有用吗？ |
| `software-architect` | 架构决策、技术债务、扩展性 | 这个设计能撑住未来三个月的复杂度吗？ |
| `frontend-engineer` | 前端实现可行性、兼容性、UX 可达性 | 这个交互在前端能干净地实现吗？ |
| `backend-engineer` | 后端实现可行性、数据一致性、API 设计 | 这个接口契约和数据模型合理吗？ |
| `sre` | 运维稳定性、监控告警、容错恢复、依赖可靠性 | 这个上线后能放心跑吗？出问题怎么发现？ |
| `security-architect` | 安全边界、权限模型、数据保护 | 这个改动有安全漏洞吗？ |

### 调度约定

- `ux-researcher`、`incident-response-commander`、`code-reviewer`、`delivery-owner` 按需临时激活，无需预定义
- 默认激活 3 个角色
- 复杂问题扩到 4-5 个
- 非常简单的问题至少 2 个角色 + moderator

## 角色调度规则

角色不是越多越好，而是要和模式匹配：

- `brainstorm`：更重产品、架构、实现可行性
- `align`：更重边界、依赖、当前轮次最小闭环
- `challenge`：更重安全、可靠性、被排除路径和选错代价

## 工作流：三个阶段严格分离

### 阶段 1：内部预判（不对用户可见）

在向用户提问之前，先在内部完成：

1. **议题压定**：把当前问题压成一句真正要决定的话
2. **模式确认**：这次是 `brainstorm / align / challenge` 的哪一种
3. **激活席位**：选择 3-5 个最相关角色
4. **内部预判**：每个角色形成 `Position` + `Reason` + `Risk`

这轮预判默认不直接给用户看。它的作用是帮助 moderator 知道"该问什么"。

### 阶段 2：Socratic 追问（对用户可见）

向用户发起苏格拉底提问。一次只问 1 个。

典型问题方向：
- 我们现在到底在解决真问题，还是表象？
- 如果这条路错了，最贵的代价是什么？
- 最近那条看起来也合理的路径，为什么现在不选？
- 这轮真正最不能接受的失败是什么？
- 如果必须缩到最小闭环，哪一部分最先被保留？

至少推进 3 个关键问题。

## 合规锚点

> **最终报告只能在问题阶段结束后出现，不得提前输出。** 即使你感觉方向已经很明显，也必须先完成至少 3 个 Socratic 问题的循环。提前输出报告意味着你跳过了最重要的一步。
>
> **内部预判阶段对用户不可见。** 不要把 "role-a 认为..." 的内部讨论直接显示给用户。它的作用是帮你知道该问什么，不是作为报告的一部分。
>
> **"用户说'你定就好'"不是方向收敛。** 这种情况下，moderator 必须基于已有信息强制给出一个带风险的结论，而不是继续问或假装已经收敛。

### 问题阶段出口条件

满足任一条件，即可结束追问并进入最终报告：

- 已经得到足够信息，可以形成唯一方向结论
- 虽然仍有分歧，但已经能明确“这轮先不做什么”
- 用户连续 2 次只给出“继续”“你定”“都可以”这类低信息回答，此时 moderator 必须基于现有信息强制收敛
- 用户明确表示不想继续追问，此时用当前已知信息给出带风险披露的最终报告

如果信息仍明显不足，且继续推进会误导后续执行：

- 输出当前缺失点
- 将 `escalate` 设为 `true`
- 不要伪装成已经收敛

### 阶段 3：最终报告（仅在问题阶段结束后出现）

```markdown
## Roundtable 最终报告

**模式**：[brainstorm / align / challenge]
**议题**：[一句真正要决定的话]

**激活席位**：role-a, role-b, role-c

### 角色观点
- role-a：[简短观点，1-2句]
- role-b：[简短观点，1-2句]
- role-c：[简短观点，1-2句]

### 总结
- **共识**：[1-2句]
- **分歧**：[列出分歧点]

### 结论
- **决定**：[唯一方向结论]
- **原因**：[为什么是这个方向]
- **被排除路径**：[排除了哪些其他方向，为什么]
- **选错代价**：[如果这个方向错了，最贵代价是什么]

### 下一步
- **下一 skill**：writing-plan
- **进入条件**：方向已定，范围需明确
```

## 前置条件检查

在进入 roundtable 之前，自查：

- [ ] 问题确实是方向性问题，不是已经清楚可以写计划的问题
- [ ] 没有可以直接执行的块（否则该去 implement）
- [ ] 不是根因不明的问题（那是 diagnose）
- [ ] 不是缺证据的问题（那是 verify）

如果以上任一为真，不要进入 roundtable。

## Decision 契约

**decision**: roundtable-aligned
**confidence**: 0.9
**rationale**: 当前议题已按对应模式完成收敛，角色分歧已暴露，下一步不再需要继续讨论方向
**fallback**: 如果A方向失败，回退到完整版A方案
**escalate**: false
**next_skill**: writing-plan
**next_action**: 进入 writing-plan，产出可执行块

## 状态更新

```bash
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "roundtable" >/dev/null
$_PF_CLI state set last_decision "$_DECISION" >/dev/null
$_PF_CLI state set artifacts.roundtable_mode "$_ROUNDTABLE_MODE" >/dev/null

# Exit Protocol
case "$_DECISION" in
  roundtable-aligned)
    _EXIT_CODE="ok"
    _EXIT_NEXT="writing-plan"
    _EXIT_REASON="方向已收敛"
    ;;
  roundtable-deferred)
    _EXIT_CODE="deferred"
    _EXIT_NEXT="roundtable"
    _EXIT_REASON="需要更多讨论"
    ;;
  roundtable-escalate)
    _EXIT_CODE="escalate"
    _EXIT_NEXT=""
    _EXIT_REASON="方向性分歧无法裁决"
    ;;
esac
$_PF_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

> 如果 roundtable 最终真的落成文档，再额外写入真实 `roundtable_report` 路径；不要预写占位路径。

## Telemetry

```bash
echo "{\"skill\":\"roundtable\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_DECISION\",\"confidence\":0.9,\"mode\":\"$_ROUNDTABLE_MODE\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 内部预判和用户可见输出已分开
- [ ] 模式已经明确（brainstorm / align / challenge）
- [ ] Socratic 提问至少推进了 3 个
- [ ] 问题阶段出口条件已满足，或已明确 escalate
- [ ] 问题阶段和最终报告阶段严格分离
- [ ] 最终报告只在问题结束后出现
- [ ] 激活席位与问题真的相关
- [ ] 有唯一方向结论
- [ ] 有被排除的路径
- [ ] 有下一步 skill
