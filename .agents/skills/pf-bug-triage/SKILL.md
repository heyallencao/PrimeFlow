---
name: pf-bug-triage
description: "异常快速分流器。先判断这是 spec 问题、实现 bug，还是需要回滚的事故，再导向 writing-plan / diagnose / ship。"
layer: execution
owner: bug-triage
inputs:
  - failure_description
  - context
  - recent_evidence
outputs:
  - triage_report
  - triage_result
entry_modes:
  - plan-ready
  - build-ready
  - incident
---

# Bug Triage

## 一句话定义

异常快速分流器——先判断问题属于哪一类，再把它送到正确的主链节点。

## 为什么这个 skill 存在

当系统出现问题时，agent 容易把所有"坏了"都送进 diagnose——即使有些问题根本不是 bug，而是 spec 定义的问题，或者应该先止损的线上事故。bug-triage 的存在是为了在消耗调查资源之前，先花 2 分钟判断"这是什么类型的问题"，确保下一步的资源投入方向是对的。

## 定位

当用户表达的是“坏了”“不对”“挂了”，但当前还不清楚这到底是 spec 问题、实现 bug，还是需要考虑回滚的事故时，进入 bug-triage。

当已经确认根因不明、需要正式调查时，去 `diagnose`。

当已经确认这是 spec 偏差时，去 `writing-plan`。

## 职责边界

### 负责什么

- 快速读取异常描述和当前证据
- 判断更像 `fail_spec`、`fail_bug` 或 `rollback_candidate`
- 推荐下一步进入 `writing-plan`、`diagnose` 或 `ship`
- 避免用户把所有“坏了”都直接送进 `diagnose`

### 不负责什么

- bug-triage 不做根因定位
- bug-triage 不做正式 verify
- bug-triage 不做代码修复
- bug-triage 不替代 `diagnose`、`verify`、`writing-plan`

## 合规锚点

> **triage 报告不是根因报告。** 你的输出是分流结论（spec-gap / implementation-bug / rollback-candidate），不是"为什么坏了"的解释。如果你发现自己在写根因分析，停下来，那是 diagnose 的工作。
>
> **没有最小证据不得给出分流结论。** 只有"坏了"两个字，不足以分流。至少要知道：现象、影响范围、当前预期。拿不到这些，先要求补充。
>
> **rollback-candidate 优先于深度调查。** 如果影响范围大、用户路径不可用、有数据或安全风险，先标 rollback-candidate，不要先聊根因。止损比理解原因更紧迫。

## 三种分流结果

| triage_result | 含义 | 路由到 |
|--------------|------|--------|
| `spec-gap` | 当前预期、done criteria 或范围定义有问题 | `writing-plan` |
| `implementation-bug` | spec 仍成立，但实现或行为没有达到它 | `diagnose` |
| `rollback-candidate` | 问题影响大、风险高，需要优先评估止损或回滚 | `ship` |

## 快速判断规则

### 用 `spec-gap`

当下面情况更成立时：

- 需求理解变了
- done criteria 本身写错了
- 当前实现其实符合代码，但不符合现在想要的结果
- 继续按原 spec 修只会把事情做偏

### 用 `implementation-bug`

当下面情况更成立时：

- 当前 spec 仍然正确
- 行为、测试或运行结果没达到已批准停线
- 问题看起来像逻辑错误、边界漏处理、状态问题、接口不一致

### 用 `rollback-candidate`

当下面情况更成立时：

- 线上或高影响环境出现严重回归
- 用户路径明显不可用
- 有数据、安全或稳定性风险
- 当前优先级是先止损，而不是先讨论为什么坏

## Agent 差异注意事项

- Claude / Codex / Gemini 统一使用 `/pf-bug-triage`
- 不同 agent 可以有不同展示或补全体验，但公开入口统一为 `/pf-*`
- 不管在哪个 agent 里，bug-triage 的输出都必须是分流结果，而不是根因报告或修复方案

## 工作流

### 步骤 1：先看证据够不够

- 如果只有一句“坏了”，先要求最小上下文
- 至少要知道：现象、影响范围、当前预期
- 如果完全没有证据，不要假装 triage 已完成

### 步骤 2：先问 spec 还对不对

先问这句：

> 如果保持当前 spec 不变，这个问题是不是仍然应该被修成原来定义的样子？

- 是 → 更像 `implementation-bug`
- 否 → 更像 `spec-gap`

### 步骤 3：判断是否需要先止损

如果问题已经是高影响运行时异常：

- 不先深聊根因
- 先标记为 `rollback-candidate`

### 步骤 4：交回主链

- `spec-gap` → `writing-plan`
- `implementation-bug` → `diagnose`
- `rollback-candidate` → `ship`

## 输出格式

```markdown
## Triage 报告

**问题现象**：[一句话]
**当前预期**：[预期应该怎样]
**影响范围**：[谁受影响，多严重]
**当前证据**：[已有的日志/测试/现象]
**triage_result**：[spec-gap / implementation-bug / rollback-candidate]
**推荐下一步**：[writing-plan / diagnose / ship]
**原因**：[为什么这样分流]
**仍缺什么**：[如果还有缺失信息]
```

## 最小输出示例

```markdown
## Triage 报告

**问题现象**：支付回调在生产环境偶发失败。
**当前预期**：已批准的支付回调流程应稳定成功，不应随机失败。
**影响范围**：影响部分真实支付请求，属于高影响运行时问题。
**当前证据**：用户反馈 + 线上错误日志摘要；尚无根因。
**triage_result**：`implementation-bug`
**推荐下一步**：`diagnose`
**原因**：当前 spec 仍成立，问题更像实现或运行时 bug，而不是范围定义错误。
**仍缺什么**：最小复现条件和最近失败日志样本。
```

## Decision 契约

**decision**: triage-complete
**confidence**: 0.85
**rationale**: 已基于当前异常描述与证据完成初步分流，并明确下一步应进入的主链节点
**fallback**: 如果后续证据推翻当前分流，回到 bug-triage 重新判断或直接进入更合适的 skill
**escalate**: false
**next_skill**: writing-plan / diagnose / ship
**next_action**: 按 triage_result 进入下一步

## 状态更新

```bash
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set last_decision "triage-complete" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.last_triage_result "${TRIAGE_RESULT:-implementation-bug}" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"bug-triage\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"triage-complete\",\"triage_result\":\"${TRIAGE_RESULT:-implementation-bug}\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 没有把 triage 写成 diagnose
- [ ] 没有把 triage 写成 verify
- [ ] 已明确分流结果和下一 skill
- [ ] 对证据不足的情况保持诚实
