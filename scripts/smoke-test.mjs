#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "bin", "keystone.mjs");
const installScriptPath = path.join(workspaceRoot, "scripts", "install.sh");
const manifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "keystone.manifest.json"), "utf8"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "keystone-smoke-"));
const tempHome = path.join(tempRoot, "home");
const distOutput = path.join(tempRoot, "dist", "Keystone");

function sharedRuntimeRoot(home) {
  return path.join(home, ".keystone", "runtime", "Keystone");
}

function legacySharedRuntimeRoot(home) {
  return path.join(home, ".agents", "skills", "Keystone");
}

function publicSkillPath(home, alias) {
  return path.join(home, ".agents", "skills", alias, "SKILL.md");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function run(args) {
  const result = spawnSync(process.execPath, [cliPath, "--project-root", tempRoot, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: tempHome
    }
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Command failed: ${args.join(" ")}`);
  }
  return result.stdout.trim();
}

function runFail(args) {
  const result = spawnSync(process.execPath, [cliPath, "--project-root", tempRoot, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: tempHome
    }
  });
  assert.notEqual(result.status, 0, `Expected failure: ${args.join(" ")}`);
  return `${result.stderr}${result.stdout}`;
}

function runInstallScript(args = [], extraEnv = {}) {
  return spawnSync("bash", [installScriptPath, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: tempHome,
      ...extraEnv
    }
  });
}

try {
  fs.mkdirSync(tempHome, { recursive: true });

  const doctorOutput = run(["doctor"]);
  assert.match(doctorOutput, /Core environment is ready\./);
  assert.match(doctorOutput, /Project root/);
  assert.match(doctorOutput, /Shared runtime path/);
  assert.match(doctorOutput, /Next steps:/);

  assert.equal(manifest.agentFacing.recommendedByIntent.find((item) => item.intent === "unknown-start")?.skill, "ks-help");
  assert.equal(manifest.agentFacing.recommendedByIntent.find((item) => item.intent === "formal-routing")?.skill, "ks-orchestrate");
  assert.deepEqual(manifest.agentFacing.menuOrder.primaryEntry, ["ks-help", "ks-orchestrate", "ks-handoff"]);
  assert.equal(manifest.agentFacing.presentationDefaults.claude.preferredInvocationStyle, "slash-command");
  assert.equal(manifest.agentFacing.presentationDefaults.codex.preferredInvocationStyle, "slash-command");
  assert.equal(manifest.agentFacing.presentationDefaults.gemini.preferredInvocationStyle, "slash-command");
  assert.equal(manifest.skills.find((skill) => skill.name === "ks-help")?.class_priority, 10);
  assert.equal(manifest.skills.find((skill) => skill.name === "ks-knowledge")?.class_priority, 50);
  assert.deepEqual(manifest.agentFacing.presentationDefaults.claude.highlightSections, ["primaryEntry", "highFrequency", "closeout"]);
  assert.deepEqual(manifest.agentFacing.presentationDefaults.codex.highlightSections, ["primaryEntry", "highFrequency", "mainline"]);

  const doctorHome = path.join(tempRoot, "doctor-home");
  fs.mkdirSync(path.join(doctorHome, ".codex"), { recursive: true });
  const doctorAlternateHomeOutput = run(["doctor", "--home", doctorHome]);
  assert.match(doctorAlternateHomeOutput, new RegExp(`Agent home: ${doctorHome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(doctorAlternateHomeOutput, /Detected agent targets: codex/);
  assert.match(doctorAlternateHomeOutput, /Run `\.\/keystone install` to install Keystone into codex\./);

  const scaffoldListOutput = run(["scaffold", "list"]);
  assert.match(scaffoldListOutput, /Available templates:/);
  assert.match(scaffoldListOutput, /plan/);

  const scaffoldPlanOutput = run(["scaffold", "plan"]);
  assert.match(scaffoldPlanOutput, /Scaffold complete/);
  const scaffoldedPlanPath = scaffoldPlanOutput.match(/^Output: (.+)$/m)?.[1];
  assert.ok(scaffoldedPlanPath, "scaffold output should print the generated path");
  assert.ok(fs.existsSync(scaffoldedPlanPath), "default scaffold output should be created");

  const customIncidentPath = path.join(tempRoot, "notes", "incident.md");
  const scaffoldIncidentOutput = run(["scaffold", "incident-report", "--output", customIncidentPath]);
  assert.match(scaffoldIncidentOutput, /Template: incident-report/);
  assert.ok(fs.existsSync(customIncidentPath), "custom scaffold output should be created");

  const relativeReviewPath = path.join(tempRoot, "notes", "review.md");
  const scaffoldRelativeOutput = run(["scaffold", "review-report", "--output", "notes/review.md"]);
  assert.match(scaffoldRelativeOutput, /Template: review-report/);
  assert.ok(fs.existsSync(relativeReviewPath), "relative scaffold output should resolve from project root");

  const statePath = run(["state", "init"]);
  assert.ok(fs.existsSync(statePath), "state.json should be created");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(state.exit_code, "ok");
  assert.equal(state.exit_reason, "");
  assert.equal(state.next_skill, "");
  assert.equal(state.rollback_target, null);
  assert.equal(state.rollback_method, null);

  run(["state", "set", "current_block", "smoke-block"]);
  const handoffPath = run(["handoff", "create", "smoke-check"]);
  assert.ok(fs.existsSync(handoffPath), "handoff.md should be created");

  const dryRunOutput = run(["install", "--dry-run", "--home", tempHome, "--agent", "claude"]);
  assert.match(dryRunOutput, /Dry run complete/);
  assert.ok(!fs.existsSync(path.join(tempHome, ".claude", "skills", "Keystone")));

  const missingHostOutput = runFail(["install", "--home", tempHome]);
  assert.match(missingHostOutput, /No supported agent target detected/);
  assert.match(missingHostOutput, /install --agent <claude\|codex\|gemini>/);

  const autoClaudeHome = path.join(tempRoot, "auto-claude-home");
  fs.mkdirSync(path.join(autoClaudeHome, ".claude"), { recursive: true });
  const autoClaudeInstallOutput = run(["install", "--home", autoClaudeHome]);
  assert.match(autoClaudeInstallOutput, /Agent targets: claude/);
  assert.match(autoClaudeInstallOutput, /Auto-detected agent target: claude/);
  assert.ok(fs.existsSync(path.join(sharedRuntimeRoot(autoClaudeHome), "keystone.manifest.json")));
  assert.ok(
    fs.existsSync(path.join(autoClaudeHome, ".claude", "skills", "Keystone", "keystone.manifest.json")),
    "auto-detected Claude install should succeed"
  );
  assert.ok(fs.lstatSync(path.join(autoClaudeHome, ".claude", "skills", "Keystone")).isSymbolicLink());

  const ambiguousHome = path.join(tempRoot, "ambiguous-home");
  fs.mkdirSync(path.join(ambiguousHome, ".claude"), { recursive: true });
  fs.mkdirSync(path.join(ambiguousHome, ".codex"), { recursive: true });
  const ambiguousHostOutput = runFail(["install", "--home", ambiguousHome]);
  assert.match(ambiguousHostOutput, /Multiple supported agent targets detected/);
  assert.match(ambiguousHostOutput, /install --agent claude/);
  assert.match(ambiguousHostOutput, /install --agents claude,codex/);

  const dangerousDistOutput = runFail(["dist", "build", "--output", "."]);
  assert.match(dangerousDistOutput, /Refusing to use dangerous dist output path/);

  const customDistOutput = path.join(tempRoot, "custom-dist");
  fs.mkdirSync(customDistOutput, { recursive: true });
  fs.writeFileSync(path.join(customDistOutput, "keep.txt"), "keep", "utf8");
  const customDistFail = runFail(["dist", "build", "--output", customDistOutput]);
  assert.match(customDistFail, /Refusing to clean non-empty dist output without --force-clean/);
  assert.ok(fs.existsSync(path.join(customDistOutput, "keep.txt")), "custom dist output should stay intact without --force-clean");
  const customDistSuccess = run(["dist", "build", "--output", customDistOutput, "--force-clean"]);
  assert.match(customDistSuccess, /Keystone Dist Build/);
  assert.ok(fs.existsSync(path.join(customDistOutput, "release.json")), "forced dist build should produce release metadata");
  assert.ok(!fs.existsSync(path.join(customDistOutput, "keep.txt")), "forced dist build should replace existing output");

  const distOutputText = run(["dist", "build", "--output", distOutput]);
  assert.match(distOutputText, /Keystone Dist Build/);
  assert.ok(fs.existsSync(path.join(distOutput, "release.json")), "release metadata should be created");

  const installOutput = run(["install", "--home", tempHome, "--agent", "claude"]);
  assert.match(installOutput, /Install summary/);
  assert.match(installOutput, /Use in claude: Use \/ks-help when you do not know where to start, or \/ks-orchestrate when you want formal routing\./);
  const claudeInstall = path.join(tempHome, ".claude", "skills", "Keystone");
  const claudeRuntime = sharedRuntimeRoot(tempHome);
  assert.ok(fs.existsSync(path.join(claudeRuntime, "keystone.manifest.json")), "shared runtime should be installed");
  assert.ok(!fs.existsSync(legacySharedRuntimeRoot(tempHome)), "legacy shared runtime should be removed");
  assert.ok(fs.lstatSync(claudeInstall).isSymbolicLink(), "Claude install should be a symlink into the shared runtime");
  assert.equal(fs.realpathSync(claudeInstall), fs.realpathSync(claudeRuntime), "Claude symlink should point at the shared runtime");
  assert.ok(fs.existsSync(path.join(claudeInstall, "keystone.manifest.json")), "manifest should be installed");
  assert.ok(fs.existsSync(publicSkillPath(tempHome, "ks-help")), "public ks-help skill should be installed");
  const publicHelpContent = fs.readFileSync(publicSkillPath(tempHome, "ks-help"), "utf8");
  assert.match(publicHelpContent, /^# Help$/m);
  assert.doesNotMatch(publicHelpContent, /public agent-installed wrapper/);
  assert.match(
    publicHelpContent,
    new RegExp(escapeRegex(`${claudeRuntime}/docs/quickstart.md`))
  );
  assert.doesNotMatch(publicHelpContent, /`docs\/quickstart\.md`/);
  const publicHandoffContent = fs.readFileSync(publicSkillPath(tempHome, "ks-handoff"), "utf8");
  assert.match(
    publicHandoffContent,
    new RegExp(escapeRegex(`${claudeRuntime}/orchestration/handoff/scripts/handoff_file.sh`))
  );
  assert.match(
    publicHandoffContent,
    new RegExp(escapeRegex(`${claudeRuntime}/orchestration/handoff/references/handoff-template.md`))
  );
  assert.doesNotMatch(publicHandoffContent, /`references\/handoff-template\.md`/);
  const publicOrchestrateContent = fs.readFileSync(publicSkillPath(tempHome, "ks-orchestrate"), "utf8");
  assert.match(
    publicOrchestrateContent,
    new RegExp(escapeRegex(`${claudeRuntime}/orchestration/handoff/SKILL.md`))
  );
  assert.doesNotMatch(publicOrchestrateContent, /`orchestration\/handoff\/SKILL\.md`/);
  for (const skill of manifest.skills) {
    assert.ok(fs.existsSync(path.join(claudeInstall, skill.entry)), `Claude install should include ${skill.name}`);
    assert.ok(fs.existsSync(publicSkillPath(tempHome, skill.alias)), `public skill should be installed for ${skill.alias}`);
    assert.ok(
      fs.existsSync(path.join(tempHome, ".claude", "commands", `${skill.alias}.md`)),
      `Claude alias should be generated for ${skill.alias}`
    );
  }

  fs.rmSync(claudeInstall, { recursive: true, force: true });
  fs.symlinkSync(path.join(tempRoot, "missing-keystone-target"), claudeInstall, "dir");
  const danglingSymlinkInstallOutput = run(["install", "--home", tempHome, "--agent", "claude"]);
  assert.match(danglingSymlinkInstallOutput, /Install summary/);
  assert.ok(fs.lstatSync(claudeInstall).isSymbolicLink(), "dangling symlink install should be replaced by a shared-runtime symlink");
  assert.ok(
    fs.existsSync(path.join(claudeInstall, "keystone.manifest.json")),
    "install should succeed when replacing a dangling install symlink"
  );

  const staleAlias = "ks-stale";
  const claudeManifestPath = path.join(claudeInstall, "keystone.manifest.json");
  const claudeInstalledManifest = JSON.parse(fs.readFileSync(claudeManifestPath, "utf8"));
  claudeInstalledManifest.skills.push({ alias: staleAlias, name: "stale-skill", entry: manifest.skills[0].entry });
  fs.writeFileSync(claudeManifestPath, `${JSON.stringify(claudeInstalledManifest, null, 2)}\n`, "utf8");
  const staleCommandPath = path.join(tempHome, ".claude", "commands", `${staleAlias}.md`);
  fs.writeFileSync(staleCommandPath, "stale", "utf8");
  run(["install", "--home", tempHome, "--agent", "claude"]);
  assert.ok(!fs.existsSync(staleCommandPath), "reinstall should remove stale Claude alias commands");

  const codexHome = path.join(tempRoot, "codex-home");
  fs.mkdirSync(path.join(codexHome, ".codex"), { recursive: true });
  const codexInstallOutput = run(["install", "--home", codexHome, "--agent", "codex"]);
  assert.match(codexInstallOutput, /Use in codex: Restart Codex, then start with \/ks-help or \/ks-orchestrate/);
  assert.ok(fs.existsSync(publicSkillPath(codexHome, "ks-help")));
  assert.ok(!fs.existsSync(legacySharedRuntimeRoot(codexHome)));
  assert.ok(!fs.existsSync(path.join(codexHome, ".codex", "skills", "Keystone")));
  const codexHelpContent = fs.readFileSync(publicSkillPath(codexHome, "ks-help"), "utf8");
  assert.match(codexHelpContent, /^# Help$/m);
  assert.doesNotMatch(codexHelpContent, /public agent-installed wrapper/);

  const geminiHome = path.join(tempRoot, "gemini-home");
  fs.mkdirSync(path.join(geminiHome, ".gemini"), { recursive: true });
  const geminiInstallOutput = run(["install", "--home", geminiHome, "--agent", "gemini"]);
  assert.match(geminiInstallOutput, /Use in gemini: Restart Gemini, then start with \/ks-help or \/ks-orchestrate/);
  assert.ok(fs.existsSync(publicSkillPath(geminiHome, "ks-help")));
  assert.ok(!fs.existsSync(legacySharedRuntimeRoot(geminiHome)));
  assert.ok(!fs.existsSync(path.join(geminiHome, ".gemini", "skills", "Keystone")));

  const rollbackSentinel = path.join(claudeInstall, "rollback-sentinel.txt");
  fs.writeFileSync(rollbackSentinel, "keep", "utf8");
  const claudeCommandsDir = path.join(tempHome, ".claude", "commands");
  fs.chmodSync(claudeCommandsDir, 0o555);
  try {
    const failedUpgradeOutput = runFail(["install", "--home", tempHome, "--agent", "claude"]);
    assert.match(failedUpgradeOutput, /Install failed for agent 'claude'/);
  } finally {
    fs.chmodSync(claudeCommandsDir, 0o755);
  }
  assert.ok(fs.existsSync(rollbackSentinel), "bundle swap should roll back if agent integration fails");

  const existingRuntimeRoot = sharedRuntimeRoot(tempHome);
  fs.mkdirSync(existingRuntimeRoot, { recursive: true });
  const installScriptSentinel = path.join(existingRuntimeRoot, "install-script-sentinel.txt");
  fs.writeFileSync(installScriptSentinel, "keep", "utf8");
  const fakeBin = path.join(tempRoot, "fake-bin");
  fs.mkdirSync(fakeBin, { recursive: true });
  const fakeGit = path.join(fakeBin, "git");
  fs.writeFileSync(fakeGit, "#!/usr/bin/env bash\necho 'simulated git clone failure' >&2\nexit 42\n", "utf8");
  fs.chmodSync(fakeGit, 0o755);
  const installScriptFailure = runInstallScript(["--force"], {
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`
  });
  assert.equal(installScriptFailure.status, 42, "install.sh should surface git clone failures");
  assert.ok(
    fs.existsSync(installScriptSentinel),
    "install.sh should keep the existing runtime if the replacement clone fails"
  );

  const installScriptHome = path.join(tempRoot, "install-script-home");
  fs.mkdirSync(path.join(installScriptHome, ".codex"), { recursive: true });
  const installScriptSuccess = runInstallScript([], {
    HOME: installScriptHome,
    KEYSTONE_INSTALL_REPO_URL: workspaceRoot
  });
  assert.equal(installScriptSuccess.status, 0, "install.sh should succeed against a local repository source");
  assert.match(installScriptSuccess.stdout, /Keystone installed successfully\./);
  assert.ok(
    fs.existsSync(path.join(sharedRuntimeRoot(installScriptHome), "keystone.manifest.json")),
    "install.sh should install the shared runtime on success"
  );
  assert.ok(
    fs.existsSync(publicSkillPath(installScriptHome, "ks-help")),
    "install.sh should install public skills for the detected host"
  );
  assert.ok(
    !fs.existsSync(path.join(installScriptHome, ".claude", "skills", "Keystone")),
    "install.sh should not force-install into unrelated hosts when only one host is detected"
  );

  const validateOutput = run(["state", "validate"]);
  assert.match(validateOutput, /state\.json is valid/);

  process.stdout.write("Keystone smoke test passed\n");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
