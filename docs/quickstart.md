# Keystone in 5 Minutes

This guide uses one small real task to walk from installation to fresh evidence.

You do not need to learn all 18 skills. You only need to follow the path.

---

## Task Setup

You have a Python function that accepts user input but performs no validation. You want to:

1. reject empty strings
2. reject strings longer than 200 characters
3. prove the change is correct instead of only assuming it is correct

This is a small task with clear boundaries, which makes it a good first Keystone run.

## Step 1: Start with help

Input:

```text
/ks-help
```

Example response:

```text
## Help Recommendation

Current read: your task is clear, but the next workflow entry is not.
Recommended entry: `brief`
Why: the background still needs to be compressed into one executable page before planning.

Copy this and send it next:

> /ks-brief Compress the background below into a one-page execution brief.
```

The important part is not the label. The important part is that Keystone gives you one concrete next sentence.

## Step 2: Compress the task into a brief

```text
/ks-brief Compress the background below into a one-page execution brief.

Background: I have a validate_input(text) function with no validation.
I want two checks: empty strings should fail, and strings longer than 200 characters should fail.
All other behavior should stay the same.
```

Example response:

```text
## Brief

Task: add two defensive validation rules to validate_input().
Context: the current function accepts empty and oversized input.
Goal: empty strings -> ValueError; length > 200 -> ValueError.
Non-goals: do not change valid-input behavior.
Constraint: do not break the existing call shape.
Unknown: whether any caller relies on silent acceptance today.
Suggested next skill: writing-plan
```

Now the task has a boundary.

## Step 3: Produce a real plan

```text
/ks-writing-plan Turn the approved brief above into the current executable block.
```

Example response:

```text
# Plan: validate_input defensive validation

Plan type: execution-card
Current block: add empty-input and oversized-input checks to validate_input()

Done criteria:
- empty string -> ValueError("Input cannot be empty")
- len(text) > 200 -> ValueError("Input too long")
- valid input still succeeds
- existing tests stay green

Risk level: low
Next skill: test-first
```

Keystone is now defining what done means, not just what to change.

## Step 4: Implement against the contract

```text
/ks-implement Implement the current block without expanding scope.
```

Example change:

```python
def validate_input(text: str) -> str:
    if not text:
        raise ValueError("Input cannot be empty")
    if len(text) > 200:
        raise ValueError("Input too long")
    return text.strip()
```

The implementation step should stay inside the plan.

## Step 5: Collect fresh evidence

```text
/ks-verify Validate that the change actually meets the done criteria.
```

Example response:

```text
## Verification Report

Current block: validate_input defensive validation
Verification time: 2026-04-18T10:00:00Z

Test run:
- total: 5
- passed: 5
- failed: 0

Behavior checks:
- empty string -> ValueError: PASS
- len > 200 -> ValueError: PASS
- valid input still succeeds: PASS

verify_result: pass
next_skill: review
```

This is the core Keystone idea: evidence comes from execution, not from confidence.

## What You Just Did

```text
ks-help -> ks-brief -> ks-writing-plan -> ks-implement -> ks-verify
```

Each step had one job:

| Step | Purpose | Output |
|---|---|---|
| help | find the correct entry | one recommended next step |
| brief | compress messy context | one-page brief |
| writing-plan | define completion | current block and done criteria |
| implement | make the change | code diff |
| verify | collect fresh evidence | verification result |

## What To Do Next

Formal review:

```text
/ks-review
```

Prepare PR context:

```text
/ks-pr-prep
```

If you are stuck at any point:

```text
/ks-help
```
