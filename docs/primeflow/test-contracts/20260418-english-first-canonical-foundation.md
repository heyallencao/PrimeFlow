# Test Contract: English-First Canonical Foundation

## Scope
Behavior-locking checks for the first English-first canonical foundation wave, covering:

- the root README
- the Codex onboarding doc
- one quickstart path
- the first critical runtime skills
- the language policy declaration

## Test Scenarios

### Scenario 1: README is English-first
- **Given**: the root README is the first thing international users see
- **When**: checking [README.md](/Users/allen/Workspace/projects/personal/PrimeFlow/README.md)
- **Then**: the title, positioning, quick start, and doc entry work in English without depending on Chinese
- **Test function**: `test_readme_is_english_first`

### Scenario 2: Codex onboarding is English-first
- **Given**: Codex users need to install and start PrimeFlow from repo docs
- **When**: checking [docs/README.codex.md](/Users/allen/Workspace/projects/personal/PrimeFlow/docs/README.codex.md)
- **Then**: install guidance, first-run examples, and usage notes are English-first
- **Test function**: `test_codex_readme_is_english_first`

### Scenario 3: Quickstart works without Chinese
- **Given**: first-run help points users to the quickstart
- **When**: checking [docs/quickstart.md](/Users/allen/Workspace/projects/personal/PrimeFlow/docs/quickstart.md)
- **Then**: a new user can understand the first useful workflow path using English only
- **Test function**: `test_quickstart_is_english_first`

### Scenario 4: Language policy is explicit
- **Given**: the repo needs one canonical language policy
- **When**: checking the policy doc and README reference
- **Then**: English canonical, the Chinese mirror boundary, and the runtime single-language rule are all explicit
- **Test function**: `test_language_policy_is_explicit`

### Scenario 5: Core runtime skills are canonical English
- **Given**: core runtime skills shape the default execution language
- **When**: checking `pf-help`, `pf-orchestrate`, `pf-writing-plan`, `pf-verify`, and `pf-review`
- **Then**: frontmatter, headings, and prose are English while decision labels, state keys, and telemetry schema stay stable
- **Test function**: `test_core_skills_are_canonical_english`

### Scenario 6: Canonical files do not regress to Chinese-by-default
- **Given**: canonical surfaces should now default to English
- **When**: scanning target canonical files for Chinese characters
- **Then**: Chinese body text is not allowed except in explicitly allowed mirror or archive layers
- **Test function**: `test_canonical_files_do_not_contain_chinese_body_text`

## Edge Conditions
- machine-readable tokens such as commands, paths, state keys, and telemetry fields may stay unchanged
- Chinese mirror-layer files may still exist, but they are not part of the canonical pass condition
- translation must not mutate decision labels, exit protocol, or state semantics

## Failure Conditions
- README or onboarding still requires Chinese for basic understanding
- the core skills still default to Chinese in description, headings, or prose
- the language policy is missing or ambiguous
- decision labels, state keys, or telemetry schema were damaged during translation
