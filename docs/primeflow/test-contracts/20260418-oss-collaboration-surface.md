# Test Contract: OSS Collaboration Surface

## Scope
Lock the next open-source readiness block for PrimeFlow:
- installation guidance
- contribution entry points
- community behavior expectations
- vulnerability reporting path
- issue and PR intake templates

## Test Scenarios

### Scenario 1: Installation guide is usable in English
- **Given**: external users need a full install reference after the README
- **When**: checking `docs/installation.md`
- **Then**: the install flow, agent targeting rules, and post-install usage are understandable in English without falling back to Chinese
- **Test function**: `test_installation_doc_is_english_first`

### Scenario 2: Contribution entry exists
- **Given**: an interested contributor should not guess how to participate
- **When**: checking `CONTRIBUTING.md`
- **Then**: the repo explains how to propose changes, how to scope work, and which checks to run
- **Test function**: `test_contributing_exists`

### Scenario 3: Community and security expectations exist
- **Given**: open-source repos need clear behavioral and security reporting norms
- **When**: checking `CODE_OF_CONDUCT.md` and `SECURITY.md`
- **Then**: community expectations and a vulnerability reporting path are both present in English
- **Test function**: `test_conduct_and_security_exist`

### Scenario 4: GitHub intake templates exist
- **Given**: issues and PRs should enter the repo with enough structure
- **When**: checking `.github/ISSUE_TEMPLATE/*` and `.github/pull_request_template.md`
- **Then**: bug reports, feature requests, and PRs all have structured prompts in English
- **Test function**: `test_github_templates_exist`

## Edge Conditions
- The collaboration surface should stay lightweight; this block does not need a full governance program
- The templates should reflect PrimeFlow's workflow language instead of generic boilerplate
- `package.json` publication settings are outside this block

## Failure Conditions
- installation guidance still defaults to Chinese
- contributors still have no explicit entry path
- security reporting or conduct expectations are missing
- GitHub issue or PR intake remains unstructured
