---
name: pf-help
description: "PrimeFlow 首次使用入口。做 onboarding、场景分流和入口建议，不替代 orchestrate 的真实路由职责。"
layer: support
owner: help
inputs:
  - task_description
  - context
outputs:
  - entry_recommendation
  - suggested_skill
entry_modes:
  - from-scratch
  - aligned-offline
  - plan-ready
  - build-ready
  - release-ready
  - incident
---

# Help

## 30 秒快速入口

第一次用？选你现在的情况：

| 我现在的情况 | 直接用这个 |
|---|---|
| 有新想法/需求，从零开始 | `/pf-orchestrate` |
| 已有计划，要快速执行 | `/pf-writing-plan` |
| 发现了 bug，要判断怎么处理 | `/pf-bug-triage` |
| 代码写完了，要验证 | `/pf-verify` |
| 要做 code review | `/pf-review` |
| 要整理 PR 信息 | `/pf-pr-prep` |
| 不确定从哪开始 | `/pf-orchestrate`（它会帮你判断） |

> **所有 agent 统一使用 `/pf-*`：**
> - Claude Code：`/pf-help`、`/pf-orchestrate`
> - Codex：`/pf-help`、`/pf-orchestrate`
> - Gemini：`/pf-help`、`/pf-orchestrate`
>
> 公共 `pf-*` skill 安装在 `~/.agents/skills/pf-*`。

---

## 一句话定义

PrimeFlow 的首次使用入口——先把”我该从哪开始”讲清楚，再把用户导向现有 skill。

## 为什么这个 skill 存在

第一次使用一个有 18 个 skill 的框架，最容易的放弃理由是”不知道从哪里开始”。help 的存在是为了把这个摩擦降到最低——不是告诉用户 PrimeFlow 的全部，而是给出一个”你现在就可以说的下一句话”。

## 定位

当用户第一次接触 PrimeFlow，或不确定当前该调用哪个 skill 时，进入 help。

当已经明确知道自己要走哪一步时，不要进入 help，直接去对应 skill。

## 职责边界

### 负责什么

- 用场景语言解释 PrimeFlow 怎么开始
- 根据用户当前状态推荐一个现有 skill
- 给出最小可执行入口，而不是一整套方法论讲解
- 把不确定的用户导向 `orchestrate` 或明确的既有 stage skill

### 不负责什么

- help 不是新的全局路由中枢
- help 不判断正式 `entry_mode`
- help 不维护独立 workflow state
- help 不替代 `orchestrate`、`roundtable`、`writing-plan`

## 合规锚点

> **只给一个推荐，不给候选列表。** 列出 3 个"都可以"的入口，等于没有推荐。用户需要的是一个"从这里开始"的明确指向。
>
> **help 不是第二个 orchestrate。** 不得在 help 里做 entry mode 判断或维护 workflow state。判断工作交给 orchestrate 去做。
>
> **必须给出"下一句怎么说"。** 一个只有"推荐 orchestrate"但没有"具体怎么触发"的 help，对用户没有帮助。

## 默认原则

如果用户主要卡在"不知道该用哪个 PrimeFlow skill 开始"：

- 默认推荐从 `orchestrate` 开始

如果用户有想法或目标，但方向还没收敛，真正卡点是"先做什么 / 做哪条路 / 这轮最小闭环是什么"：

- 直接推荐从 `roundtable` 开始

如果用户已经说清楚自己处于哪个阶段：

- 直接推荐对应 skill，不把用户强行带回 `orchestrate`

## Agent 调用方式

所有 agent 统一使用 `/pf-*` 形式：

- Claude Code：`/pf-help`
- Codex：`/pf-help`
- Gemini CLI：`/pf-help`

不管 agent 如何触发，help 都只推荐一个主入口，并把后续执行交还给现有主链。

## 场景速查表

| 你现在的情况 | 推荐 skill | 为什么 |
|-------------|-----------|--------|
| 完全不知道从哪开始 | `orchestrate` | 让 PrimeFlow 先判断接入模式和下一步 |
| 需求还散着，需要想清楚方向 | `roundtable` | 先收敛方向，再决定怎么做 |
| 方向已定，只差压成当前块 | `writing-plan` | 先把范围、停线和后继路由写清楚 |
| 已经在实现，想先锁行为边界 | `test-first` | 先定义失败测试，再进入实现 |
| 块已经清楚，现在就该动手 | `implement` | 完成当前块，不扩范围 |
| 代码已有，想看是否真的站得住 | `verify` | 拿 fresh evidence，而不是只看 diff |
| 异常出现但根因还不清楚 | `diagnose` | 先调查，再修复 |
| 准备做正式质量关口 | `review` | 基于证据做放行判断 |
| 需要真实浏览器路径验证 | `qa` | 跑关键用户路径或运行时验证 |
| 要做交付、发布或诚实收口 | `ship` / `release` | 分别处理交付执行和发布结论 |
| 想暂停、切会话、恢复现场 | `handoff` | 冻结并恢复工作现场 |

## 最小 Golden Paths

### 1. 新任务，不知道从哪进

`help -> orchestrate -> roundtable -> writing-plan`

### 2. 方案已定，只差正式推进

`help -> writing-plan -> test-first / implement`

### 3. 代码已写一半，要接着收口

`help -> verify -> review -> qa? / ship / release`

### 4. 系统坏了，先判断怎么处理

`help -> diagnose`

## 推荐话术

如果用户不知道怎么开口，可以直接这样说：

```text
/pf-help 帮我判断这个任务该从哪个 skill 开始。
```

或者：

```text
/pf-verify 我现在是 build-ready，先验证当前改动是否达到停线。
```

再或者：

```text
/pf-roundtable 我想做一个 AI agent，但还没定清楚目标用户、使用场景、产品边界和最小闭环，先帮我收敛方向。
```

## 工作流

### 步骤 1：判断用户是不是真的需要 help

- 如果用户已经点名具体 skill，直接去那个 skill
- 如果用户明确描述了当前阶段，推荐对应 skill
- 如果用户的问题本质上是在收敛方向，推荐 `roundtable`
- 如果用户的问题本质上是在"不知道该从哪个 skill 开始"，默认导向 `orchestrate`

### 步骤 2：只给一个推荐入口

- 不给一长串并列候选
- 优先给当前最合理的一个 skill
- 如果有次优路径，只作为补充说明，不替代主推荐

### 步骤 3：交回主链

- 一旦给出入口建议，后续工作回到现有 skill 执行
- help 不继续持有路由控制权

## 输出格式

```markdown
## Help 建议

**当前判断**：[一句话说明你现在像处于哪个场景]
**推荐入口**：[`orchestrate` / 其他现有 skill]
**原因**：[为什么现在从这里开始最合适]

---
**复制下面这句话，直接发给我：**

> [可直接粘贴使用的完整起手句，包含 skill 名称和任务描述]

---
```

> **格式规则**：`下一句怎么说` 必须用引用块 `>` 包裹，让用户一眼就能识别”这就是我要复制的那句话”。不要只写 skill 名称，要给出完整可直接使用的句子。

## 最小输出示例

```markdown
## Help 建议

**当前判断**：你现在更像是”有想法，但方向和最小闭环还没收敛”。
**推荐入口**：`roundtable`
**原因**：当前真正缺的不是 stage 路由，而是先把做什么、先不做什么和最小闭环压清楚。

---
**复制下面这句话，直接发给我：**

> /pf-roundtable 我想做一个 AI agent，但还没定清楚目标用户、使用场景、产品边界和最小闭环，先帮我收敛方向。

---
```

> **所有 agent 统一使用 `/pf-*` 格式**，无需区分具体 agent。

## 首次使用增强

当用户看起来是第一次使用（没有 `.primeflow/state.json`，或者说了”刚装好”、”第一次用”），在 Help 建议末尾追加：

```markdown
---
**新用户提示**
5 分钟就能跑完第一个真实任务 → 参考 `~/.agents/skills/PrimeFlow/docs/quickstart.md`
---
```

## Decision 契约

**decision**: help-guided
**confidence**: 0.9
**rationale**: 已基于用户当前描述给出一个最小可执行入口；help 只做 onboarding 和场景分流，不替代正式路由
**fallback**: 如果 help 无法可靠判断当前阶段，默认回到 orchestrate
**escalate**: false
**next_skill**: orchestrate 或用户当前最匹配的现有 skill
**next_action**: 按推荐入口进入真实 workflow

## 状态更新

```bash
_PF_CLI="${PRIMEFLOW_CLI:-${HOME}/.agents/skills/PrimeFlow/primeflow}"

# help 不维护独立 workflow state，只记录一次轻量决策与建议
$_PF_CLI state set last_decision "help-guided" >/dev/null 2>&1 || true
$_PF_CLI state set artifacts.last_help_recommendation "${SUGGESTED_SKILL:-orchestrate}" >/dev/null 2>&1 || true
```

## Telemetry

```bash
mkdir -p .primeflow/telemetry/events
echo "{\"skill\":\"help\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"help-guided\",\"next_skill\":\"${SUGGESTED_SKILL:-orchestrate}\"}" >> .primeflow/telemetry/events/$(date +%Y-%m).jsonl
```

## 质量检查清单

- [ ] 没有把 help 写成第二个 orchestrate
- [ ] 只推荐了一个主入口
- [ ] 已说明为什么从这里开始
- [ ] 已把后续执行交还给现有 skill
