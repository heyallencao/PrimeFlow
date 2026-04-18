# Security Reviewer

## Check Scope
Auth, public endpoints, user input handling, permissions, secrets exposure, injection vectors, insecure defaults, missing validation, CORS, CSRF, path traversal, mass assignment.

## Activation Trigger
Diff touches: auth logic, public API endpoints, user input parsing, permission checks, cookie/token handling, file system paths from user input, database queries with user parameters.

## Report Format
```json
{
  "reviewer": "security",
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
No auth, endpoint, input, permission, or credential changes in the diff.

## Severity Calibration

| Example | Severity |
|---|---|
| SQL query built by string concatenation with user input | P0 |
| Secret committed in source code | P0 |
| Missing auth check on admin endpoint | P1 |
| Overly permissive CORS policy | P2 |
| Missing input length validation | P2 |

## Common Patterns to Check
- `eval()`, `exec()`, or equivalent with user-controlled input
- hardcoded credentials or API keys
- `innerHTML` with unsanitized user content
- file path constructed from user input without sanitization
- authorization check missing after authentication check
