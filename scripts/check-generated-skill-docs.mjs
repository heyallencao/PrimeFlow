#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "bin", "primeflow.mjs");
const manifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "primeflow.manifest.json"), "utf8"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "primeflow-generated-skills-"));
const generatedRoot = path.join(tempRoot, "skills");
const committedRoot = path.join(workspaceRoot, ".agents", "skills");

function runGenerate() {
  const result = spawnSync(
    process.execPath,
    [cliPath, "--project-root", workspaceRoot, "gen", "skill-docs", "--agent", "codex", "--output", generatedRoot, "--force"],
    {
      cwd: workspaceRoot,
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to generate Codex skill docs");
  }
}

function read(relativePath) {
  return fs.readFileSync(relativePath, "utf8");
}

function collectSkillDocs(root, base = root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const collected = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectSkillDocs(absolutePath, base));
      continue;
    }
    if (entry.isFile() && entry.name === "SKILL.md") {
      collected.push(path.relative(base, absolutePath));
    }
  }

  return collected;
}

try {
  runGenerate();

  const manifestSkillDocs = manifest.skills.map((skill) => path.join(skill.alias, "SKILL.md")).sort();
  const generatedSkillDocs = collectSkillDocs(generatedRoot)
    .map((relativePath) => relativePath.replaceAll(path.sep, "/"))
    .sort();
  const committedSkillDocs = collectSkillDocs(committedRoot)
    .map((relativePath) => relativePath.replaceAll(path.sep, "/"))
    .sort();

  assert.deepEqual(
    generatedSkillDocs,
    manifestSkillDocs,
    "Generated .agents wrappers do not match the manifest-declared wrapper set."
  );

  assert.deepEqual(
    committedSkillDocs,
    generatedSkillDocs,
    "Committed .agents wrappers do not match the generated wrapper set."
  );

  const mismatches = [];

  for (const relativeSkillDoc of generatedSkillDocs) {
    const generatedPath = path.join(generatedRoot, relativeSkillDoc);
    const committedPath = path.join(committedRoot, relativeSkillDoc);

    assert.ok(fs.existsSync(generatedPath), `Generated skill doc is missing: ${relativeSkillDoc}`);
    assert.ok(fs.existsSync(committedPath), `Committed skill doc is missing: ${relativeSkillDoc}`);

    if (read(generatedPath) !== read(committedPath)) {
      mismatches.push(relativeSkillDoc);
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    `Generated Codex skill docs are out of sync with committed .agents wrappers:\n${mismatches.join("\n")}`
  );

  console.log("Generated skill docs match committed .agents wrappers.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
