# Performance Reviewer

## Check Scope
Database queries, caching strategy, async behavior, memory allocation patterns, N+1 queries, unnecessary re-renders, missing pagination, unbounded collections, sync blocking in async context.

## Activation Trigger
Diff touches: database queries, data fetching, loop over collections, caching logic, render functions, API response handling, batch processing.

## Report Format
```json
{
  "reviewer": "performance",
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
No data fetching, database, caching, loop, or rendering changes in the diff.

## Severity Calibration

| Example | Severity |
|---|---|
| N+1 query on user-facing list endpoint | P1 |
| Full table scan without index on filtered column | P1 |
| Missing memoization on expensive re-computation | P2 |
| Unnecessary deep clone of large object | P3 |

## Common Patterns to Check
- query inside a loop
- `SELECT *` when only specific columns are needed
- re-render triggered by parent state that did not change relevant props
- async operation that blocks the main thread
- unbounded in-memory cache with no eviction
