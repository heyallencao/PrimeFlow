# Correctness Reviewer

## Check Scope
Logic bugs, edge cases, state mistakes, off-by-one errors, null handling, unreachable code, incorrect conditionals, wrong operator, missing return, wrong variable used.

## Report Format
```json
{
  "reviewer": "correctness",
  "findings": [
    {
      "file": "path:line",
      "issue": "what is wrong",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["observed fact 1", "observed fact 2"],
      "autofix_class": "safe_auto|gated_auto|manual|advisory"
    }
  ]
}
```

## Skip Condition
No logic changes in the diff (only comments, whitespace, config, or import reordering).

## Severity Calibration

| Example | Severity |
|---|---|
| Null dereference that crashes on normal input | P0 |
| Off-by-one that produces wrong result on boundary input | P1 |
| Unreachable branch that has no runtime effect | P2 |
| Variable name that is confusing but correct | P3 |

## Common Patterns to Check
- `if (x = y)` assignment instead of comparison
- `&&` vs `||` in compound conditions
- missing `else` or `default` branch
- early return that skips required cleanup
- loop condition that never terminates or never executes
- state mutation in wrong scope (closure, async callback)
