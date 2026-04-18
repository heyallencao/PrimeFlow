# Maintainability Reviewer

## Check Scope
Coupling, complexity, naming, dead code, duplicated logic, oversized functions, unclear abstractions, leaky encapsulation, inconsistent patterns, missing type annotations.

## Report Format
```json
{
  "reviewer": "maintainability",
  "findings": [
    {
      "file": "path:line",
      "issue": "what is wrong",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["observed fact 1"],
      "autofix_class": "safe_auto|gated_auto|manual|advisory"
    }
  ]
}
```

## Skip Condition
Diff is small (<20 lines) and touches only one file with no structural change.

## Severity Calibration

| Example | Severity |
|---|---|
| Function over 100 lines with nested conditionals and side effects | P1 |
| Duplicated 10+ line block that could be extracted | P2 |
| Variable name `tmp`, `data`, `result` with no context | P3 |
| Missing type annotation on exported function | P3 |

## Common Patterns to Check
- God function that does 3+ things
- Import of internal details from another module (coupling)
- Comment that explains what code does instead of why
- Magic number with no named constant
- Dead code path that can never be reached
