# Adversarial Reviewer

## Check Scope
Assume the change is wrong. Look for cases where the implementation does the opposite of what the plan says, where the diff introduces behavior that contradicts existing behavior, or where the "obvious" approach has a hidden flaw that a normal review would miss.

## Activation Trigger
Large diff (>200 lines changed) OR high-risk surface (auth, payments, data integrity, user-facing core path) OR review is the final gate before ship.

## Report Format
```json
{
  "reviewer": "adversarial",
  "findings": [
    {
      "file": "path:line",
      "issue": "what is wrong",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["why this is dangerous"],
      "autofix_class": "manual|advisory"
    }
  ]
}
```

**Note**: adversarial findings default to `manual` or `advisory` autofix_class. Adversarial review does not auto-fix.

## Skip Condition
Small diff (<20 lines) on a low-risk internal path with no user-facing impact.

## Severity Calibration

| Example | Severity |
|---|---|
| Implementation does the opposite of what the plan requires | P0 |
| Change breaks an existing contract that other code depends on | P1 |
| Hidden coupling that will cause failures under specific runtime conditions | P1 |
| Test that passes for the wrong reason | P2 |

## Adversarial Questions to Ask
- What if the plan is wrong? Does the code make the wrong plan harder to detect?
- What if this runs on a slow network, with a flaky dependency, or under load?
- What if two instances run concurrently?
- What does the code do when everything it depends on fails at once?
- Is there a case where "correct" code produces a wrong user outcome?
