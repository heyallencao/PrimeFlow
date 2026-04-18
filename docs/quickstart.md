# PrimeFlow 5 分钟上手

> 这份指南用一个真实的小任务，带你从安装完成走到第一次拿到 fresh evidence。  
> 全程不需要理解 18 个 skill，只需要跟着走。

---

## 任务背景

你有一个 Python 函数，接受用户输入，但没有做任何校验。你想：

1. 给它加输入校验（空字符串、超长字符串两种情况）
2. 验证改动是真的对的，不只是"感觉对了"

这是一个真实的、小规模的、有边界的任务——正好适合第一次跑 PrimeFlow。

---

## 第一步：告诉 PrimeFlow 你不知道从哪开始

**输入：**

```
/pf-help
```

**PrimeFlow 的回应（示例）：**

```
## Help 建议

当前判断：你现在更像是"任务目标明确，但还没决定该从哪个 skill 开始"。
推荐入口：`brief`
原因：任务描述还有一些背景没整理清楚，先用 brief 压成一页再进计划。
下一句怎么说：
  /pf-brief 把下面的背景压成一页可执行简报。
```

> **重点：** help 只给一个推荐，告诉你"下一句怎么说"。  
> 直接复制那句话，进入下一步。

---

## 第二步：把任务压成一页简报

**复制上面的推荐，加上你的任务描述：**

```
/pf-brief 把下面的背景压成一页可执行简报。

背景：我有一个 validate_input(text) 函数，现在完全没有输入校验。
我想加两个校验：空字符串直接返回错误，超过 200 个字符也返回错误。
其他行为不变。
```

**PrimeFlow 的回应（示例）：**

```
## Brief

任务：给 validate_input() 加两条防御性校验。
背景：现有函数无输入校验，存在空字符串和超长输入风险。
目标：空字符串 → 返回 ValueError；长度 > 200 → 返回 ValueError。
非目标：不改变校验通过时的处理逻辑。
约束：不破坏现有调用方的接口。
未知项：现有调用方是否依赖无校验时的"静默通过"行为，待确认。
建议下一步：writing-plan
原因：方向已清楚，只差把范围和停线压成可执行块。
```

> **重点：** brief 把"散的背景"压成了有边界的任务，并且标出了还不确定的地方。  
> 现在按建议进入 writing-plan。

---

## 第三步：写一个可执行计划

**继续输入：**

```
/pf-writing-plan 基于上面的 brief 产出当前可执行块。
```

**PrimeFlow 的回应（示例）：**

```
## Plan：validate_input 防御性校验

计划类型：execution-card
当前块：给 validate_input() 加空字符串和超长输入两条校验

范围：
  包含：utils/validator.py 中的 validate_input()
  不包含：调用方代码、其他函数、错误消息国际化

停线（Done Criteria）：
  - 空字符串输入 → 抛出 ValueError("Input cannot be empty")
  - len(text) > 200 → 抛出 ValueError("Input too long")
  - 正常输入通过，现有测试全部绿色

风险分级：low（内部行为修正，无接口变化）
TDD 路由：低风险受控例外，直接 implement，在 verify 补 fresh evidence
QA 预期：qa_required = false（无用户路径）
```

> **重点：** plan 把"要做什么"变成了"做到什么算完成"。  
> 停线是可验证的，不是形容词。风险已判断，下一步直接 implement。

---

## 第四步：实现

**继续输入：**

```
/pf-implement 按照上面的 plan 完成当前块。
```

**PrimeFlow 会：**
- 在 `utils/validator.py` 里找到 `validate_input()`
- 在函数开头加两条校验
- 确认没有引入其他改动

**改动示例（agent 执行）：**

```python
def validate_input(text: str) -> str:
    if not text:
        raise ValueError("Input cannot be empty")
    if len(text) > 200:
        raise ValueError("Input too long")
    # 原有逻辑保持不变
    return text.strip()
```

> **重点：** implement 只做计划里的事，不顺手改其他东西。

---

## 第五步：拿 fresh evidence（最重要的一步）

**继续输入：**

```
/pf-verify 验证刚才的改动是否真的符合停线。
```

**PrimeFlow 的回应（示例）：**

```
## Verification 报告

当前块：validate_input 防御性校验
验证时间：2025-04-10T14:32:00Z

测试运行：
  总数：5   通过：5   失败：0

实际行为检查：
  停线                              期望             实际    结果
  空字符串 → ValueError            raise ValueError  ✓       PASS
  len > 200 → ValueError           raise ValueError  ✓       PASS
  正常输入通过                     return str        ✓       PASS
  现有测试全部绿色                 5/5 pass          ✓       PASS

结论：
  verify_result: pass

下一步：review
```

> **重点：** 这是 fresh evidence——真正运行了测试，拿到了结果。  
> 不是"我觉得没问题"，是"跑了 5 个测试，全过了"。

---

## 你刚才做了什么

```
pf-help → pf-brief → pf-writing-plan → pf-implement → pf-verify
```

5 个步骤，每一步都有明确的输入和输出：

| 步骤 | 做了什么 | 产物 |
|------|---------|------|
| help | 判断从哪里进入 | 下一步推荐 |
| brief | 压缩背景，找到真正的任务 | 一页简报 |
| writing-plan | 定义完成标准 | 可执行块 + 停线 |
| implement | 写代码 | 改动 |
| verify | 跑测试，拿证据 | fresh evidence |

---

## 下一步可以做什么

**继续做正式质量关口：**
```
/pf-review
```

**收尾写 PR：**
```
/pf-pr-prep
```

**有个 bug 不知道是什么原因：**
```
/pf-bug-triage
```

**想看完整的路径参考：**
- [Golden Paths（6 种场景完整路径）](golden-paths.md)
- [安装指南](installation.md)

---

## 如果你卡住了

任何时候，都可以输入 `/pf-help` 重新获得推荐。  
PrimeFlow 不要求你记住 18 个 skill，只要知道"现在什么情况"，help 会告诉你下一句说什么。
