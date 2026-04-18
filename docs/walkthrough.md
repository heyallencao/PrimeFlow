# PrimeFlow Walkthrough

这不是完整手册，只是一条第一次最好跑通的最小示例。

目标：

- 让你看懂 PrimeFlow 实际怎么接入
- 让你知道每个 skill 什么时候该用
- 不要求你一次读完 18 个 skills

---

## 示例任务

给现有登录页补一个 `Continue with GitHub` 入口，并确保：

- 旧登录方式不受影响
- 新按钮只在 web 端展示
- 行为、验证、收口都有记录

---

## 推荐对 agent 的第一句话

```text
使用 PrimeFlow，从 orchestrate 开始。这是一个从零开始但目标明确的功能：给现有登录页补一个 GitHub OAuth 入口。先判断 entry mode，再按最小闭环推进。
```

---

## 从零开始时的默认推荐链路

如果你是从零开始推进一个任务，PrimeFlow 的默认推荐链路是：

```text
orchestrate -> roundtable -> writing-plan -> test-first -> implement -> verify -> review -> qa? -> ship -> release -> knowledge
```

其中：

- `qa?` 表示只有任务具备真实运行时风险时才进入 `qa`
- `knowledge` 是可选收尾；有复用价值时再沉淀

这条链路是推荐路径，不是所有任务都必须完整走一遍的强制路径。

---

## 最小路径

```text
orchestrate -> roundtable -> writing-plan -> test-first -> implement -> verify -> review
```

这条路径已经足够让你第一次感受到 PrimeFlow 的主链。

如果任务要继续上线，再往后接：

```text
qa -> ship -> release -> knowledge
```

---

## 每一步在做什么

### 1. orchestrate

作用：

- 判断这是 `from-scratch`
- 设定初始 `risk_level`
- 决定先去 `roundtable`

你应该看到的结果：

- entry mode 被明确
- 下一步 skill 被明确

### 2. roundtable

作用：

- 收敛方案，不直接开写
- 确认这是新增入口，不是重做整个认证系统

这一阶段最好回答清楚：

- GitHub OAuth 入口出现在哪里
- 是否涉及后端回调
- 是否需要 feature flag

### 3. writing-plan

作用：

- 把任务收成一个当前任务块
- 明确完成标准和不做什么

一个合格的当前任务块，至少要写清楚：

- 登录页新增 GitHub 按钮
- 接入现有 OAuth 流程
- 不改动已有邮箱登录行为

### 4. test-first

作用：

- 先锁行为边界
- 防止实现时顺手扩范围

这里不一定要写很多测试，但至少要锁住：

- GitHub 按钮出现条件
- 点击后的目标行为
- 旧登录流程不回归

### 5. implement

作用：

- 只完成当前任务块
- 不顺手改无关 UI
- 不把“未来可能需要”一起做掉

### 6. verify

作用：

- 拿 fresh evidence
- 判断是 `pass`、`fail_bug` 还是 `fail_spec`

这一步重点不是“我觉得没问题”，而是：

- 你刚刚实际验证了什么
- 证据是不是新的

### 7. review

作用：

- 用 review 的标准做最后一道质量关
- 决定是否需要 `qa`

如果只是页面按钮和已有认证链路的小改动，review 可能直接给出：

```text
next_skill = DONE
```

如果涉及真实浏览器路径或关键集成，再进 `qa`。

---

## 什么时候用 handoff

如果做到一半要切会话，不要只留一句“下次继续”。

直接让 agent：

```text
使用 PrimeFlow，执行 handoff out。
```

恢复时：

```text
使用 PrimeFlow，执行 handoff in latest。
```

`handoff` 值得单独记住，不只是因为它能“下次继续”，而是因为它把 AI 工作现场从黑盒压缩变成了白盒状态单元。

更直白一点：

- AI 的上下文压缩是黑盒
- `handoff` 是你能显式控制的白盒恢复点
- 你切会话、换 agent、暂停工作时，依赖的是可检查的 handoff 包，而不是碰运气的上下文继承

第一次只要实际跑通一次，你就会明白 handoff 为什么是 PrimeFlow 最硬的能力之一。

---

## 第一次使用时不要做的事

- 不要一上来试图理解全部 18 个 skills
- 不要把 `qa` / `ship` / `release` 当成每次都必须走
- 不要跳过 `writing-plan` 直接进入“边写边想”
- 不要把 `verify` 当成主观确认

---

## 建议的阅读顺序

1. 先看 [README.md](../README.md)
2. 再跑这篇 walkthrough
3. 需要协议细节时再看 [SYSTEM.md](../SYSTEM.md)
4. 需要字段和路由时再看 [STATE.md](../STATE.md) 和 [FRAMEWORK.md](../FRAMEWORK.md)
