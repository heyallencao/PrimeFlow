# Keystone 卓越化优化方案

> 历史规划说明：本文是阶段性优化草稿，不是当前产品契约文档。
> 当前真实 agent 契约：Claude / Codex / Gemini 统一使用 `/ks-*`，公共 skill 位于 `.agents/skills/ks-*`。

> 对标 superpowers (143K ⭐) 与 gstack (67.7K ⭐)，从"好用"迈向"让人分享给朋友"

**分析日期**：2026-04-09  
**基于分支**：main（含未提交 WIP 内容）  
**方案类型**：竞争力诊断 + 精准补位路径  
**目标**：不只是个人用，而是分享出去让别人觉得好用，提高个人影响力

---

## 一、真实现状（基于 main 分支完整内容）

> **注意**：首次分析基于 worktree（已提交快照），现已更正为 main 分支完整内容。

### 1.1 实际技能数量：18 个（含 vNext 已落地）

**已落地的 vNext 技能**（之前被误判为"只是规划"）：

| 技能 | 位置 | 状态 |
|------|------|------|
| `help` | `support/help/SKILL.md` | ✅ 已完成 |
| `brief` | `decision/brief/SKILL.md` | ✅ 已完成 |
| `bug-triage` | `execution/bug-triage/SKILL.md` | ✅ 已完成 |
| `pr-prep` | `operation/pr-prep/SKILL.md` | ✅ 已完成 |
| `docs-writer` | `support/docs-writer/SKILL.md` | ✅ 已完成 |

**已有基础设施**：
- `templates/`：5个模板（plan, test-contract, review-report, release-statement, incident-report）
- `examples/`：三端示例（claude.md, codex.md, gemini.md）
- `.agents/skills/`：18个 Codex 预生成技能目录（ks-* 格式）
- `keystone.manifest.json`：完整的17技能清单 + 三端配置
- `docs/golden-paths.md`：6条黄金路径
- `docs/installation.md`：完整安装说明（含 doctor / dry-run / --agents 多端）
- `docs/vnext-roadmap.md`：产品路线图

### 1.2 真实的优势护城河（依然领先同类）

| 维度 | Keystone | superpowers | gstack |
|------|-----------|-------------|--------|
| 状态驱动路由 | **56字段 state.json + 路由矩阵** | 无 | 无 |
| Decision Contract + 置信度 | **0.0-1.0，每个决策都有** | 无 | 无 |
| 灵活 Entry Mode | **6种入场模式** | 固定流程 | 固定流程 |
| 诚实退出约束 | **强制 fresh evidence** | 无 | 无 |
| Telemetry 系统 | **月度 JSONL + 可复盘** | 无 | 无 |
| 高频直达技能 | **18个（含5个独立入口）** | 14个 | 23个 |
| 三端支持 | **Claude / Codex / Gemini** | 多端 | 主要 Claude |
| 团队 Policy | **manifest + policy overlay** | 无 | 有但简单 |

---

## 二、精确差距（基于真实现状）

### 🔴 P0：直接阻止国际推广的问题

#### 差距1：所有 SKILL.md 是中文内容

**这是目前最大的单一障碍**。

现状：18个技能文件的章节标题和主体内容全部是中文：
```
一句话定义 / 不干什么 / 定位 / 前置条件检查 / 决策契约 / 质量检查清单
```

后果：
- 无法被 awesome-claude-code / awesome-claude-skills 国际列表收录
- 国际受众无法贡献 PR / Fork
- gstack 和 superpowers 的用户群完全无法触达
- 对标项目 README 第一屏：全英文，清晰直接

**需要改的文件**：18个 SKILL.md + `.agents/skills/` 下的18个同步文件

#### 差距2：README 缺少"第一眼震撼"

现状：README 已有双语内容、安装说明、技能列表，结构完整但**开场太平**。

对比：
- gstack 开场：*"I shipped 600,000 lines of production code in 60 days while running YC full-time"*
- superpowers 开场：聚焦"professional engineering methodology"价值

Keystone 当前开场没有一句让工程师停下来继续读的钩子。

**需要的**：一句能让工程师立刻产生共鸣的 tagline + 清晰的差异化对比表格

---

### 🟡 P1：影响"用得爽"的问题

#### 差距3：缺少真实浏览器自动化技能

gstack 的 `/browse` 是其核心卖点——真实 Chromium、100ms/command、截图即证据。

Keystone 的 `qa` 技能提到了 Playwright，但没有独立的 `browse` 技能作为展示层。

**机会**：当前环境已有 `mcp__Claude_Preview__*` 和 `mcp__Claude_in_Chrome__*` 工具，可以直接基于这些能力构建 `browse` 技能，无需重新实现 Playwright 层。

#### 差距4：没有 `security` 独立技能

gstack 有 `/cso`（OWASP Top 10 + STRIDE）。

Keystone 的 `review` 有 security-reviewer persona，但不够独立和显眼——无法作为"安全审计"来单独推广。

#### 差距5：没有 `retro` 技能（这实际上是 Keystone 最大的潜力差异化点）

gstack 的 `/retro` 是手动填写的复盘。

Keystone **有 Telemetry 系统**，可以做数据驱动的自动复盘——这是 gstack 做不到的。这个技能一旦落地，就是明显优于 gstack 的差异化点。

---

### 🟢 P2：影响长期影响力的问题

#### 差距6：没有社区发现机制

| 项目 | 发现渠道 |
|------|---------|
| superpowers | 官方插件市场 + awesome-claude-skills 收录 + 143K stars |
| gstack | gstacks.org 网站 + Product Hunt + HN |
| **Keystone 现状** | 只有 GitHub repo + 尚未发布 |

#### 差距7：没有传播素材

- 无 Terminal GIF 演示
- 无博客文章（中英文）
- 无官网
- 未提交 awesome-claude 系列列表

---

## 三、优化执行路径

### Phase 1：让现有内容可分享（1-2周）

**目标**：把18个已写好的技能变成"第一次看就觉得专业"的程度，让国际受众能读懂、想 star

#### 1.1 SKILL.md 英文化（P0 最优先）

**策略**：章节标题全英文，正文内容英文为主，结构保持不变，方法论深度完整保留。

标准化英文章节结构（替换所有中文章节名）：

| 原中文 | 改为英文 |
|--------|---------|
| 一句话定义 | `## What This Skill Does` |
| 定位 / 何时进入 | `## When to Enter` |
| 不干什么 | `## When NOT to Enter` |
| 前置条件检查 | `## Prerequisites` |
| 工作方式 | `## How It Works` |
| 决策契约 | `## Decision Contract` |
| 状态更新 | `## State Update` |
| Telemetry | `## Telemetry` |
| 质量检查清单 | `## Quality Checklist` |

**执行顺序**（按使用频率）：

Round 1（立即）：`orchestrate` → `review` → `implement` → `verify` → `diagnose`  
Round 2（第一周）：`writing-plan` → `test-first` → `roundtable` → `help` → `brief`  
Round 3（第二周）：`bug-triage` → `pr-prep` → `docs-writer` → `ship` → `release` → `qa` → `handoff` → `knowledge`

**同步**：`.agents/skills/ks-*/SKILL.md` 也需要同步英文化（共18个）

#### 1.2 README 第一屏重写

**目标结构**：
```
# Keystone
[tagline — 一句话，让工程师停下来]
[安装命令]
[Terminal GIF]

## The Problem
[3-4句话：描述 AI agent "假装做完了"的痛苦]

## How It's Different
[对比表格：Keystone vs superpowers vs gstack]

## 18 Skills, 5 Layers
[技能地图]

## Common Paths
[6条路径，每条4-6步]

## Install
[命令]
```

**候选 tagline**：
> *"AI coding agents that know when to stop, verify, and say no."*

> *"Flexible entry. Honest exit. Every decision has a confidence score."*

**核心差异化对比表格**（必须在第一屏出现）：

| | superpowers | gstack | **Keystone** |
|-|-------------|--------|---------------|
| Focus | Execution methodology | Virtual engineering team | **Decision quality system** |
| State management | None | None | **56-field state.json** |
| Confidence on decisions | None | None | **0.0–1.0 per decision** |
| Honest exit enforcement | None | None | **Blocks "done" without evidence** |
| Skills | 14 | 23 | **18 (principled architecture)** |
| Multi-agent hosts | Multi | Claude-first | **Claude + Codex + Gemini** |

#### 1.3 安装体验最后一公里验证

当前 `docs/installation.md` 已经写得很完整（doctor / dry-run / --agents / --home 沙盒），但需要验证：

- [ ] `node install.mjs` 或 `./keystone install` 在全新环境下是否真的能跑通
- [ ] 安装完成后有没有打印 "What's next" 提示
- [ ] `keystone doctor` 输出是否清晰友好（✅ / ❌ 格式）

---

### Phase 2：补齐关键技能（2-4周）

**目标**：在功能层面具备与 gstack 对话的底气

#### 2.1 `browse` 技能

基于现有 MCP 工具（`mcp__Claude_Preview__*` / `mcp__Claude_in_Chrome__*`）构建，不需要重新实现 Playwright：

```yaml
name: browse
layer: operation
description: Real browser validation — verify user paths in actual browser, screenshots as evidence.

When to enter:
- qa_required=true AND you want visual evidence of user-facing interactions
- Manual verification step that requires clicking through an actual UI

Output:
- screenshots at key steps (evidence)
- pass/fail with visual proof
- linked into verify result
```

**意义**：截图 = 证据，和 Keystone "honest exit" 哲学完全一致

#### 2.2 `security` 技能

```yaml
name: security
layer: operation  
description: Pre-ship security audit — OWASP Top 10 scan, data exposure check, dependency review.

Auto-triggers when:
- review contains security-reviewer findings
- ship target is production or public-facing

Output:
- security_findings with severity (P0/P1/P2)
- blocked: true/false (P0 blocks ship)
- disclosure_required: text for release statement
```

#### 2.3 `retro` 技能（Keystone 独有的差异化）

这是 Keystone 唯一能比 gstack 更强的技能：**基于 Telemetry 数据自动生成**，而不是手动填写。

```yaml
name: retro
layer: support
description: Evidence-based retrospective from telemetry data — real metrics, not just feelings.

What it generates (from .keystone/telemetry/events/*.jsonl):
- Skills used this week
- Average confidence per skill (low confidence = process problem)
- Escalation count and reasons
- Most common routing paths
- Skills that frequently route back (potential rework signals)
- Suggested process adjustments

Differentiator vs gstack /retro:
- gstack: you fill in the form
- Keystone: the data fills it in for you
```

---

### Phase 3：建立影响力（1-3个月）

#### 3.1 传播素材准备

**Terminal GIF**（最高 ROI 的传播素材）：
- 工具：`vhs`（https://github.com/charmbracelet/vhs）或 `asciinema`
- 场景：`bug-triage → diagnose → implement → verify` 完整流程，60-90秒
- 放在 README 最顶部

**博客文章**：

中文（掘金/知乎）：
- *"为什么我要在 Claude Code 里造一个「拒绝说谎」的工程系统"*
- *"对比 gstack 和 superpowers：Keystone 的 State 驱动到底解决了什么"*

英文（Dev.to / HN / Medium）：
- *"The AI agent that says no: building honest exit conditions into Claude Code"*
- *"State-driven AI coding: 18 skills that enforce engineering discipline"*

#### 3.2 社区进入策略

**第一步：被收录**（提交 PR）
- [ ] https://github.com/hesreallyhim/awesome-claude-code
- [ ] https://github.com/travisvn/awesome-claude-skills
- [ ] claude.ai 社区论坛发布介绍帖

**第二步：发现机制**
- [ ] Product Hunt 发布（参考 gstack 的发布时机和文案策略）
- [ ] 提交 Claude 官方插件市场（待开放）

**第三步：官网**（最小版，静态即可）
```
首屏：tagline + install command + 3个差异化点
第二屏：18 Skills Map（可视化）
第三屏：Terminal GIF 演示
第四屏：6条 Golden Paths
第五屏：Community / GitHub
```
技术选择：Astro + Vercel（免费，极轻）

---

## 四、优先级执行清单

### 立即（本周内）

- [ ] 确定 SKILL.md 英文化的标准模板（见 skill-english-template.md）
- [ ] 英文化 Round 1：orchestrate / review / implement / verify / diagnose
- [ ] 起草 README 第一屏新版本

### 短期（2周）

- [ ] 完成所有18个 SKILL.md 英文化
- [ ] README 重写完成并推送
- [ ] 验证安装流程端到端通顺
- [ ] `browse` 技能初稿

### 中期（1个月）

- [ ] `security` 技能初稿
- [ ] `retro` 技能初稿（基于 telemetry 数据）
- [ ] Terminal GIF 录制完成
- [ ] 中英文博客文章各1篇
- [ ] 提交 awesome-claude 系列列表

### 长期（2-3个月）

- [ ] 官网上线（Astro + Vercel）
- [ ] Product Hunt 发布
- [ ] 社区讨论积累（GitHub Discussions）

---

## 五、卓越标准 Checklist

达到以下标准，Keystone 才算"卓越"而不只是"好用"：

- [ ] **安装体验**：全新工程师 5 分钟内从 0 到用上第一个技能
- [ ] **内容质量**：所有 SKILL.md 可以直接给英文母语工程师看，他们能理解并感到有深度
- [ ] **差异化清晰**：任何人看了 README 后，30秒内能说出 Keystone 和 gstack/superpowers 有什么不同
- [ ] **可信度**：有真实使用数据或故事，让人相信这套方法有实际效果
- [ ] **可发现性**：被至少2个 awesome-claude-code 类列表收录
- [ ] **社区参与**：有外部的 star / issue / 讨论（不是自己账号）

---

## 附录：参考资源

- superpowers: https://github.com/obra/superpowers
- gstack: https://github.com/garrytan/gstack
- gstacks.org: https://gstacks.org
- awesome-claude-code: https://github.com/hesreallyhim/awesome-claude-code
- awesome-claude-skills: https://github.com/travisvn/awesome-claude-skills
- vhs Terminal GIF: https://github.com/charmbracelet/vhs
- asciinema: https://asciinema.org
- Astro（静态网站）: https://astro.build
