#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HAN_REGEX = /\p{Script=Han}/u;

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function assertEnglishFirst(relativePath, requiredPatterns = []) {
  const content = read(relativePath);
  assert.ok(!HAN_REGEX.test(content), `${relativePath} should not contain Chinese characters`);
  for (const pattern of requiredPatterns) {
    assert.match(content, pattern, `${relativePath} is missing required pattern ${pattern}`);
  }
}

const canonicalDocs = [
  {
    path: "README.md",
    patterns: [/^# Keystone$/m, /Keystone is/i, /Quick Start/i, /Documentation/i]
  },
  {
    path: "docs/README.codex.md",
    patterns: [/^# Keystone for Codex$/m, /Quick Install/i, /First Run/i, /Usage/i]
  },
  {
    path: "docs/quickstart.md",
    patterns: [/^# Keystone in 5 Minutes$/m, /Step 1/i, /Step 5/i, /fresh evidence/i]
  },
  {
    path: "docs/language-policy.md",
    patterns: [/^# Keystone Language Policy$/m, /English is the canonical/i, /Chinese/i, /runtime skills/i]
  },
  {
    path: "docs/installation.md",
    patterns: [/^# Keystone Installation Guide$/m, /Install Keystone/i, /After Installation/i, /Common Commands/i]
  },
  {
    path: "CONTRIBUTING.md",
    patterns: [/^# Contributing to Keystone$/m, /How to Contribute/i, /Verification/i]
  },
  {
    path: "CODE_OF_CONDUCT.md",
    patterns: [/^# Keystone Code of Conduct$/m, /Expected Behavior/i, /Unacceptable Behavior/i]
  },
  {
    path: "SECURITY.md",
    patterns: [/^# Security Policy$/m, /How to Report/i, /private disclosure/i]
  },
  {
    path: "RELEASING.md",
    patterns: [/^# Releasing Keystone$/m, /Current Release Model/i, /Release Checklist/i]
  },
  {
    path: "FRAMEWORK.md",
    patterns: [/^# Keystone Framework$/m, /Core Principles/i, /Decision Contract/i]
  },
  {
    path: "SYSTEM.md",
    patterns: [/^# Keystone System Architecture$/m, /Layered Architecture/i, /Main Workflow/i]
  },
  {
    path: "STATE.md",
    patterns: [/^# Keystone State Management$/m, /State File Location/i, /Handoff Protocol/i]
  },
  {
    path: "docs/golden-paths.md",
    patterns: [/^# Keystone Golden Paths$/m, /New Feature Path/i, /Session Switch Path/i]
  },
  {
    path: "docs/walkthrough.md",
    patterns: [/^# Keystone Walkthrough$/m, /Example Task/i, /orchestrate -> roundtable/i]
  },
  {
    path: "examples/README.md",
    patterns: [/^# Keystone Examples$/m, /copyable/i, /Claude|Codex|Gemini/i]
  },
  {
    path: "examples/claude.md",
    patterns: [/^# Keystone on Claude$/m, /\/ks-help/i, /copy and paste/i]
  },
  {
    path: "examples/codex.md",
    patterns: [/^# Keystone on Codex$/m, /\/ks-help/i, /copy and paste/i]
  },
  {
    path: "examples/gemini.md",
    patterns: [/^# Keystone on Gemini$/m, /\/ks-help/i, /copy and paste/i]
  },
  {
    path: "docs/agent-compatibility-matrix.md",
    patterns: [/^# Keystone Agent Compatibility Matrix$/m, /Claude|Codex|Gemini/i]
  },
  {
    path: "docs/agent-implementation.md",
    patterns: [/^# Keystone Agent Implementation$/m, /semantic consistency/i, /Decision Contract/i]
  },
  {
    path: "docs/agent-invocations.md",
    patterns: [/^# Keystone Agent Invocations$/m, /\/ks-help/i, /Claude|Codex|Gemini/i]
  },
  {
    path: "docs/decision-matrix.md",
    patterns: [/^# Keystone Decision Matrix$/m, /help-guided/i, /route-\*/i]
  },
  {
    path: "docs/distribution-model.md",
    patterns: [/^# Keystone Distribution Model$/m, /runtime/i, /manifest/i]
  },
  {
    path: "docs/maintainer.md",
    patterns: [/^# Keystone Maintainer Guide$/m, /npm run smoke/i, /dist build/i]
  },
  {
    path: "docs/team-policy.md",
    patterns: [/^# Keystone Team Policy$/m, /review/i, /release/i]
  },
  {
    path: "docs/vnext-roadmap.md",
    patterns: [/^# Keystone vNext Roadmap$/m, /Phase/i, /Next Steps/i]
  },
  {
    path: "keystone.manifest.json",
    patterns: [/"name": "Keystone"/, /"summary": "Keystone first-run entry/i, /"entry": "support\/help\/SKILL\.md"/]
  },
  {
    path: "bin/keystone.mjs",
    patterns: [/function createHandoff\(/, /Resume at verify/i, /No handoff found/i]
  }
];

const canonicalSkills = [
  {
    path: "support/help/SKILL.md",
    patterns: [/^# Help$/m, /decision\*\*: help-guided/i, /next_skill\*\*: orchestrate/i]
  },
  {
    path: "orchestration/orchestrate/SKILL.md",
    patterns: [/^# Orchestrate$/m, /decision\*\*: `route-\$_ROUTING`/i, /next_skill\*\*: `\$_ROUTING`/i]
  },
  {
    path: "decision/writing-plan/SKILL.md",
    patterns: [/^# Writing Plan$/m, /decision\*\*: block-defined/i, /next_skill\*\*: default test-first/i]
  },
  {
    path: "execution/verify/SKILL.md",
    patterns: [/^# Verify$/m, /decision\*\*: verify-pass/i, /fresh evidence/i]
  },
  {
    path: "decision/review/SKILL.md",
    patterns: [/^# Review$/m, /qa_required/i, /confidence < 0\.60/i]
  },
  {
    path: "execution/test-first/SKILL.md",
    patterns: [/^# Test-First$/m, /red-green-refactor/i, /decision\*\*: test-contract-ready/i]
  },
  {
    path: "execution/implement/SKILL.md",
    patterns: [/^# Implement$/m, /next_skill\*\*: verify/i, /scope/i]
  },
  {
    path: "execution/diagnose/SKILL.md",
    patterns: [/^# Diagnose$/m, /3 loops/i, /decision\*\*: root-cause-found/i]
  },
  {
    path: "decision/brief/SKILL.md",
    patterns: [/^# Brief$/m, /decision\*\*: brief-defined/i, /roundtable|writing-plan/i]
  },
  {
    path: "decision/roundtable/SKILL.md",
    patterns: [/^# Roundtable$/m, /brainstorm|align|challenge/i, /next_skill\*\*: writing-plan/i]
  },
  {
    path: "orchestration/handoff/SKILL.md",
    patterns: [/^# Handoff$/m, /handoff out/i, /preview/i]
  },
  {
    path: "operation/release/SKILL.md",
    patterns: [/^# Release$/m, /release-full|release-gradual|release-paused|release-rollback/i, /rollback/i]
  },
  {
    path: "execution/bug-triage/SKILL.md",
    patterns: [/^# Bug Triage$/m, /spec-gap|implementation-bug|rollback-candidate/i, /decision\*\*: triage-complete/i]
  },
  {
    path: "support/docs-writer/SKILL.md",
    patterns: [/^# Docs Writer$/m, /docs-draft-ready/i, /Evidence/i]
  },
  {
    path: "support/knowledge/SKILL.md",
    patterns: [/^# Knowledge$/m, /skip|update|create/i, /retrieve/i]
  },
  {
    path: "operation/pr-prep/SKILL.md",
    patterns: [/^# PR Prep$/m, /pr-context-ready/i, /Validation/i]
  },
  {
    path: "operation/qa/SKILL.md",
    patterns: [/^# QA$/m, /qa-pass|qa-partial|qa-fail/i, /partial/i]
  },
  {
    path: "operation/ship/SKILL.md",
    patterns: [/^# Ship$/m, /ship-done|ship-canary-failed|ship-advisory/i, /advisory/i]
  }
];

const githubTemplates = [
  {
    path: ".github/ISSUE_TEMPLATE/bug-report.md",
    patterns: [/^---$/m, /Bug Report/i, /Steps to Reproduce/i]
  },
  {
    path: ".github/ISSUE_TEMPLATE/feature-request.md",
    patterns: [/^---$/m, /Feature Request/i, /Problem Statement/i]
  },
  {
    path: ".github/pull_request_template.md",
    patterns: [/^## Summary$/m, /Verification/i, /Keystone Stage/i]
  }
];

const runtimeArtifacts = [
  {
    path: "orchestration/handoff/references/handoff-template.md",
    patterns: [/^# Handoff Package$/m, /Eight Required Slots/i, /Current Task/i]
  },
  {
    path: "orchestration/handoff/scripts/handoff_file.sh",
    patterns: [/handoff_file\.sh create \[topic\]/, /not recorded/i, /Resume at verify/i]
  },
  {
    path: "scripts/install.sh",
    patterns: [/Keystone installer/i, /Cloning Keystone/i, /Keystone installed successfully/i]
  },
  {
    path: "templates/plan.md",
    patterns: [/^# Plan: \[block name\]$/m, /Done Criteria/i, /Next skill/i]
  },
  {
    path: "templates/test-contract.md",
    patterns: [/^# Test Contract: \[block name\]$/m, /Test Scenarios/i, /Failure Conditions/i]
  },
  {
    path: "templates/review-report.md",
    patterns: [/^## Review Report$/m, /Residual Risks/i, /qa_required/i]
  },
  {
    path: "templates/release-statement.md",
    patterns: [/^## Release Statement$/m, /Disclosed Risks/i, /Rollback Plan/i]
  },
  {
    path: "templates/incident-report.md",
    patterns: [/^## Incident Report$/m, /Symptoms/i, /Mitigation/i]
  }
];

for (const item of canonicalDocs) {
  assertEnglishFirst(item.path, item.patterns);
}

for (const item of canonicalSkills) {
  assertEnglishFirst(item.path, item.patterns);
}

for (const item of githubTemplates) {
  assertEnglishFirst(item.path, item.patterns);
}

for (const item of runtimeArtifacts) {
  assertEnglishFirst(item.path, item.patterns);
}

console.log("English foundation checks passed.");
