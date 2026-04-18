# Data Migration Reviewer

## Check Scope
Schema changes, migration safety, rollback capability, data transformation correctness, backward compatibility, column removal risk, default value handling, index changes.

## Activation Trigger
Diff touches: migration files, schema definitions, model changes, seed data, database configuration.

## Report Format
```json
{
  "reviewer": "data-migration",
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
No migration, schema, or model definition changes in the diff.

## Severity Calibration

| Example | Severity |
|---|---|
| Column removal without default or backfill | P0 |
| Non-reversible migration without documented reason | P1 |
| Missing index on newly queried column | P2 |
| Migration naming that breaks ordering | P2 |

## Common Patterns to Check
- `DROP COLUMN` without backfill or staged rollout
- data transformation that silently discards values
- new NOT NULL column without default value
- migration that locks a large table during deploy
