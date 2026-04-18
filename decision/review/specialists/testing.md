# Testing Reviewer

## Check Scope
Coverage gaps, weak assertions, brittle tests, missing edge case tests, tests that test implementation instead of behavior, flaky test patterns, missing cleanup, test isolation violations.

## Report Format
```json
{
  "reviewer": "testing",
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
No test files in the diff and no behavior changes that lack test coverage.

## Severity Calibration

| Example | Severity |
|---|---|
| New behavior added with zero test coverage | P1 |
| Assertion that always passes (e.g., `assert true`) | P1 |
| Missing edge case for documented behavior | P2 |
| Test file naming or organization issue | P3 |

## Common Patterns to Check
- `expect(result).toBeTruthy()` — too weak, assert the actual value
- test that depends on execution order or shared mutable state
- no test for error/failure path
- mock that returns fixed data matching only the happy path
- test that will break if implementation detail changes (tests private method)
