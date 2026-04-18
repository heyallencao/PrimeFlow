---
name: pf-docs-writer
description: "事实文档整理器。把已完成的实现、验证或发布结果压成 changelog、ADR、migration note 等稳定文档。"
layer: support
owner: docs-writer
inputs:
  - session_artifacts
  - review_report
  - release_statement
outputs:
  - docs_draft
  - doc_type
entry_modes:
  - build-ready
  - release-ready
---

# Docs Writer

## 一句话定义

事实文档整理器——把已经完成并有证据支撑的结果，压成适合团队复用和传播的稳定文档。

## 为什么这个 skill 存在

文档最常见的问题不是没写，而是写了不实的内容。一个"已验证"的 changelog 条目，其实对应的验证从未执行；一个"已决定"的 ADR，其实决策还在讨论中。docs-writer 的存在是为了确保每一个文档声明都可以追溯到实际发生的事情，不是对未来的预期，也不是对过去的美化。

## 定位

当实现、验证、review 或 release 已经完成，现在需要把结果整理成 changelog、ADR、migration note、maintainer note 等文档时，进入 docs-writer。

当还没有稳定事实或证据时，不要进入 docs-writer。

当你在判断“值不值得沉淀知识”时，去 `knowledge`，不要让 docs-writer 代替它。

## 合规锚点

> **文档里的每一个 claim 必须追溯到已发生的事实。** 在写"已验证"之前问：验证是什么时候跑的，结果是什么？在写"已决定"之前问：决策是在哪里做出的，谁做出的？
>
> **没有稳定事实前，不得进入 docs-writer。** 如果实现还没完成、验证还没跑、review 还没通过，先完成对应步骤，再来整理文档。
>
> **docs-writer 不做知识价值判断。** "这个值不值得沉淀"是 knowledge 的工作。docs-writer 只负责把"已经决定要写"的内容整理好。

## 职责边界

### 负责什么

- 根据现有事实生成稳定文档草稿
- 选择合适的文档类型
- 压缩实现结果、验证结论、风险和边界
- 降低“事情做完了但文档没人写”的摩擦

### 不负责什么

- docs-writer 不决定知识是否值得沉淀
- docs-writer 不做发布决策
- docs-writer 不编造未完成的验证或结果
- docs-writer 不替代 `knowledge`、`release`

## 适合的文档类型

常见输出类型：

- `changelog`
- `adr`
- `migration-note`
- `maintainer-note`
- `handoff-note`

## Agent 差异注意事项

- Claude / Codex / Gemini 统一使用 `/pf-docs-writer`
- 不同 agent 可以有不同展示或补全体验，但公开入口统一为 `/pf-*`
- 不管 agent 怎么包装输出，docs-writer 只能整理已确认事实，不能代替 `knowledge` 的沉淀判断，也不能代替 `release` 的发布结论

## 选择规则

- 面向用户或团队同步改动内容 → `changelog`
- 记录为什么选了某个方案 → `adr`
- 涉及配置、接口、升级影响 → `migration-note`
- 面向维护者解释实现细节或后续注意事项 → `maintainer-note`
- 为下一位执行者整理上下文 → `handoff-note`

## 工作流

### 步骤 1：先收集已确认事实

- 做了什么
- 为什么做
- 如何验证
- 还有哪些限制

没有事实依据的内容不要写进文档。

### 步骤 2：选文档类型

- 不要一上来就写大而全长文
- 先选最适合当前目的的一种类型

### 步骤 3：压缩成稳定结构

- 背景
- 结果
- 验证
- 风险或限制
- 后续注意事项

### 步骤 4：保持诚实

- 没做过的验证不能写成“已验证”
- 还没定的事情不能写成“已决定”

## 输出格式

```markdown
## Docs Draft

**doc_type**：[changelog / adr / migration-note / maintainer-note / handoff-note]
**标题**：[文档标题]

### Context
[背景]

### What Changed
[改了什么]

### Evidence
[验证或依据]

### Risks / Limits
[风险、限制、未覆盖项]

### Notes
[后续注意事项]
```

## 最小输出示例

```markdown
## Docs Draft

**doc_type**：`maintainer-note`
**标题**：PrimeFlow 高频直达 skill 初版落地

### Context
为降低首次使用门槛，PrimeFlow 新增了一组高频直达 skill，并补齐了入口文档。

### What Changed
新增 `help`、`brief`、`bug-triage`、`pr-prep`、`docs-writer`，并更新 README、golden paths、manifest 元数据。

### Evidence
已运行 smoke test；新增 skill 已完成 manifest 注册；关键文档已更新。

### Risks / Limits
不同 agent 的入口体验仍有差异，当前优先保证 skill 语义一致。

### Notes
后续可继续补 agent 侧入口展示和更细的输出模板。
```

## Decision 契约

**decision**: docs-draft-ready
**confidence**: 0.9
**rationale**: 已基于已确认事实生成对应文档草稿，并对证据、风险和未完成项保持诚实披露
**fallback**: 如果缺少事实依据，先回到对应的 verify / review / release 产物补齐信息
**escalate**: false
**next_skill**: release / knowledge / DONE
**next_action**: 使用文档草稿继续对外同步、归档或交接

## 状态更新

```bash
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"
$_PF_CLI state set last_decision "docs-draft-ready" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.docs_writer_status "ready" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"docs-writer\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"docs-draft-ready\",\"doc_type\":\"${DOC_TYPE:-maintainer-note}\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 没有把 docs-writer 写成 knowledge
- [ ] 没有把 docs-writer 写成 release
- [ ] 没有编造未完成的事实
- [ ] 文档类型选择有依据
