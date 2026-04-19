# Test Contract: Runtime Final Wave

## Scope
Lock the final canonical skill migration wave for:
- `ks-bug-triage`
- `ks-docs-writer`
- `ks-knowledge`
- `ks-pr-prep`
- `ks-qa`
- `ks-ship`

## Test Scenarios

### Scenario 1: Bug triage is canonical English
- **Given**: `bug-triage` is the fast entry for ambiguous failures
- **When**: checking `.agents/skills/ks-bug-triage/SKILL.md`
- **Then**: the skill is understandable in English and preserves `spec-gap`, `implementation-bug`, and `rollback-candidate`
- **Test function**: `test_bug_triage_is_canonical_english`

### Scenario 2: Docs writer is canonical English
- **Given**: `docs-writer` turns verified results into stable docs
- **When**: checking `.agents/skills/ks-docs-writer/SKILL.md`
- **Then**: the skill is understandable in English and preserves evidence-first documentation behavior
- **Test function**: `test_docs_writer_is_canonical_english`

### Scenario 3: Knowledge is canonical English
- **Given**: `knowledge` decides whether to skip, update, or create reusable knowledge
- **When**: checking `.agents/skills/ks-knowledge/SKILL.md`
- **Then**: the skill is understandable in English and preserves retrieve-before-write behavior
- **Test function**: `test_knowledge_is_canonical_english`

### Scenario 4: PR prep is canonical English
- **Given**: `pr-prep` packages review-ready merge context
- **When**: checking `.agents/skills/ks-pr-prep/SKILL.md`
- **Then**: the skill is understandable in English and preserves honest validation and risk disclosure
- **Test function**: `test_pr_prep_is_canonical_english`

### Scenario 5: QA is canonical English
- **Given**: `qa` is the conditional real-runtime validation layer
- **When**: checking `.agents/skills/ks-qa/SKILL.md`
- **Then**: the skill is understandable in English and preserves `pass` / `partial` / `fail` semantics
- **Test function**: `test_qa_is_canonical_english`

### Scenario 6: Ship is canonical English
- **Given**: `ship` is the pre-release delivery closeout layer
- **When**: checking `.agents/skills/ks-ship/SKILL.md`
- **Then**: the skill is understandable in English and preserves advisory-vs-executable behavior plus canary routing
- **Test function**: `test_ship_is_canonical_english`

## Failure Conditions
- any canonical skill still defaults to Chinese
- translation changes core exit routing or decision labels
