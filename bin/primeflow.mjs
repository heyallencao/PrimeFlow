#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const packageRoot = scriptPath ? path.dirname(path.dirname(scriptPath)) : cwd;
const rawArgv = process.argv.slice(2);

let projectRootArg = null;
const argv = [];
for (let index = 0; index < rawArgv.length; index += 1) {
  const arg = rawArgv[index];
  if (arg === "--project-root") {
    projectRootArg = rawArgv[index + 1];
    index += 1;
    continue;
  }
  argv.push(arg);
}

function isWithinPath(target, base) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function findGitRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function resolveProjectRoot() {
  if (projectRootArg) {
    return { root: path.resolve(projectRootArg), source: "argument" };
  }
  if (process.env.PRIMEFLOW_PROJECT_ROOT) {
    return { root: path.resolve(process.env.PRIMEFLOW_PROJECT_ROOT), source: "env" };
  }
  const gitRoot = findGitRoot(cwd);
  if (gitRoot) {
    return { root: gitRoot, source: "git" };
  }
  return { root: cwd, source: "cwd" };
}

const { root: projectRoot, source: projectRootSource } = resolveProjectRoot();
const primeflowRoot = path.join(projectRoot, ".primeflow");
const statePath = path.join(primeflowRoot, "state.json");
const telemetryDir = path.join(primeflowRoot, "telemetry", "events");
const handoffRoot = path.join(primeflowRoot, "handoff");
const command = argv[0];
const cliName = scriptPath.endsWith("primeflow.mjs") ? "./primeflow" : "primeflow";
function fail(message) {
  console.error(message);
  process.exit(1);
}

function say(message = "") {
  process.stdout.write(`${message}\n`);
}

function manifestPathFor(sourceRoot) {
  return path.join(sourceRoot, "primeflow.manifest.json");
}

function packagePathFor(sourceRoot) {
  return path.join(sourceRoot, "package.json");
}

function generatedSkillsRootFor(sourceRoot) {
  return path.join(sourceRoot, ".agents", "skills");
}

function templateRootFor(sourceRoot = packageRoot) {
  return path.join(sourceRoot, "templates");
}

function resolveFromProjectRoot(rawPath) {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  return path.join(projectRoot, rawPath);
}

function loadManifest(sourceRoot = packageRoot) {
  try {
    return JSON.parse(fs.readFileSync(manifestPathFor(sourceRoot), "utf8"));
  } catch (error) {
    fail(`Failed to read ${manifestPathFor(sourceRoot)}: ${error.message}`);
  }
}

function loadPackageMetadata(sourceRoot = packageRoot) {
  try {
    return JSON.parse(fs.readFileSync(packagePathFor(sourceRoot), "utf8"));
  } catch (error) {
    fail(`Failed to read ${packagePathFor(sourceRoot)}: ${error.message}`);
  }
}

function ensureProjectRoot() {
  const hasExplicitProjectRoot = Boolean(projectRootArg || process.env.PRIMEFLOW_PROJECT_ROOT);
  if (!hasExplicitProjectRoot && isWithinPath(cwd, packageRoot)) {
    fail(
      `Do not run PrimeFlow from the skill package directory.\n` +
      `Run it from your project root, for example:\n` +
      `  cd <project-root>\n` +
      `  ${cliName} doctor\n` +
      `Or pass: --project-root <path>`
    );
  }
}

function hasCommand(cmd) {
  const result = spawnSync(cmd, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function detectPlaywright() {
  const localBinary = process.platform === "win32"
    ? path.join(projectRoot, "node_modules", ".bin", "playwright.cmd")
    : path.join(projectRoot, "node_modules", ".bin", "playwright");

  if (fs.existsSync(localBinary)) {
    return { ok: true, source: "local" };
  }

  if (hasCommand("playwright")) {
    return { ok: true, source: "global" };
  }

  return { ok: false, source: null };
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function pathExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function fsyncPathIfPossible(targetPath) {
  let fd;
  try {
    fd = fs.openSync(targetPath, "r");
    fs.fsyncSync(fd);
  } catch (error) {
    if (!["EINVAL", "ENOTSUP", "EBADF"].includes(error.code)) {
      throw error;
    }
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

function copyRecursive(source, destination) {
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    ensureDir(destination);
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function homeDir() {
  return os.homedir();
}

function sharedRuntimeRootForHome(home) {
  return path.join(home, ".primeflow", "runtime", "PrimeFlow");
}

function legacySharedRuntimeRootForHome(home) {
  return path.join(home, ".agents", "skills", "PrimeFlow");
}

function parseDoctorArgs(args) {
  const options = {
    home: process.env.PRIMEFLOW_HOME ? path.resolve(process.env.PRIMEFLOW_HOME) : homeDir()
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--home") {
      const doctorHome = args[index + 1];
      if (!doctorHome) {
        fail(`Usage: ${cliName} doctor [--home <path>]`);
      }
      options.home = path.resolve(doctorHome);
      index += 1;
      continue;
    }
    fail(`Unknown doctor option: ${arg}`);
  }

  return options;
}

function parseInstallArgs(args) {
  const options = {
    dryRun: false,
    agents: [],
    home: process.env.PRIMEFLOW_HOME ? path.resolve(process.env.PRIMEFLOW_HOME) : homeDir(),
    source: packageRoot,
    agentSelection: false,
    autoDetectedAgents: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--agent" || arg === "--host") {
      const agent = args[index + 1];
      if (!agent) {
        fail(`Usage: ${cliName} install [--dry-run] --agent <claude|codex|gemini>`);
      }
      options.agents = [agent];
      options.agentSelection = true;
      index += 1;
      continue;
    }
    if (arg === "--agents" || arg === "--hosts") {
      const rawAgents = args[index + 1];
      if (!rawAgents) {
        fail(`Usage: ${cliName} install [--dry-run] --agents <claude,codex,gemini>`);
      }
      options.agents = rawAgents.split(",").map((value) => value.trim()).filter(Boolean);
      options.agentSelection = true;
      index += 1;
      continue;
    }
    if (arg === "--home") {
      const installHome = args[index + 1];
      if (!installHome) {
        fail(`Usage: ${cliName} install [--dry-run] [--home <path>]`);
      }
      options.home = path.resolve(installHome);
      index += 1;
      continue;
    }
    if (arg === "--source") {
      const sourceRoot = args[index + 1];
      if (!sourceRoot) {
        fail(`Usage: ${cliName} install [--source <path>]`);
      }
      options.source = path.resolve(sourceRoot);
      index += 1;
      continue;
    }
    fail(`Unknown install option: ${arg}`);
  }

  return options;
}

function validateInstallAgents(manifest, agents) {
  const supportedAgents = Object.keys(manifestAgents(manifest));
  for (const agent of agents) {
    if (!supportedAgents.includes(agent)) {
      fail(`Unsupported agent target '${agent}'. Supported agent targets: ${supportedAgents.join(", ")}`);
    }
  }
}

function agentMarkerPaths(agentConfig) {
  const markers = new Set();
  if (agentConfig.markerDir) {
    markers.add(agentConfig.markerDir);
  } else if (agentConfig.skillDir) {
    const skillRoot = agentConfig.skillDir.split(/[\\/]/).filter(Boolean)[0];
    if (skillRoot) {
      markers.add(skillRoot);
    }
  }
  if (agentConfig.commandDir) {
    const commandRoot = agentConfig.commandDir.split(/[\\/]/).filter(Boolean)[0];
    if (commandRoot) {
      markers.add(commandRoot);
    }
  }
  return [...markers];
}

function detectAgents(manifest, home) {
  return Object.entries(manifestAgents(manifest))
    .filter(([, agentConfig]) => agentMarkerPaths(agentConfig).some((marker) => fs.existsSync(path.join(home, marker))))
    .map(([agent]) => agent);
}

function resolveInstallAgents(options, manifest) {
  if (options.agentSelection) {
    return;
  }

  const detectedAgents = detectAgents(manifest, options.home);
  options.autoDetectedAgents = detectedAgents;

  if (detectedAgents.length === 1) {
    options.agents = detectedAgents;
    return;
  }

  if (detectedAgents.length === 0) {
    fail(
      `No supported agent target detected under ${options.home}.\n` +
      `Use one of:\n` +
      `  ${cliName} install --agent <claude|codex|gemini>\n` +
      `  ${cliName} install --agents claude,codex`
    );
  }

  fail(
    `Multiple supported agent targets detected under ${options.home}: ${detectedAgents.join(", ")}\n` +
    `Choose one explicitly with:\n` +
    `  ${cliName} install --agent claude\n` +
    `  ${cliName} install --agent codex\n` +
    `  ${cliName} install --agent gemini\n` +
    `Or install multiple explicitly with:\n` +
    `  ${cliName} install --agents ${detectedAgents.join(",")}`
  );
}

function aliasCommandMarkdown(productName, skill) {
  return `# /${skill.alias}

Use the installed ${productName} skill \`${skill.name}\`.

Skill entry:
\`${skill.entry}\`

What to do:
- Load the ${productName} skill package from the user's installed skills directory.
- Execute the \`${skill.name}\` skill as the primary method.
- Keep the response aligned with this summary: ${skill.summary}
`;
}

function codexRuntimeRootForHome(home) {
  return sharedRuntimeRootForHome(home);
}

function generatedCodexSkillPath(outputRoot, skill) {
  return path.join(outputRoot, skill.alias, "SKILL.md");
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeRuntimeReference(runtimeRootRef) {
  return String(runtimeRootRef).replace(/\\/g, "/").replace(/\/+$/, "");
}

function shellRuntimeReference(runtimeRootRef) {
  const normalized = normalizeRuntimeReference(runtimeRootRef);
  if (normalized === "~") {
    return "${HOME}";
  }
  if (normalized.startsWith("~/")) {
    return `\${HOME}/${normalized.slice(2)}`;
  }
  return normalized;
}

function writeGeneratedCodexSkillDocs(manifest, outputRoot, runtimeRoot, force = true) {
  const normalizedRuntimeRoot = normalizeRuntimeReference(runtimeRoot);
  const shellRuntimeRoot = shellRuntimeReference(runtimeRoot);
  const cliDefaultRef = `${shellRuntimeRoot}/primeflow`;
  const cliCommandRef = `"${shellRuntimeRoot}/primeflow"`;
  for (const skill of manifest.skills) {
    const target = generatedCodexSkillPath(outputRoot, skill);
    if (!force && fs.existsSync(target)) {
      fail(`Refusing to overwrite existing generated skill doc: ${target}`);
    }
    ensureDir(path.dirname(target));
    fs.writeFileSync(
      target,
      resolveGeneratedCodexSkillContent(packageRoot, skill, cliDefaultRef, cliCommandRef, normalizedRuntimeRoot),
      "utf8"
    );
  }
}

function rewriteInstalledSkillReferences(content, runtimeRootRef) {
  const normalizedRuntimeRoot = normalizeRuntimeReference(runtimeRootRef);
  return content
    .replaceAll("`docs/quickstart.md`", `\`${normalizedRuntimeRoot}/docs/quickstart.md\``)
    .replaceAll(
      "`orchestration/handoff/scripts/handoff_file.sh`",
      `\`${normalizedRuntimeRoot}/orchestration/handoff/scripts/handoff_file.sh\``
    )
    .replaceAll(
      "`references/handoff-template.md`",
      `\`${normalizedRuntimeRoot}/orchestration/handoff/references/handoff-template.md\``
    )
    .replaceAll(
      "`orchestration/handoff/SKILL.md`",
      `\`${normalizedRuntimeRoot}/orchestration/handoff/SKILL.md\``
    );
}

function resolveGeneratedCodexSkillContent(
  sourceRoot,
  skill,
  cliDefaultRef,
  cliCommandRef = cliDefaultRef,
  runtimeRootRef = "~/.primeflow/runtime/PrimeFlow"
) {
  const sourcePath = path.join(sourceRoot, skill.entry);
  if (!fs.existsSync(sourcePath)) {
    fail(`Missing skill source for ${skill.name}: ${sourcePath}`);
  }

  const sourceContent = fs.readFileSync(sourcePath, "utf8");
  return rewriteInstalledSkillReferences(sourceContent, runtimeRootRef)
    .replaceAll('_PF_CLI="${PRIMEFLOW_CLI:-./primeflow}"', `_PF_CLI="\${PRIMEFLOW_CLI:-${cliDefaultRef}}"`)
    .replaceAll("./primeflow", cliCommandRef);
}

function loadReleaseMetadata(sourceRoot) {
  const releasePath = path.join(sourceRoot, "release.json");
  if (!fs.existsSync(releasePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(releasePath, "utf8"));
  } catch (error) {
    fail(`Failed to read ${releasePath}: ${error.message}`);
  }
}

function loadInstalledManifest(installRoot) {
  const manifestPath = path.join(installRoot, "primeflow.manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`Failed to read ${manifestPath}: ${error.message}`);
  }
}

function detectInstallMode(sourceRoot) {
  const releaseMetadata = loadReleaseMetadata(sourceRoot);
  return releaseMetadata?.mode || "repo-install";
}

function manifestAgents(manifest) {
  return manifest.agents || manifest.hosts || {};
}

function manifestAgentFacing(manifest) {
  return manifest.agentFacing || manifest.hostFacing || {};
}

function buildRuntimeInstallPlan(options, manifest) {
  const installRoot = sharedRuntimeRootForHome(options.home);
  // Stage and backup names are process-scoped so one install run can swap atomically.
  // Cross-process collisions are still theoretically possible, but require concurrent
  // installs from the same PID namespace targeting the same agent target path.
  const stageRoot = `${installRoot}.stage-${process.pid}`;
  const operations = [];

  for (const relativePath of manifest.distribution.payload.include) {
    operations.push({
      type: "copy",
      source: path.join(options.source, relativePath),
      target: path.join(stageRoot, relativePath)
    });
  }

  const releaseMetadataPath = path.join(options.source, "release.json");
  if (fs.existsSync(releaseMetadataPath)) {
    operations.push({
      type: "copy",
      source: releaseMetadataPath,
      target: path.join(stageRoot, "release.json")
    });
  }

  return {
    installRoot,
    stageRoot,
    operations,
    existingManifest: loadInstalledManifest(installRoot),
    cleanupTargets: [legacySharedRuntimeRootForHome(options.home)].filter((target) => target !== installRoot)
  };
}

function buildAgentInstallPlan(options, manifest, agent, existingManifest) {
  const agentConfig = manifestAgents(manifest)[agent];
  const installRoot = agentConfig.skillDir ? path.join(options.home, agentConfig.skillDir) : null;
  const runtimeRoot = sharedRuntimeRootForHome(options.home);
  const agentOperations = [];
  if (agentConfig.mountRuntime !== false && installRoot) {
    agentOperations.push({
      type: "symlink",
      source: runtimeRoot,
      target: installRoot
    });
  } else if (installRoot) {
    agentOperations.push({
      type: "remove",
      target: installRoot
    });
  }

  if (agentConfig.slashAliases) {
    for (const skill of manifest.skills) {
      agentOperations.push({
        type: "write",
        target: path.join(options.home, agentConfig.commandDir, `${skill.alias}.md`),
        content: aliasCommandMarkdown(manifest.product.name, skill)
      });
    }

    const activeAliases = new Set(manifest.skills.map((skill) => skill.alias));
    for (const previousSkill of existingManifest?.skills || []) {
      if (!activeAliases.has(previousSkill.alias)) {
        agentOperations.push({
          type: "remove",
          target: path.join(options.home, agentConfig.commandDir, `${previousSkill.alias}.md`)
        });
      }
    }
  }

  const runtimeRootForSkills = codexRuntimeRootForHome(options.home);
  const installedCliPath = path.join(runtimeRootForSkills, "primeflow");
  const cliCommandRef = shellSingleQuote(installedCliPath);
  for (const skill of manifest.skills) {
    agentOperations.push({
      type: "write",
      target: path.join(options.home, ".agents", "skills", skill.alias, "SKILL.md"),
      content: resolveGeneratedCodexSkillContent(
        options.source,
        skill,
        installedCliPath,
        cliCommandRef,
        runtimeRootForSkills
      )
    });
  }

  const activeAliases = new Set(manifest.skills.map((skill) => skill.alias));
  for (const previousSkill of existingManifest?.skills || []) {
    if (!activeAliases.has(previousSkill.alias)) {
      agentOperations.push({
        type: "remove",
        target: path.join(options.home, ".agents", "skills", previousSkill.alias)
      });
    }
  }

  return {
    agent,
    installRoot,
    runtimeRoot,
    agentOperations,
    mountRuntime: agentConfig.mountRuntime !== false,
    slashAliases: Boolean(agentConfig.slashAliases)
  };
}

function buildInstallPlans(options, manifest, existingManifest) {
  return options.agents.map((agent) => buildAgentInstallPlan(options, manifest, agent, existingManifest));
}

function invocationGuidanceForAgent(manifest, agent) {
  const agentConfig = manifestAgents(manifest)[agent];
  if (agentConfig?.invocation) {
    return agentConfig.invocation;
  }
  return "Load the installed PrimeFlow skill bundle and call the needed skill by its explicit name, starting from orchestrate.";
}

function validateRuntimeInstallPlan(plan) {
  const missingSources = plan.operations
    .filter((operation) => operation.type === "copy" && !fs.existsSync(operation.source))
    .map((operation) => operation.source);

  if (missingSources.length > 0) {
    fail(`Install payload for shared runtime is incomplete. Missing:\n${missingSources.join("\n")}`);
  }
}

function runCopyOperations(operations, dryRun) {
  for (const operation of operations) {
    if (operation.type === "copy") {
      say(`[copy] ${operation.source} -> ${operation.target}`);
      if (!dryRun) {
        copyRecursive(operation.source, operation.target);
      }
      continue;
    }

    if (operation.type === "write") {
      say(`[write] ${operation.target}`);
      if (!dryRun) {
        ensureDir(path.dirname(operation.target));
        fs.writeFileSync(operation.target, operation.content, "utf8");
      }
    }
  }
}

function runHostOperations(operations, dryRun, silent = false) {
  for (const operation of operations) {
    if (!silent) {
      say(`[${operation.type}] ${operation.target}`);
    }
    if (!dryRun) {
      if (operation.type === "remove") {
        fs.rmSync(operation.target, { recursive: true, force: true });
        continue;
      }
      if (operation.type === "symlink") {
        ensureDir(path.dirname(operation.target));
        fs.rmSync(operation.target, { recursive: true, force: true });
        const symlinkType = process.platform === "win32" ? "junction" : "dir";
        fs.symlinkSync(operation.source, operation.target, symlinkType);
        continue;
      }
      ensureDir(path.dirname(operation.target));
      fs.writeFileSync(operation.target, operation.content, "utf8");
    }
  }
}

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function applyHostOperations(operations, dryRun, silent = false) {
  if (dryRun) {
    runHostOperations(operations, true, silent);
    return;
  }

  const applied = [];
  let backupCounter = 0;
  try {
    for (const operation of operations) {
      if (!silent) {
        say(`[${operation.type}] ${operation.target}`);
      }

      const backupPath = pathExists(operation.target)
        ? `${operation.target}.primeflow-backup-${process.pid}-${backupCounter += 1}`
        : null;
      if (backupPath) {
        removePath(backupPath);
        fs.renameSync(operation.target, backupPath);
      }

      try {
        if (operation.type === "remove") {
          applied.push({ target: operation.target, backupPath });
          continue;
        }
        if (operation.type === "symlink") {
          ensureDir(path.dirname(operation.target));
          const symlinkType = process.platform === "win32" ? "junction" : "dir";
          fs.symlinkSync(operation.source, operation.target, symlinkType);
          applied.push({ target: operation.target, backupPath });
          continue;
        }
        ensureDir(path.dirname(operation.target));
        fs.writeFileSync(operation.target, operation.content, "utf8");
        applied.push({ target: operation.target, backupPath });
      } catch (error) {
        if (backupPath && !pathExists(operation.target)) {
          fs.renameSync(backupPath, operation.target);
        }
        throw error;
      }
    }
  } catch (error) {
    for (const entry of applied.reverse()) {
      if (pathExists(entry.target)) {
        removePath(entry.target);
      }
      if (entry.backupPath && pathExists(entry.backupPath)) {
        ensureDir(path.dirname(entry.target));
        fs.renameSync(entry.backupPath, entry.target);
      }
    }
    throw error;
  }

  for (const entry of applied) {
    if (entry.backupPath && pathExists(entry.backupPath)) {
      removePath(entry.backupPath);
    }
  }
}

function activateInstallRoot(stageRoot, installRoot) {
  const backupRoot = `${installRoot}.backup-${process.pid}`;
  removePath(backupRoot);

  if (!fs.existsSync(stageRoot)) {
    fail(`Staged install root missing: ${stageRoot}`);
  }

  if (pathExists(installRoot)) {
    fs.renameSync(installRoot, backupRoot);
  }

  try {
    fs.renameSync(stageRoot, installRoot);
  } catch (error) {
    if (pathExists(backupRoot) && !pathExists(installRoot)) {
      fs.renameSync(backupRoot, installRoot);
    }
    throw error;
  }

  return {
    finalize() {
      removePath(backupRoot);
    },
    rollback() {
      if (pathExists(installRoot)) {
        removePath(installRoot);
      }
      if (pathExists(backupRoot)) {
        fs.renameSync(backupRoot, installRoot);
      }
    }
  };
}

function validateDistOutputPath(output, forceClean) {
  const rootPath = path.parse(output).root;
  if (output === rootPath) {
    fail(`Refusing to use dangerous dist output path: ${output}`);
  }

  const protectedPaths = [packageRoot, projectRoot, cwd, homeDir()];
  if (protectedPaths.includes(output)) {
    fail(`Refusing to use dangerous dist output path: ${output}`);
  }

  if (isWithinPath(packageRoot, output) || isWithinPath(projectRoot, output) || isWithinPath(cwd, output)) {
    fail(`Refusing to use dangerous dist output path: ${output}`);
  }

  if (!fs.existsSync(output)) {
    return;
  }

  const stats = fs.statSync(output);
  if (!stats.isDirectory()) {
    fail(`Dist output must be a directory path: ${output}`);
  }

  const entries = fs.readdirSync(output);
  if (entries.length === 0) {
    return;
  }

  const defaultDistRoot = path.join(packageRoot, "dist");
  const isManagedDistDir = isWithinPath(output, defaultDistRoot) || isWithinPath(defaultDistRoot, output);
  if (!forceClean && !isManagedDistDir) {
    fail(
      `Refusing to clean non-empty dist output without --force-clean: ${output}\n` +
      `Use '${cliName} dist build --output ${output} --force-clean' if this directory is disposable.`
    );
  }
}

function installCommand(args) {
  const options = parseInstallArgs(args);
  const manifest = loadManifest(options.source);
  const packageMetadata = loadPackageMetadata(options.source);
  const installMode = detectInstallMode(options.source);
  resolveInstallAgents(options, manifest);
  validateInstallAgents(manifest, options.agents);
  const runtimePlan = buildRuntimeInstallPlan(options, manifest);
  const plans = buildInstallPlans(options, manifest, runtimePlan.existingManifest);
  validateRuntimeInstallPlan(runtimePlan);

  say("== PrimeFlow Install ==");
  say(`Mode: ${installMode}`);
  say(`Source: ${options.source}`);
  say(`Home: ${options.home}`);
  say(`Package: ${packageMetadata.name}@${packageMetadata.version}`);
  say(`Shared runtime: ${runtimePlan.installRoot}`);
  say(`Agent targets: ${options.agents.join(", ")}`);
  if (options.autoDetectedAgents.length === 1) {
    say(`Auto-detected agent target: ${options.autoDetectedAgents[0]}`);
  }
  if (options.dryRun) {
    say("Dry run: yes");
  }
  say("");

  say(`Runtime target: ${runtimePlan.installRoot}`);
  if (!options.dryRun) {
    // Clean any leftover stage directory from a previous interrupted run before copying.
    fs.rmSync(runtimePlan.stageRoot, { recursive: true, force: true });
  }
  runCopyOperations(runtimePlan.operations, options.dryRun);
  for (const cleanupTarget of runtimePlan.cleanupTargets) {
    say(`[remove] ${cleanupTarget}`);
  }

  for (const plan of plans) {
    if (plan.mountRuntime) {
      say(`Agent mount (${plan.agent}): ${plan.installRoot}`);
    } else {
      say(`Agent public skills (${plan.agent}): ${path.join(options.home, ".agents", "skills")}`);
    }
    runHostOperations(plan.agentOperations, true);
  }

  if (options.dryRun) {
    say("");
    say("Dry run complete. No files were changed.");
    return;
  }

  let activation;
  try {
    activation = activateInstallRoot(runtimePlan.stageRoot, runtimePlan.installRoot);
    for (const plan of plans) {
      if (plan.agentOperations.length > 0) {
        say(`Finalize agent integrations (${plan.agent})`);
      }
      try {
        applyHostOperations(plan.agentOperations, false, true);
      } catch (error) {
        throw new Error(`agent '${plan.agent}': ${error.message}`);
      }
    }
    for (const cleanupTarget of runtimePlan.cleanupTargets) {
      fs.rmSync(cleanupTarget, { recursive: true, force: true });
    }
    activation.finalize();
  } catch (error) {
    if (activation) {
      activation.rollback();
    }
    fail(`Install failed for ${error.message}`);
  } finally {
    fs.rmSync(runtimePlan.stageRoot, { recursive: true, force: true });
  }

  say("");
  say("Install summary:");
  say(`- Installed shared runtime: ${runtimePlan.installRoot}`);
  say(`- Installed public pf-* skills: ${manifest.skills.map((skill) => path.join(options.home, ".agents", "skills", skill.alias)).join(", ")}`);
  for (const plan of plans) {
    if (plan.mountRuntime) {
      say(`- Mounted agent ${plan.agent}: ${plan.installRoot} -> ${plan.runtimeRoot}`);
    } else {
      say(`- Removed legacy agent runtime mount for ${plan.agent}: ${plan.installRoot || "(none)"}`);
      say(`- Public skills for ${plan.agent} live under: ${path.join(options.home, ".agents", "skills")}`);
    }
    if (plan.slashAliases) {
      say(`- Installed Claude slash aliases: ${manifest.skills.map((skill) => `/${skill.alias}`).join(", ")}`);
    }
    say(`- Use in ${plan.agent}: ${invocationGuidanceForAgent(manifest, plan.agent)}`);
  }

  // ── Your First Run ──────────────────────────────────────────────────────────
  say("");
  say("─".repeat(60));
  say("  ✅  PrimeFlow installed");
  say("─".repeat(60));
  say("");

  const installedAgents = plans.map((p) => p.agent);
  const primaryAgent = installedAgents[0];

  if (primaryAgent === "claude") {
    say("  Next step:");
    say("    1. Restart Claude Code  (or reload the window)");
    say("    2. Paste one of these to start:");
    say("");
    say('  ┌─ Don\'t know where to start? ──────────────────────────┐');
    say('  │                                                         │');
    say('  │   /pf-help                                             │');
    say('  │                                                         │');
    say('  └─────────────────────────────────────────────────────────┘');
    say("");
    say('  ┌─ New task, start from scratch ────────────────────────┐');
    say('  │                                                         │');
    say('  │   /pf-orchestrate                                      │');
    say('  │                                                         │');
    say('  └─────────────────────────────────────────────────────────┘');
    say("");
    say('  ┌─ Have a bug? ──────────────────────────────────────────┐');
    say('  │                                                         │');
    say('  │   /pf-bug-triage                                       │');
    say('  │                                                         │');
    say('  └─────────────────────────────────────────────────────────┘');
    say("");
    say('  ┌─ Already have code, need to verify? ──────────────────┐');
    say('  │                                                         │');
    say('  │   /pf-verify                                           │');
    say('  │                                                         │');
    say('  └─────────────────────────────────────────────────────────┘');
  } else if (primaryAgent === "codex") {
    say("  Next step:");
    say("    1. Restart Codex  (so it rescans installed PrimeFlow skills)");
    say("    2. Paste one of these to start:");
    say("");
    say("  Don't know where to start:");
    say("    /pf-help");
    say("");
    say("  New task from scratch:");
    say("    /pf-orchestrate Determine which entry mode this task should use.");
    say("");
    say("  Have a bug:");
    say("    /pf-bug-triage Classify whether this issue is a spec gap or an implementation bug.");
  } else if (primaryAgent === "gemini") {
    say("  Next step:");
    say("    1. Restart Gemini  (so it rescans installed PrimeFlow skills)");
    say("    2. Paste one of these to start:");
    say("");
    say("  Don't know where to start:");
    say("    /pf-help");
    say("");
    say("  New task from scratch:");
    say("    /pf-orchestrate Determine which entry mode this task should use.");
  } else {
    say("  Restart your agent and invoke /pf-help.");
  }

  say("");
  say("  5-minute walkthrough → docs/quickstart.md");
  say("  Full skill reference  → docs/golden-paths.md");
  say("");
  say("─".repeat(60));
  say("");
}

function parseDistArgs(args) {
  const subcommand = args[0];
  if (subcommand !== "build") {
    fail(`Usage: ${cliName} dist build [--output <path>] [--force-clean]`);
  }

  const options = {
    forceClean: false,
    output: path.join(packageRoot, "dist", "release", "PrimeFlow")
  };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output") {
      const next = args[index + 1];
      if (!next) {
        fail(`Usage: ${cliName} dist build [--output <path>] [--force-clean]`);
      }
      options.output = path.resolve(next);
      index += 1;
      continue;
    }
    if (arg === "--force-clean") {
      options.forceClean = true;
      continue;
    }
    fail(`Unknown dist option: ${arg}`);
  }

  return options;
}

function distCommand(args) {
  const manifest = loadManifest();
  const packageMetadata = loadPackageMetadata();
  const { output, forceClean } = parseDistArgs(args);
  validateDistOutputPath(output, forceClean);
  fs.rmSync(output, { recursive: true, force: true });

  for (const relativePath of manifest.distribution.payload.include) {
    copyRecursive(path.join(packageRoot, relativePath), path.join(output, relativePath));
  }

  writeGeneratedCodexSkillDocs(
    manifest,
    generatedSkillsRootFor(output),
    "~/.primeflow/runtime/PrimeFlow"
  );

  const metadata = {
    product: manifest.product.name,
    package: packageMetadata.name,
    version: packageMetadata.version,
    source: packageRoot,
    built_at: new Date().toISOString(),
    mode: "release-install-stage"
  };
  fs.writeFileSync(path.join(output, "release.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  say("== PrimeFlow Dist Build ==");
  say(`Output: ${output}`);
  say(`Version: ${packageMetadata.version}`);
  say(`Payload entries: ${manifest.distribution.payload.include.length}`);
  say(`Generated Codex skills: ${manifest.skills.length}`);
  say("This staged payload can be installed with:");
  say(`  ${cliName} install --source ${output} --home ./.tmp-home --agent claude`);
}

function parseGenArgs(args) {
  const subcommand = args[0];
  if (subcommand !== "skill-docs") {
    fail(`Usage: ${cliName} gen skill-docs --agent codex [--output <path>] [--runtime-root <path>] [--force]`);
  }

  const options = {
    agent: null,
    output: generatedSkillsRootFor(packageRoot),
    runtimeRoot: "~/.primeflow/runtime/PrimeFlow",
    force: false
  };

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--agent" || arg === "--host") {
      const agent = args[index + 1];
      if (!agent) {
        fail(`Usage: ${cliName} gen skill-docs --agent codex [--output <path>] [--runtime-root <path>] [--force]`);
      }
      options.agent = agent;
      index += 1;
      continue;
    }
    if (arg === "--output") {
      const output = args[index + 1];
      if (!output) {
        fail(`Usage: ${cliName} gen skill-docs --agent codex [--output <path>] [--runtime-root <path>] [--force]`);
      }
      options.output = path.resolve(output);
      index += 1;
      continue;
    }
    if (arg === "--runtime-root") {
      const runtimeRoot = args[index + 1];
      if (!runtimeRoot) {
        fail(`Usage: ${cliName} gen skill-docs --agent codex [--output <path>] [--runtime-root <path>] [--force]`);
      }
      options.runtimeRoot = runtimeRoot;
      index += 1;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    fail(`Unknown gen option: ${arg}`);
  }

  if (options.agent !== "codex") {
    fail(`Unsupported gen agent target '${options.agent || ""}'. Currently supported: codex`);
  }

  return options;
}

function genCommand(args) {
  const options = parseGenArgs(args);
  const manifest = loadManifest();
  writeGeneratedCodexSkillDocs(
    manifest,
    options.output,
    options.runtimeRoot,
    options.force
  );
  say("Generated skill docs");
  say(`Agent target: ${options.agent}`);
  say(`Output: ${options.output}`);
  say(`Runtime root: ${options.runtimeRoot}`);
  say(`Skills: ${manifest.skills.length}`);
}

function readState() {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch (error) {
    fail(`Invalid state.json: ${error.message}`);
  }
}

function writeState(nextState) {
  ensureDir(primeflowRoot);
  const tmpPath = `${statePath}.tmp`;
  const fd = fs.openSync(tmpPath, "w");
  try {
    fs.writeFileSync(fd, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, statePath);
  fsyncPathIfPossible(primeflowRoot);
}

function getValue(object, dottedKey) {
  return dottedKey.split(".").reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    return current[key];
  }, object);
}

function setValue(object, dottedKey, value) {
  const keys = dottedKey.split(".");
  let current = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (typeof current[key] !== "object" || current[key] === null || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

function parseValue(raw, asJson) {
  if (asJson) {
    return JSON.parse(raw);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  return raw;
}

function detectPlatform() {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      return process.platform;
  }
}

function doctor(args = []) {
  ensureProjectRoot();
  const options = parseDoctorArgs(args);
  const platform = detectPlatform();
  const missingCore = [];
  const manifest = loadManifest();
  const detectedAgents = detectAgents(manifest, options.home);

  say("== PrimeFlow Doctor ==");
  say(`Platform: ${platform}`);
  say(`[ok] node ${process.version}`);

  if (hasCommand("git")) {
    say("[ok] git");
  } else {
    say("[missing] git");
    missingCore.push("git");
  }

  const playwright = detectPlaywright();
  if (playwright.ok) {
    say(`[ok] playwright (${playwright.source})`);
  } else {
    say("[optional] playwright not detected");
  }

  ensureDir(telemetryDir);
  ensureDir(handoffRoot);

  say("");
  if (missingCore.length === 0) {
    say("Core environment is ready.");
  } else {
    say(`Core environment is not ready. Missing: ${missingCore.join(", ")}`);
  }
  say(`Project root (${projectRootSource}): ${projectRoot}`);
  say(`State path: ${statePath}`);
  say(`Telemetry path: ${telemetryDir}`);
  say(`Handoff path: ${handoffRoot}`);
  say(`Shared runtime path: ${sharedRuntimeRootForHome(options.home)}`);
  say(`Agent home: ${options.home}`);

  if (detectedAgents.length === 0) {
    say("Detected agent targets: none");
  } else {
    say(`Detected agent targets: ${detectedAgents.join(", ")}`);
  }

  say("");
  say("Next steps:");
  if (missingCore.length > 0) {
    say("- Install the missing core tools, then rerun `./primeflow doctor`.");
    return;
  }

  if (detectedAgents.length === 1) {
    say(`- Run \`./primeflow install\` to install PrimeFlow into ${detectedAgents[0]}.`);
  } else if (detectedAgents.length > 1) {
    say(`- Multiple agent targets detected. Choose one explicitly with \`./primeflow install --agent <${detectedAgents.join("|")}>\`.`);
    say(`- Or install to several at once with \`./primeflow install --agents ${detectedAgents.join(",")}\`.`);
  } else {
    say(`- No supported agent target markers were found under ${options.home}.`);
    say("- Install with an explicit agent target, for example: `./primeflow install --agent claude`.");
  }

  say("- After install, start with `help` if you are unsure which PrimeFlow skill to use.");
}

function defaultState() {
  return {
    version: "1.0.0",
    current_stage: "init",
    last_skill: "orchestrate",
    entry_mode: "from-scratch",
    current_block: null,
    last_decision: "route-init",
    confidence: 0.5,
    escalate: false,
    risk_level: "medium",
    qa_required: null,
    artifacts: {},
    pending_tasks: [],
    blockers: [],
    skipped_skills: [],
    risks: [],
    session_id: "",
    exit_code: "ok",
    exit_reason: "",
    next_skill: "",
    rollback_target: null,
    rollback_method: null,
    created_at: new Date().toISOString(),
    verify_result: null,
    review_result: null,
    diagnose_result: null,
    diagnose_loops: 0,
    qa_result: null,
    ship_result: null,
    release_escalate: false,
    routing_count: 0,
    previous_stage: null,
    handoff_id: null,
    implement_scope_expansions: 0,
    verify_failure_count: 0,
    qa_fix_count: 0,
    qa_wtf_likelihood: 0.0,
    roundtable_low_info_answers: 0,
    writing_plan_revisions: 0,
    first_run_complete: false,
    telemetry_consent: null,
    proactive_consent: null
  };
}

function validateState(state) {
  const enumChecks = [
    ["entry_mode", state.entry_mode, ["from-scratch", "aligned-offline", "plan-ready", "build-ready", "release-ready", "incident"]],
    ["risk_level", state.risk_level, ["low", "medium", "high"]],
    ["qa_required", state.qa_required, [null, true, false]],
    ["exit_code", state.exit_code, ["ok", "deferred", "error", "escalate"]],
    ["verify_result", state.verify_result, [null, "pass", "fail_bug", "fail_spec"]],
    ["review_result", state.review_result, [null, "pass", "pass_with_risks", "blocked"]],
    ["diagnose_result", state.diagnose_result, [null, "found", "rollback", "unknown"]],
    ["qa_result", state.qa_result, [null, "pass", "partial", "fail"]],
    ["ship_result", state.ship_result, [null, "done", "canary_failed", "failed"]],
    ["rollback_method", state.rollback_method, [null, "git-tag", "git-commit", "release"]],
    ["telemetry_consent", state.telemetry_consent, [null, "community", "anonymous", "off"]]
  ];

  const errors = [];
  for (const [name, value, allowed] of enumChecks) {
    if (!allowed.includes(value)) {
      errors.push(`${name}: invalid value ${JSON.stringify(value)}`);
    }
  }

  const placeholders = [];
  const visit = (value) => {
    if (typeof value === "string") {
      if (/^\[[^\]]+\]$/.test(value)) {
        placeholders.push(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const nested of Object.values(value)) {
        visit(nested);
      }
    }
  };
  visit(state);
  if (placeholders.length > 0) {
    errors.push(`placeholder values detected: ${placeholders.join(", ")}`);
  }

  return errors;
}

function stateCommand(args) {
  ensureProjectRoot();
  const subcommand = args[0];
  if (subcommand === "init") {
    const current = readState();
    ensureDir(telemetryDir);
    ensureDir(handoffRoot);
    if (current) {
      say(statePath);
      return;
    }
    writeState(defaultState());
    say(statePath);
    return;
  }

  const state = readState();
  if (!state) {
    fail(`Missing ${statePath}. Run '${cliName} state init' first.`);
  }

  if (subcommand === "get") {
    const key = args[1];
    if (!key) fail(`Usage: ${cliName} state get <key>`);
    const value = getValue(state, key);
    say(JSON.stringify(value, null, 2));
    return;
  }

  if (subcommand === "set") {
    const key = args[1];
    const rawValue = args[2];
    const asJson = args.includes("--json");
    if (!key || rawValue === undefined) fail(`Usage: ${cliName} state set <key> <value> [--json]`);
    setValue(state, key, parseValue(rawValue, asJson));
    writeState(state);
    say(statePath);
    return;
  }

  if (subcommand === "validate") {
    const errors = validateState(state);
    if (errors.length === 0) {
      say("state.json is valid");
      return;
    }
    for (const error of errors) {
      say(`invalid: ${error}`);
    }
    process.exit(1);
  }

  fail(`Usage: ${cliName} state <init|get|set|validate> ...`);
}

function generateId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const rand = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${ts}-${rand}`;
}

function normalizeValue(value, fallback = "not recorded") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
}

function nextRoutingFromState(state) {
  const stage = state?.current_stage;
  if (!stage || stage === "init") {
    return "roundtable";
  }
  return stage;
}

function createHandoff(topic = "handoff") {
  ensureProjectRoot();
  const state = readState() || defaultState();
  const handoffId = generateId();
  const targetDir = path.join(handoffRoot, handoffId);
  ensureDir(targetDir);

  const handoffDoc = path.join(targetDir, "handoff.md");
  const snapshot = {
    timestamp: new Date().toISOString(),
    handoff_id: handoffId,
    current_stage: state.current_stage ?? "init",
    current_block: state.current_block ?? null,
    last_skill: state.last_skill ?? null,
    session_id: state.session_id ?? "",
    next_routing: nextRoutingFromState(state),
    recovery_point: nextRoutingFromState(state)
  };

  const completed = [];
  if (state.last_decision) completed.push(`- Latest decision: ${state.last_decision}`);
  if (state.artifacts?.plan_document) completed.push(`- Plan document exists: ${state.artifacts.plan_document}`);
  if (state.artifacts?.test_contract) completed.push(`- Test contract exists: ${state.artifacts.test_contract}`);
  if (state.artifacts?.review_report) completed.push(`- Review report exists: ${state.artifacts.review_report}`);

  const constraints = [];
  if (state.risk_level) constraints.push(`- Risk level: ${state.risk_level}`);
  if (Array.isArray(state.skipped_skills) && state.skipped_skills[0]) {
    constraints.push(`- Skipped skills: ${state.skipped_skills[0]}`);
  }

  const keyFiles = [];
  for (const key of ["plan_document", "test_contract", "review_report", "knowledge_doc"]) {
    if (state.artifacts?.[key]) {
      keyFiles.push(`- \`${state.artifacts[key]}:1\`: current handoff-related document`);
    }
  }

  const nextStepMap = {
    roundtable: "Resume at roundtable and continue converging the direction.",
    "writing-plan": "Resume at writing-plan and finish the current block scope and done criteria.",
    "test-first": "Resume at test-first and lock the behavior boundary for the current block.",
    implement: state.current_block
      ? `Resume at implement and continue the current block: ${state.current_block}.`
      : "Resume at implement and continue the current block.",
    verify: "Resume at verify and collect the fresh evidence for the current claim.",
    review: "Resume at review and perform the formal quality gate from verify evidence.",
    qa: "Resume at qa and continue real runtime validation.",
    ship: "Resume at ship and continue delivery or canary validation.",
    release: "Resume at release and complete honest closeout and risk disclosure.",
    knowledge: "Resume at knowledge and capture reusable learnings from this round.",
    diagnose: "Resume at diagnose and continue root-cause investigation."
  };

  const handoffMarkdown = `# Handoff: ${topic}

- Time: ${new Date().toISOString().slice(0, 16).replace("T", " ")}
- Handoff ID: ${handoffId}
- Session ID: ${state.session_id || "N/A"}

## Current Task
- ${normalizeValue(state.current_block, topic)}

## Current Status
- Current stage: ${normalizeValue(state.current_stage)}
- Last skill: ${normalizeValue(state.last_skill)}

## Completed Work
${completed.length > 0 ? completed.join("\n") : "- not recorded"}

## Key Decisions
- ${normalizeValue(state.last_decision)}

## Key Constraints
${constraints.length > 0 ? constraints.join("\n") : "- not recorded"}

## Key Files
${keyFiles.length > 0 ? keyFiles.join("\n") : "- not recorded"}

## Next Step
- ${nextStepMap[nextRoutingFromState(state)] || `Resume at ${nextRoutingFromState(state)} and continue the current work.`}

## Pending Confirmation
- ${Array.isArray(state.blockers) && state.blockers[0] ? state.blockers[0] : "none"}
`;

  fs.writeFileSync(handoffDoc, handoffMarkdown, "utf8");
  fs.writeFileSync(path.join(targetDir, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  state.handoff_id = handoffId;
  writeState(state);
  say(handoffDoc);
}

function listHandoffDirs(limit = 5) {
  if (!fs.existsSync(handoffRoot)) {
    return [];
  }
  return fs
    .readdirSync(handoffRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .slice(0, limit);
}

function handoffCommand(args) {
  ensureProjectRoot();
  const subcommand = args[0];
  if (subcommand === "create") {
    createHandoff(args[1] || "handoff");
    return;
  }

  if (subcommand === "latest") {
    const latest = listHandoffDirs(1)[0];
    if (!latest) fail("No handoff found");
    say(path.join(handoffRoot, latest, "handoff.md"));
    return;
  }

  if (subcommand === "resolve") {
    const id = args[1];
    if (!id) fail(`Usage: ${cliName} handoff resolve <id>`);
    const matches = listHandoffDirs(100).filter((entry) => entry === id || entry.startsWith(id));
    if (matches.length === 0) fail(`No handoff matches: ${id}`);
    say(path.join(handoffRoot, matches[0], "handoff.md"));
    return;
  }

  if (subcommand === "list") {
    const limit = Number.parseInt(args[1] || "5", 10);
    for (const entry of listHandoffDirs(limit)) {
      say(`${entry}  ${path.join(handoffRoot, entry, "handoff.md")}`);
    }
    return;
  }

  fail(`Usage: ${cliName} handoff <create|latest|resolve|list> ...`);
}

function pathsCommand() {
  ensureProjectRoot();
  say(`project: ${projectRoot}`);
  say(`state: ${statePath}`);
  say(`telemetry: ${telemetryDir}`);
  say(`handoff: ${handoffRoot}`);
  say(`shared_runtime: ${sharedRuntimeRootForHome(homeDir())}`);
}

function scaffoldCatalog() {
  return {
    plan: {
      source: "plan.md",
      defaultOutput: path.join(projectRoot, "docs", "primeflow", "plans", `${dateStamp()}-plan.md`)
    },
    "test-contract": {
      source: "test-contract.md",
      defaultOutput: path.join(projectRoot, "docs", "primeflow", "tests", `${dateStamp()}-test-contract.md`)
    },
    "review-report": {
      source: "review-report.md",
      defaultOutput: path.join(projectRoot, "docs", "primeflow", "reviews", `${dateStamp()}-review-report.md`)
    },
    "release-statement": {
      source: "release-statement.md",
      defaultOutput: path.join(projectRoot, "docs", "primeflow", "releases", `${dateStamp()}-release-statement.md`)
    },
    "incident-report": {
      source: "incident-report.md",
      defaultOutput: path.join(projectRoot, "docs", "primeflow", "incidents", `${dateStamp()}-incident-report.md`)
    }
  };
}

function dateStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function scaffoldCommand(args) {
  ensureProjectRoot();
  const catalog = scaffoldCatalog();
  const subcommand = args[0];

  if (!subcommand || subcommand === "list") {
    say("Available templates:");
    for (const [name, config] of Object.entries(catalog)) {
      say(`- ${name} -> ${config.defaultOutput}`);
    }
    return;
  }

  const config = catalog[subcommand];
  if (!config) {
    fail(`Unknown template '${subcommand}'. Run '${cliName} scaffold list'.`);
  }

  let outputPath = config.defaultOutput;
  let force = false;
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output") {
      const rawPath = args[index + 1];
      if (!rawPath) {
        fail(`Usage: ${cliName} scaffold <template> [--output <path>] [--force]`);
      }
      outputPath = resolveFromProjectRoot(rawPath);
      index += 1;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    fail(`Unknown scaffold option: ${arg}`);
  }

  const sourcePath = path.join(templateRootFor(), config.source);
  if (!fs.existsSync(sourcePath)) {
    fail(`Template source is missing: ${sourcePath}`);
  }

  if (fs.existsSync(outputPath) && !force) {
    fail(`Refusing to overwrite existing file: ${outputPath}\nUse --force to overwrite.`);
  }

  ensureDir(path.dirname(outputPath));
  fs.copyFileSync(sourcePath, outputPath);

  say("Scaffold complete");
  say(`Template: ${subcommand}`);
  say(`Output: ${outputPath}`);
}

const profilePath = path.join(primeflowRoot, "developer-profile.json");

function readProfile() {
  try {
    return JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch (_) {
    return null;
  }
}

function writeProfile(profile) {
  ensureDir(primeflowRoot);
  profile.updated_at = new Date().toISOString();
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2) + "\n");
  fsyncPathIfPossible(profilePath);
}

function defaultProfile() {
  return {
    version: "1.0.0",
    scope_appetite: "moderate",
    risk_tolerance: "medium",
    detail_preference: "standard",
    autonomy: "confirm-important",
    architecture_care: "medium",
    archetype_hint: null,
    declared: {},
    inferred: {},
    updated_at: null
  };
}

const solutionsRoot = path.join(projectRoot, "docs", "solutions");

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      let value = kv[2].trim();
      if (value.startsWith("[") && value.endsWith("]")) {
        try { value = JSON.parse(value.replace(/'/g, '"')); } catch (_) { /* keep as string */ }
      }
      fm[kv[1]] = value;
    }
  }
  return fm;
}

function findKnowledgeFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  try {
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findKnowledgeFiles(fullPath));
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch (_) { /* best effort */ }
  return results;
}

function knowledgeCommand(args) {
  const subcommand = args[0];

  if (subcommand === "list") {
    const files = findKnowledgeFiles(solutionsRoot);
    if (files.length === 0) {
      say("No knowledge artifacts found in docs/solutions/");
      return;
    }
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, "utf8");
        const fm = parseFrontmatter(content);
        const rel = path.relative(projectRoot, f);
        const name = fm.name || path.basename(f, ".md");
        const type = fm.type || "unknown";
        const category = fm.category || "unknown";
        const keywords = Array.isArray(fm.keywords) ? fm.keywords.join(", ") : (fm.keywords || "");
        say(`${type}\t${category}\t${name}\t${rel}`);
      } catch (_) {
        say(`unknown\tunknown\t${path.relative(projectRoot, f)}`);
      }
    }
    return;
  }

  if (subcommand === "search") {
    const queryWords = args.slice(1).map((w) => w.toLowerCase());
    if (queryWords.length === 0) {
      fail("Usage: primeflow knowledge search <keyword1> [keyword2] ...");
    }
    const files = findKnowledgeFiles(solutionsRoot);
    if (files.length === 0) {
      say("No knowledge artifacts found in docs/solutions/");
      return;
    }
    const scored = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, "utf8");
        const fm = parseFrontmatter(content);
        const rel = path.relative(projectRoot, f);
        let score = 0;

        // Score against frontmatter fields
        const fmText = [
          fm.name || "",
          fm.category || "",
          fm.module || "",
          fm.problem_type || "",
          ...(Array.isArray(fm.keywords) ? fm.keywords : [fm.keywords || ""])
        ].join(" ").toLowerCase();

        for (const qw of queryWords) {
          if (fmText.includes(qw)) score += 2;
        }

        // Score against body content (lightweight)
        const bodyText = content.toLowerCase();
        for (const qw of queryWords) {
          if (bodyText.includes(qw)) score += 1;
        }

        if (score > 0) {
          scored.push({ path: rel, name: fm.name || path.basename(f, ".md"), type: fm.type || "unknown", score });
        }
      } catch (_) { /* skip unreadable */ }
    }

    scored.sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      say("No matching knowledge artifacts found.");
      return;
    }
    for (const s of scored) {
      say(`${s.score}\t${s.type}\t${s.name}\t${s.path}`);
    }
    return;
  }

  if (subcommand === "check") {
    // Discoverability check: verify docs/solutions/ is referenced from entry files
    const referenceFiles = ["CLAUDE.md", "AGENTS.md", "README.md", "FRAMEWORK.md", "SYSTEM.md"].map((f) => path.join(projectRoot, f));
    let referenced = false;
    for (const rf of referenceFiles) {
      if (fs.existsSync(rf)) {
        const content = fs.readFileSync(rf, "utf8");
        if (content.includes("docs/solutions")) {
          referenced = true;
          say(`Referenced in: ${path.relative(projectRoot, rf)}`);
        }
      }
    }
    if (!referenced) {
      say("GAP: docs/solutions/ is not referenced in any entry file (CLAUDE.md, AGENTS.md, README.md, FRAMEWORK.md, SYSTEM.md)");
      say("Knowledge artifacts may not be found by future sessions.");
      say("Add a line like: 'Known solutions: docs/solutions/' to one of the entry files above.");
    }

    // Count artifacts
    const files = findKnowledgeFiles(solutionsRoot);
    say(`Knowledge artifacts: ${files.length}`);

    // Check frontmatter completeness
    let incomplete = 0;
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, "utf8");
        const fm = parseFrontmatter(content);
        if (!fm.name || !fm.type || !fm.keywords) {
          incomplete += 1;
          say(`Incomplete frontmatter: ${path.relative(projectRoot, f)} (missing: ${[!fm.name && "name", !fm.type && "type", !fm.keywords && "keywords"].filter(Boolean).join(", ")})`);
        }
      } catch (_) { /* skip */ }
    }
    if (incomplete === 0 && files.length > 0) {
      say("All knowledge artifacts have complete frontmatter.");
    }
    return;
  }

  fail(`Usage: ${cliName} knowledge <search|list|check> [keywords...]`);
}

function profileCommand(args) {
  const subcommand = args[0];

  if (subcommand === "init") {
    const current = readProfile();
    if (current) {
      say(profilePath);
      return;
    }
    writeProfile(defaultProfile());
    say(profilePath);
    return;
  }

  const profile = readProfile();
  if (!profile) {
    fail(`Missing ${profilePath}. Run '${cliName} profile init' first.`);
  }

  if (subcommand === "get") {
    const key = args[1];
    if (!key) {
      say(JSON.stringify(profile, null, 2));
      return;
    }
    say(JSON.stringify(getValue(profile, key), null, 2));
    return;
  }

  if (subcommand === "set") {
    const key = args[1];
    const rawValue = args[2];
    const asJson = args.includes("--json");
    const inferred = args.includes("--inferred");
    if (!key || rawValue === undefined) fail(`Usage: ${cliName} profile set <key> <value> [--inferred] [--json]`);

    const parsedValue = parseValue(rawValue, asJson);

    // User-origin gating: --inferred writes to inferred, otherwise to declared
    if (inferred) {
      const inferredKey = `inferred.${key}`;
      // Track observation count
      const existing = getValue(profile, inferredKey);
      if (existing && typeof existing === "object" && existing.observations !== undefined) {
        setValue(profile, inferredKey, { value: parsedValue, observations: existing.observations + 1 });
      } else {
        setValue(profile, inferredKey, { value: parsedValue, observations: 1 });
      }
      // Also update the top-level field to reflect the latest inferred value
      setValue(profile, key, parsedValue);
    } else {
      setValue(profile, `declared.${key}`, parsedValue);
      // declared always wins over inferred for the top-level field
      setValue(profile, key, parsedValue);
    }

    writeProfile(profile);
    say(profilePath);
    return;
  }

  if (subcommand === "show") {
    // Show effective profile: declared overrides inferred
    const effective = { ...profile };
    for (const [key, value] of Object.entries(profile.declared)) {
      if (value !== null) effective[key] = value;
    }
    say(JSON.stringify(effective, null, 2));
    return;
  }

  fail(`Usage: ${cliName} profile <init|get|set|show> [key] [value] [--inferred] [--json]`);
}

function detectCiCommand() {
  ensureProjectRoot();

  const result = {
    type: "unknown",
    test_cmd: null,
    coverage_cmd: null,
    deploy_cmd: null,
    target_branch: null
  };

  // GitHub Actions
  const ghWorkflows = path.join(projectRoot, ".github", "workflows");
  if (fs.existsSync(ghWorkflows)) {
    result.type = "github-actions";
    try {
      const workflowFiles = fs.readdirSync(ghWorkflows).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
      for (const wf of workflowFiles) {
        const content = fs.readFileSync(path.join(ghWorkflows, wf), "utf8");
        const npmTestMatch = content.match(/npm test|npm run test|npm run test:[a-z]+/);
        if (npmTestMatch && !result.test_cmd) result.test_cmd = npmTestMatch[0];
        const covMatch = content.match(/npm run coverage|npm run test:coverage|--coverage/);
        if (covMatch && !result.coverage_cmd) result.coverage_cmd = covMatch[0];
        const deployMatch = content.match(/deploy|npm run deploy|npm run release/);
        if (deployMatch && !result.deploy_cmd) result.deploy_cmd = deployMatch[0];
      }
    } catch (_) { /* best effort */ }
    try {
      const headPath = path.join(projectRoot, ".git", "refs", "remotes", "origin", "HEAD");
      if (fs.existsSync(headPath)) {
        const head = fs.readFileSync(headPath, "utf8").trim();
        const branchRef = head.replace("ref: refs/remotes/origin/", "");
        if (branchRef && !branchRef.startsWith("ref:")) result.target_branch = branchRef;
      }
    } catch (_) { /* ignore */ }
    if (!result.target_branch) result.target_branch = "main";
  }

  // Jenkins
  const jenkinsfile = path.join(projectRoot, "Jenkinsfile");
  if (fs.existsSync(jenkinsfile) && result.type === "unknown") {
    result.type = "jenkins";
    try {
      const content = fs.readFileSync(jenkinsfile, "utf8");
      const shMatch = content.match(/sh\s+['"]([^'"]*(?:test|spec)[^'"]*)['"]/);
      if (shMatch) result.test_cmd = shMatch[1];
    } catch (_) { /* best effort */ }
  }

  // Make
  const makefile = path.join(projectRoot, "Makefile");
  if (fs.existsSync(makefile) && result.type === "unknown") {
    result.type = "make";
    try {
      const content = fs.readFileSync(makefile, "utf8");
      if (/(?:^|\n)test:/m.test(content)) result.test_cmd = "make test";
      if (/(?:^|\n)coverage:/m.test(content)) result.coverage_cmd = "make coverage";
      if (/(?:^|\n)deploy:/m.test(content)) result.deploy_cmd = "make deploy";
    } catch (_) { /* best effort */ }
  }

  // Node (package.json)
  const pkgJson = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgJson) && (result.type === "unknown" || result.type === "github-actions")) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
      const scripts = pkg.scripts || {};
      if (result.type === "unknown" && (scripts.test || scripts["test:ci"])) {
        result.type = "node";
      }
      if (!result.test_cmd && scripts["test:ci"]) result.test_cmd = "npm run test:ci";
      if (!result.test_cmd && scripts.test && scripts.test !== "echo \\\"Error: no test specified\\\" && exit 1") {
        result.test_cmd = "npm test";
      }
      if (!result.coverage_cmd && scripts.coverage) result.coverage_cmd = "npm run coverage";
      if (!result.deploy_cmd && scripts.deploy) result.deploy_cmd = "npm run deploy";
      if (!result.target_branch) result.target_branch = "main";
    } catch (_) { /* best effort */ }
  }

  // Python
  const pyprojectToml = path.join(projectRoot, "pyproject.toml");
  const setupPy = path.join(projectRoot, "setup.py");
  if ((fs.existsSync(pyprojectToml) || fs.existsSync(setupPy)) && result.type === "unknown") {
    result.type = "python";
    result.test_cmd = "pytest";
    result.coverage_cmd = "pytest --cov";
  }

  say(JSON.stringify(result, null, 2));
}

switch (command) {
  case "doctor":
    doctor(argv.slice(1));
    break;
  case "state":
    stateCommand(argv.slice(1));
    break;
  case "handoff":
    handoffCommand(argv.slice(1));
    break;
  case "paths":
    pathsCommand();
    break;
  case "scaffold":
    scaffoldCommand(argv.slice(1));
    break;
  case "install":
    installCommand(argv.slice(1));
    break;
  case "dist":
    distCommand(argv.slice(1));
    break;
  case "gen":
    genCommand(argv.slice(1));
    break;
  case "detect-ci":
    detectCiCommand();
    break;
  case "profile":
    profileCommand(argv.slice(1));
    break;
  case "knowledge":
    knowledgeCommand(argv.slice(1));
    break;
  default:
    say("Usage:");
    say(`  ${cliName} [--project-root <path>] doctor [--home <path>]`);
    say(`  ${cliName} [--project-root <path>] install [--dry-run] [--home <path>] [--source <path>] (--agent <claude|codex|gemini> | --agents <claude,codex,gemini>)`);
    say(`  ${cliName} [--project-root <path>] dist build [--output <path>] [--force-clean]`);
    say(`  ${cliName} [--project-root <path>] gen skill-docs --agent codex [--output <path>] [--runtime-root <path>] [--force]`);
    say(`  ${cliName} [--project-root <path>] state <init|get|set|validate> ...`);
    say(`  ${cliName} [--project-root <path>] handoff <create|latest|resolve|list> ...`);
    say(`  ${cliName} [--project-root <path>] scaffold <template|list> [--output <path>] [--force]`);
    say(`  ${cliName} [--project-root <path>] detect-ci`);
    say(`  ${cliName} [--project-root <path>] profile <get|set|show> [key] [value]`);
    say(`  ${cliName} [--project-root <path>] knowledge <search|list|check> [keywords...]`);
    say(`  ${cliName} [--project-root <path>] paths`);
    process.exit(command ? 1 : 0);
}
