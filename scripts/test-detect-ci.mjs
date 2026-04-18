#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "bin", "primeflow.mjs");

function runDetectCi(projectRoot) {
  const result = spawnSync(process.execPath, [cliPath, "detect-ci", "--project-root", projectRoot], {
    encoding: "utf8",
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(`detect-ci failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout.trim());
}

// Scenario 1: GitLab CI detected
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-detect-gitlab-"));
  try {
    // Create .gitlab-ci.yml
    fs.writeFileSync(path.join(tmpDir, ".gitlab-ci.yml"), `
test:
  script:
    - npm test
`);
    const result = runDetectCi(tmpDir);
    assert.equal(result.type, "gitlab-ci", "Scenario 1: type should be gitlab-ci when .gitlab-ci.yml exists");
    console.log("PASS: Scenario 1 - GitLab CI detected");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Scenario 2: GitLab CI test_cmd parsed
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-detect-gitlab-cmd-"));
  try {
    fs.writeFileSync(path.join(tmpDir, ".gitlab-ci.yml"), `
test:
  script:
    - npm test
    - npm run coverage
`);
    const result = runDetectCi(tmpDir);
    assert.equal(result.type, "gitlab-ci");
    assert.equal(result.test_cmd, "npm test", "Scenario 2: test_cmd should be parsed from .gitlab-ci.yml");
    console.log("PASS: Scenario 2 - GitLab CI test_cmd parsed");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Scenario 3: GitHub Actions beats GitLab CI
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-detect-gh-over-gl-"));
  try {
    fs.mkdirSync(path.join(tmpDir, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".github", "workflows", "ci.yml"), `
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`);
    fs.writeFileSync(path.join(tmpDir, ".gitlab-ci.yml"), `
test:
  script:
    - npm test
`);
    const result = runDetectCi(tmpDir);
    assert.equal(result.type, "github-actions", "Scenario 3: GitHub Actions should beat GitLab CI");
    console.log("PASS: Scenario 3 - GitHub Actions beats GitLab CI");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Scenario 4: GitLab CI beats Jenkins
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-detect-gl-over-jk-"));
  try {
    fs.writeFileSync(path.join(tmpDir, ".gitlab-ci.yml"), `
test:
  script:
    - npm test
`);
    fs.writeFileSync(path.join(tmpDir, "Jenkinsfile"), `
pipeline {
  stages {
    stage('Test') {
      sh 'npm test'
    }
  }
}
`);
    const result = runDetectCi(tmpDir);
    assert.equal(result.type, "gitlab-ci", "Scenario 4: GitLab CI should beat Jenkins");
    console.log("PASS: Scenario 4 - GitLab CI beats Jenkins");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("\nAll detect-ci GitLab tests passed.");
