# Test Contract: GitLab CI Detection

## Scope
Add GitLab CI (.gitlab-ci.yml) detection to `keystone detect-ci` command.

## Test Scenarios

### Scenario 1: GitLab CI detected
- **Given**: a project with `.gitlab-ci.yml` at root
- **When**: `keystone detect-ci` is run
- **Then**: output JSON has `type: "gitlab-ci"`
- **Test function**: `test_gitlab_ci_detected`

### Scenario 2: GitLab CI test_cmd parsed
- **Given**: a project with `.gitlab-ci.yml` containing `npm test` or `pytest` in script sections
- **When**: `keystone detect-ci` is run
- **Then**: output JSON has `test_cmd` set to the detected test command
- **Test function**: `test_gitlab_ci_test_cmd`

### Scenario 3: Priority: GitHub Actions beats GitLab CI
- **Given**: a project with both `.github/workflows/*.yml` and `.gitlab-ci.yml`
- **When**: `keystone detect-ci` is run
- **Then**: output JSON has `type: "github-actions"` (not gitlab-ci)
- **Test function**: `test_github_actions_beats_gitlab`

### Scenario 4: GitLab CI beats Jenkins
- **Given**: a project with both `.gitlab-ci.yml` and `Jenkinsfile`
- **When**: `keystone detect-ci` is run
- **Then**: output JSON has `type: "gitlab-ci"` (not jenkins)
- **Test function**: `test_gitlab_beats_jenkins`

## Edge Conditions
- Empty `.gitlab-ci.yml` (valid YAML, no scripts)
- `.gitlab-ci.yml` with only deploy stages, no test stages

## Failure Conditions
- `.gitlab-ci.yml` is invalid YAML (should still detect type, but test_cmd may be null)
