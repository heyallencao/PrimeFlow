---
name: pf-knowledge
description: "轻量知识复利系统。先 retrieve，值得时再写入，优先更新已有知识而不是堆新文档。"
layer: support
owner: knowledge
inputs:
  - release_decision
  - session_artifacts
outputs:
  - knowledge_doc
  - retrieve_results
---

# Knowledge

## 一句话定义

知识复利中枢——把这次解决问题的过程变成下次遇到类似问题时的 2 分钟查找，而不是再花 30 分钟重做研究。

## 为什么这个 skill 存在

知识库最常见的失败模式有两种：一是什么都不写，经验只活在当次会话里；二是什么都写，知识库变成噪音堆，未来 agent 找不到有用的东西。knowledge 的存在是为了把这轮解决问题的经验，转化成未来 agent 可以在 2 分钟内发现并复用的资产——而不是增加一个让人找不到的文档。

## 定位

当 release 已完成（发布决策已做出），任务要结束时，进入 knowledge。

当还需要继续工作时，不要进入 knowledge。

knowledge 不是“每次都写一篇文档”，而是：
- 先判断值不值得沉淀
- 先看知识库里有没有
- 有就更新，没有再新建

## 合规锚点

> **先 retrieve，再 write。** 在打开任何编辑器之前，先搜索 `docs/solutions/`。如果发现高度重叠的已有文档，更新它，不要新建。知识库的质量靠去重维护，不靠堆积。
>
> **skip 是合法且有价值的结论，不是失败。** 如果这次修复不具备复用价值，直接 skip，不要为了"显得完整"而制造低质量文档。一个 skip 决策说明 knowledge skill 正在做判断，而不是机械执行。
>
> **写入的前提是：问题已解决 + 验证已通过 + 根因非显而易见 + 未来大概率再遇到。** 缺少任何一条，考虑 skip。

## 核心能力

### 1. Retrieve（检索优先）

先搜索已有知识，看这次是否其实只是命中已有模式。

### 2. 写入（值得时记录）

如果本次有复用价值，再把经验写入 `docs/solutions/`。

### 3. Refresh（优先更新）

检查是否有已存在的文档需要更新，避免重复堆积。

## 轻量分流

knowledge 结束时，输出三种结果之一：

| 结果 | 何时用 |
|------|-------|
| `skip` | 只是简单修复、无复用价值，不值得写 |
| `update` | 与已有知识高度重叠，应补充或修订旧文档 |
| `create` | 有明确新模式、新根因或新实践，值得新建文档 |

## 写入：记录知识文档

### 判断：这个经验值得写吗？

值得写的标准：
- 不是简单 typo 或显而易见的错误
- 问题已解决且验证通过
- 有非显而易见的根因或解决方案
- 未来在 `writing-plan / review / diagnose` 中大概率会再次遇到

如果只是简单问题，直接 `skip`，不要为了“完整”而制造知识噪音。

### 判断：Bug Track 还是 Knowledge Track？

```markdown
# Bug Track（有具体问题的解决）
# Knowledge Track（没有具体问题，是实践指导）
```

### Bug Track 文档格式

```markdown
---
name: [slug]
type: bug
category: [runtime-errors|performance-issues|security-issues|...]
problem_type: [具体问题类型]
module: [涉及的模块]
date: YYYY-MM-DD
---

## Problem
[1-2句话描述问题]

## Symptoms
[可观察的症状：错误信息、行为描述]

## What Didn't Work
[尝试过但没用的方案 + 为什么没用]

## Solution
[具体修复方案 + 代码示例]

## Why This Works
[根因 + 为什么这个方案能解决]

## Prevention
[怎么预防类似问题再次发生]
```

### Knowledge Track 文档格式

```markdown
---
name: [slug]
type: knowledge
category: [patterns|workflows|conventions|...]
module: [涉及的模块]
date: YYYY-MM-DD
---

## Context
[什么情境引发这条指导]

## Guidance
[实践建议 + 代码示例]

## Why This Matters
[这么做的理由和影响]

## When to Apply
[适用条件]
```

## Retrieve：先查有没有

当需要判断是否写入前，先做轻量检索：

```bash
# 搜索 docs/solutions/ 中的相关文档
# 先用关键词定位，不要先读整个知识库
echo "=== Knowledge Retrieve ==="
echo "Search: [关键词]"
```

### 检索策略

1. 先用关键词 grep / rg 定位文件
2. 只读匹配文件的前 30 行 frontmatter 做筛选
3. 完全读取中度/高度匹配的文件
4. 返回：相关文档列表 + 可复用要点 + 是否建议 update

## Refresh：检查重叠

在决定写入新文档之前，先检查是否已有相关文档：

```bash
# 搜索相关已有文档
# 检查：新文档与已有文档的重叠度

# 如果重叠度高（同一问题 + 同一根因 + 同一方案）：
# → 更新已有文档，不创建重复

# 如果重叠度低：
# → 创建新文档
```

### 重叠度评分

| 维度 | 匹配 | 不匹配 |
|------|------|--------|
| 问题陈述 | +1 | 0 |
| 根因 | +1 | 0 |
| 解决方案 | +1 | 0 |
| 引用文件 | +1 | 0 |
| 预防规则 | +1 | 0 |

- 4-5 维度匹配 → High（更新已有文档）
- 2-3 维度匹配 → Moderate（创建新文档，标记需要后续整合）
- 0-1 维度匹配 → Low（正常创建）

## Discoverability Check

写入知识文档后，检查知识库是否可以被未来 agent 发现：

```bash
# 检查知识库是否被引用
if ! grep -q "docs/solutions" AGENTS.md CLAUDE.md 2>/dev/null; then
  echo "Discoverability: docs/solutions/ is not referenced in AGENTS.md or CLAUDE.md"
  echo "手动添加以下内容到 CLAUDE.md 或 AGENTS.md 的适当位置："
  echo ""
  echo "  ## 知识库"
  echo "  知识库位于 docs/solutions/，遇到类似问题时优先检索。"
  echo ""
fi
```

> 此检查不自动修改文件，以避免未经授权的变更。如发现未引用，请复制上方内容手动添加。

## Auto-Invoke 触发

当对话中出现这些短语时，主动提示用户运行 knowledge skill：

**中文触发短语：**
- "问题解决了"
- "搞定了"
- "搞定了！"
- "修好了"

**英文触发短语：**
- "that worked"
- "it's fixed"
- "working now"
- "problem solved"

提示方式：简洁说明这次解决了什么问题；Claude / Codex / Gemini 统一用 `/pf-knowledge`。

## Decision 契约

**decision**: [skip | update | create]
**confidence**: 0.9
**rationale**: 已先检索已有知识；若值得沉淀，则已按重叠度决定更新或新建，避免知识库膨胀
**fallback**: 如果发现高重叠（4-5维度匹配），更新已有文档而非创建重复；如果复用价值不足，直接 skip
**escalate**: false
**next_skill**: DONE
**next_action**: 任务结束

## 状态更新

```bash
_KNOWLEDGE_DECISION="${KNOWLEDGE_DECISION:?set KNOWLEDGE_DECISION to knowledge-skip|knowledge-update|knowledge-create}"
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set current_stage "knowledge" >/dev/null
$_PF_CLI state set last_decision "$_KNOWLEDGE_DECISION" >/dev/null

# Exit Protocol（knowledge 是终端 skill）
case "$_KNOWLEDGE_DECISION" in
  knowledge-skip)
    _EXIT_CODE="ok"
    _EXIT_REASON="知识复用价值不足，已跳过"
    ;;
  knowledge-update|knowledge-create)
    _EXIT_CODE="ok"
    _EXIT_REASON="知识已归档到文档"
    ;;
esac
$_PF_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_PF_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_PF_CLI state set next_skill "" >/dev/null
```

> 只有在实际创建或更新知识文档时，才补写真实 `artifacts.knowledge_doc` 路径；不要预写占位路径。

## Telemetry

```bash
echo "{\"skill\":\"knowledge\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_KNOWLEDGE_DECISION\",\"confidence\":0.9,\"type\":\"$_KNOWLEDGE_TYPE\",\"overlap_score\":${OVERLAP_SCORE:-0.0},\"related_docs\":${RELATED_DOCS:-0}}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 先做了 retrieve，不是直接开写
- [ ] 判断了这个经验值不值得写
- [ ] 分类正确（bug track / knowledge track）
- [ ] 重叠检查已执行
- [ ] 高重叠时更新已有文档，不是创建重复
- [ ] 低价值问题已允许 skip，没有制造噪音
- [ ] Bug track 有根因分析，不只是解决方案
- [ ] Knowledge track 有适用条件
- [ ] 有 Prevention/When to Apply 等实践指导
