# Test Contract: Runtime Wave Three

## Scope
Lock the third runtime English migration wave for:
- `pf-roundtable`
- `pf-handoff`
- `pf-release`

## Test Scenarios

### Scenario 1: Roundtable is canonical English
- **Given**: `roundtable` controls direction convergence
- **When**: checking `.agents/skills/pf-roundtable/SKILL.md`
- **Then**: the skill is understandable in English and preserves the three-mode structure plus `next_skill = writing-plan`
- **Test function**: `test_roundtable_is_canonical_english`

### Scenario 2: Handoff is canonical English
- **Given**: `handoff` controls cross-session freeze and restore
- **When**: checking `.agents/skills/pf-handoff/SKILL.md`
- **Then**: the skill is understandable in English and preserves the out/in/list protocol plus preview-before-continue behavior
- **Test function**: `test_handoff_is_canonical_english`

### Scenario 3: Release is canonical English
- **Given**: `release` controls final disclosure and release routing
- **When**: checking `.agents/skills/pf-release/SKILL.md`
- **Then**: the skill is understandable in English and preserves honest disclosure, rollback requirements, and the existing decision labels
- **Test function**: `test_release_is_canonical_english`

## Failure Conditions
- any of these skills still default to Chinese
- the translation changes core mode structure, exit routing, or decision labels
