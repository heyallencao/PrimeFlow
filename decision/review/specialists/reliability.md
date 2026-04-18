# Reliability Reviewer

## Check Scope
Retry logic, timeout handling, background job safety, failure path completeness, circuit breakers, graceful degradation, error propagation, resource cleanup, concurrent access safety.

## Activation Trigger
Diff touches: retry logic, timeout configuration, background job definitions, error handling paths, resource management, concurrent/async code.

## Report Format
```json
{
  "reviewer": "reliability",
  "findings": [
    {
      "file": "path:line",
      "issue": "what is wrong",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["observed fact"],
      "autofix_class": "safe_auto|gated_auto|manual|advisory"
    }
  ]
}
```

## Skip Condition
No retry, timeout, background job, error handling, or concurrency changes in the diff.

## Severity Calibration

| Example | Severity |
|---|---|
| Infinite retry loop with no backoff or limit | P0 |
| Missing timeout on external service call | P1 |
| Background job that silently swallows errors | P1 |
| Connection/resource not released on error path | P2 |

## Common Patterns to Check
- retry without exponential backoff
- catch block that logs but does not propagate or handle
- fire-and-forget async operation with no error callback
- shared mutable state accessed from multiple goroutines/threads without synchronization
