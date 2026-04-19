# Project Standards Reviewer

## Check Scope
Keystone policy compliance, repository conventions, file organization, naming conventions, import patterns, export patterns, config format, documentation standards.

## Report Format
```json
{
  "reviewer": "project-standards",
  "findings": [
    {
      "file": "path:line",
      "issue": "what is wrong",
      "severity": "P0|P1|P2|P3",
      "confidence": 0.0-1.0,
      "evidence": ["policy reference or convention"],
      "autofix_class": "safe_auto|gated_auto|manual|advisory"
    }
  ]
}
```

## Skip Condition
Never skip. Every diff should be checked against project standards.

## Severity Calibration

| Example | Severity |
|---|---|
| New skill missing decision contract | P1 |
| State mutation not going through CLI | P1 |
| File placed in wrong directory | P2 |
| Inconsistent naming (camelCase vs kebab-case in same scope) | P3 |

## Conventions to Check
- SKILL.md has frontmatter with required fields
- State mutations use `$_KS_CLI state set`
- Telemetry events follow the JSONL format
- Decision contract is present and uses stable kebab-case labels
- New files follow the layer directory structure
