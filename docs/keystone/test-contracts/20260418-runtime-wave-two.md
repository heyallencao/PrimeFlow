# Test Contract: Runtime Wave Two

## Scope
Lock the second runtime English migration wave for:
- `ks-test-first`
- `ks-implement`
- `ks-diagnose`
- `ks-brief`

## Test Scenarios

### Scenario 1: Test-first is canonical English
- **Given**: `test-first` is part of the default delivery path
- **When**: checking `.agents/skills/ks-test-first/SKILL.md`
- **Then**: the skill is understandable in English and still preserves the red-green-refactor contract
- **Test function**: `test_test_first_is_canonical_english`

### Scenario 2: Implement is canonical English
- **Given**: `implement` is a high-frequency execution skill
- **When**: checking `.agents/skills/ks-implement/SKILL.md`
- **Then**: the skill is understandable in English and still preserves scope discipline and `next_skill = verify`
- **Test function**: `test_implement_is_canonical_english`

### Scenario 3: Diagnose is canonical English
- **Given**: `diagnose` controls bug investigation routing
- **When**: checking `.agents/skills/ks-diagnose/SKILL.md`
- **Then**: the skill is understandable in English and still preserves the three-loop investigation rule
- **Test function**: `test_diagnose_is_canonical_english`

### Scenario 4: Brief is canonical English
- **Given**: `brief` is a common intake skill for messy user input
- **When**: checking `.agents/skills/ks-brief/SKILL.md`
- **Then**: the skill is understandable in English and still only routes to `roundtable` or `writing-plan`
- **Test function**: `test_brief_is_canonical_english`

## Failure Conditions
- any of these skills still default to Chinese
- the translation changes decision labels, next-skill routing, or loop semantics
