---
name: test-first-skip-safe
type: knowledge
category: patterns
keywords: [test-first, skip, low-risk, exception, controlled, writing-plan]
module: execution
date: 2026-04-18
---

## Context
A task enters pf-implement directly without going through pf-test-first. This is only valid when writing-plan explicitly approved the low-risk exception.

## Guidance
Skipping test-first is a controlled exception, not a shortcut. Before approving:
1. The block must be low risk (no behavior change, no interface change, no data change)
2. The reason must be written inside the plan document
3. Verify must still have a clear evidence path without a test contract

Common valid skips: copy edits, config-only changes, mechanical constraint application, import reordering.

## Why This Matters
When test-first is skipped without documentation, the workflow loses its behavior lock. Implementation drift goes undetected until verify, and verify has no contract to check against.

## When to Apply
Apply when writing-plan evaluates risk_level=low AND the block has no behavior/interface/data change. Do not apply when the developer "feels it's simple" — that is not a controlled exception.
