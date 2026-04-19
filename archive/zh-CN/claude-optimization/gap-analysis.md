# 竞争差距分析（基于 main 分支真实状态）

> 历史分析说明：本文是阶段性竞争分析草稿，不是当前产品契约文档。
> 当前真实 agent 契约：Claude / Codex / Gemini 统一使用 `/ks-*`，公共 skill 位于 `.agents/skills/ks-*`。

> 对标 superpowers (143K ⭐) 与 gstack (67.7K ⭐) 的精确差距定位

**分析时间**：2026-04-09  
**数据来源**：main 分支完整内容（含未提交 WIP）+ GitHub 项目实地研究

---

## 首要声明：之前分析有误

首次分析读取了 `claude/nervous-johnson` worktree（已提交快照），**不是** main 分支的真实状态。

**被错误低估的内容**：

| 之前认为 | 实际情况 |
|---------|---------|
| 只有13个技能 | **18个技能**（含已落地的5个vNext技能）|
| vNext 技能"只是规划" | `brief/bug-triage/pr-prep/docs-writer/help` **已全部落地** |
| 没有模板 | `templates/` **已有5个完整模板** |
| 没有示例 | `examples/` **已有三端示例（claude/codex/gemini）** |
| 安装体验不完整 | `docs/installation.md` **已相当完整**（doctor/dry-run/--agents/沙盒）|
| 没有 manifest | `keystone.manifest.json` **已有完整17技能配置** |
| 没有 Codex 支持 | `.agents/skills/` **已预生成18个 ks-* 目录** |

---

## 真实竞争力位置

Keystone 实际上**比之前分析更成熟**。真正的差距比想象中要少，但每个差距的影响很大。

---

## 差距矩阵（精确版）

### 🔴 P0：直接阻止国际推广

#### 差距1：所有 SKILL.md 内容是中文

**这是唯一的 P0 级障碍**。

现状：18个技能文件（+ `.agents/skills/` 下的18个同步文件）章节标题和正文全部是中文：
```
一句话定义 / 不干什么 / 定位 / 前置条件检查 / 决策契约 / 质量检查清单
```

对比：superpowers 和 gstack 的所有技能文件全部是英文。

后果：
- ❌ 无法被 awesome-claude-code / awesome-claude-skills 国际列表收录
- ❌ 国际受众无法贡献 PR / Fork（连看都看不懂）
- ❌ gstack 和 superpowers 的用户群完全无法触达
- ❌ Product Hunt 发布无法吸引英文社区

**需要改的文件数量**：18 个 SKILL.md + 18 个 `.agents/skills/ks-*/SKILL.md` = 36 个文件

**工作量估算**：每个文件约 30-60 分钟（翻译 + 调整），可批量处理

---

#### 差距2：README 第一屏缺少"震撼感"

现状：README 已有双语内容、完整安装说明、技能列表——结构完整但**没有钩子**。

对比：
| 项目 | 第一句话 | 效果 |
|------|---------|------|
| gstack | "I shipped 600,000 lines of production code in 60 days" | 工程师立刻停下来 |
| superpowers | "Professional software engineering methodology for AI" | 清晰定位 |
| **Keystone 现状** | 技术架构描述 | 平淡，无冲动点击 |

**缺少的要素**：
1. 一句让人停下来的 tagline
2. 明确的差异化对比表格（Keystone vs superpowers vs gstack 并列）
3. Terminal GIF（视觉证明）

---

### 🟡 P1：影响"用得爽"的问题

#### 差距3：缺少 `browse` 技能（浏览器自动化）

| 项目 | 实现 | 价值 |
|------|------|------|
| superpowers | 无 | — |
| gstack | `/browse`：真实 Chromium，100ms/cmd | 捕获 CI 通过但浏览器失败的 bug |
| **Keystone** | qa 提到 Playwright，无独立展示层 | 没有视觉可信度 |

**机会**：当前环境已有 `mcp__Claude_Preview__*` 和 `mcp__Claude_in_Chrome__*`，可直接构建，无需额外依赖。

#### 差距4：缺少 `security` 独立技能

| 项目 | 实现 |
|------|------|
| superpowers | 无 |
| gstack | `/cso`：OWASP Top 10 + STRIDE 威胁建模 |
| **Keystone** | review 里有 security-reviewer persona（条件触发），不够独立显眼 |

#### 差距5：缺少 `retro` 技能（但这是最强差异化机会）

| 项目 | 实现 |
|------|------|
| superpowers | 无 |
| gstack | `/retro`：手动填写的每周复盘 |
| **Keystone** | 有 Telemetry JSONL 数据，但没有 retro 技能 |

**为什么这是机会**：Keystone 是同类产品中**唯一**有 Telemetry 系统的。基于真实决策数据自动生成复盘，比 gstack 手动填写的更有可信度。这是一个可以公开说"我们比 gstack 更强"的点。

---

### 🟢 P2：影响长期影响力

#### 差距6：社区发现机制缺失

| 项目 | 发现渠道 |
|------|---------|
| superpowers | 官方插件市场 + awesome-claude-skills 收录 + 143K stars |
| gstack | gstacks.org 网站 + Product Hunt + HN 讨论 |
| **Keystone** | 只有 GitHub repo，尚未对外发布 |

#### 差距7：传播素材零积累

- ❌ 无 Terminal GIF 演示
- ❌ 无博客文章（中英文）
- ❌ 无官网
- ❌ 未提交任何 awesome-claude 系列列表

---

## 优势总结（不要丢的护城河）

这些是 Keystone **真正独有**的竞争优势，在优化过程中必须保留并强化：

### 优势1：状态驱动路由（独一无二）

```
.keystone/state.json — 56字段
orchestrate — 40+条路由规则
6种 entry_mode — from-scratch, aligned-offline, plan-ready, build-ready, release-ready, incident
```

意义：跨 session 工作可恢复，路由决策有明确依据，状态可审查，不是黑箱。

### 优势2：Decision Contract + 置信度（独一无二）

```
每个技能的输出：
- decision: 稳定标签（如 "verify-pass"）
- confidence: 0.0-1.0 数值
- rationale: 决策理由
- next_skill: 下一步
```

意义：AI agent 的决策变得透明可追溯，低置信度自动触发人工确认。

### 优势3：Telemetry 系统（独一无二）

```
.keystone/telemetry/events/YYYY-MM.jsonl
每个决策都被记录：skill, ts, decision, confidence, ...
```

意义：唯一可以做数据驱动复盘的同类产品，`retro` 技能的核心基础。

### 优势4：诚实退出约束（独一无二）

```
verify: 无 fresh evidence = 无法返回 pass
release: 跳过 QA 必须披露，不能假装没发生
ship: 上线前检查清单强制执行
```

意义：防止 AI agent "假装完成"的问题，这是 gstack 和 superpowers 都没有的。

### 优势5：三端支持（领先）

```
Claude Code → /ks-* 命令
Codex → .agents/skills/ks-* 预生成目录
Gemini → ~/.gemini/skills/Keystone bundle
```

---

## 竞争定位总结

```
Keystone 不是"更多功能的 gstack"
Keystone 不是"更完整的 superpowers"

Keystone 是一套不同维度的产品：
- superpowers 解决"怎么写好代码"
- gstack 解决"谁来做不同的事"
- Keystone 解决"什么时候可以说做完了"
```

**核心价值主张**（一句话）：

> **Flexible entry. Honest exit.**  
> 你的 AI agent 可以从任何阶段接入——但只能在有真实证据的情况下说"完成"。

---

## 执行优先级

```
影响力 × 执行成本矩阵：

              高影响              低影响
低成本   ┌─────────────────┬────────────────┐
         │ README 第一屏   │ browse 技能    │
         │ 提交 awesome-   │ security 技能  │
         │ claude 列表     │                │
高成本   ├─────────────────┼────────────────┤
         │ SKILL.md 英文化 │ retro 技能     │
         │ （36个文件）    │ 官网建设       │
         └─────────────────┴────────────────┘
```

**建议顺序**：
1. README 第一屏重写（1天，极高影响）
2. SKILL.md 英文化（1-2周，P0 阻断）
3. 提交 awesome-claude 列表（0.5天，可见度）
4. browse / security / retro 技能（2-4周）
5. Terminal GIF + 博客文章（持续）
6. 官网（1-2个月后）
