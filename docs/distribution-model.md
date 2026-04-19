# Keystone Distribution Model

## V2 Frozen Conclusion

In V2, Keystone should be treated as an installable skill product rather than a repo that users must manually study and assemble.

The frozen public model is:

1. users install Keystone directly; if exactly one supported host is detected, Keystone selects it automatically
2. Keystone installs the full runtime bundle into the shared runtime location and flattens the public `ks-*` skills into `.agents/skills/`
3. only Claude mounts the support-bundle entry layer; Codex and Gemini consume the public `ks-*` skills directly
4. users invoke Keystone through their host-native `/ks-*` entry shape

Default shared runtime:

- `~/.keystone/runtime/Keystone`

Default host targets:

- Claude: `~/.claude/skills/Keystone`
- Codex: `~/.agents/skills/ks-*`
- Gemini: `~/.agents/skills/ks-*`

Claude command files are installed into:

- `~/.claude/commands`

## Single Source Of Truth

The single source of truth for distribution is `keystone.manifest.json`.

It defines:

- product identity and summary
- the default install model and default entry skills
- supported hosts and their target locations
- install payload
- the full skill bundle list
- Claude `/ks-*` aliases
- host-facing invocation guidance

These outputs must converge from the manifest:

- `./keystone install`
- `./keystone dist build`
- Claude command files
- README and installation docs

## Installation Unit

Keystone installs as a full bundle, not as loose fragment skills.

The V2 bundle includes the public Keystone skill set, and installs both:

- the shared runtime bundle
- the flattened public `ks-*` skills

## Host Invocation Contract

Keystone standardizes:

- skill identity
- public naming
- `/ks-*` entry shape

Default starting point:

- `orchestrate`

Host usage:

- Claude: `/ks-help`, `/ks-orchestrate`, `/ks-review`, `/ks-verify`, and other `/ks-*`
- Codex: after restart, `/ks-help`, `/ks-orchestrate`, and other `/ks-*`
- Gemini: after restart, `/ks-help`, `/ks-orchestrate`, and other `/ks-*`

The public entry shape is shared. Menu rendering and completion still depend on host capability.

## Frozen Install Paths

The current model freezes two install paths with different maturity:

### 1. `repo-install`

```bash
./keystone install
```

This is the default repository entry point. `--agent` may still override auto-detection.

### 2. `release-install-stage`

```bash
./keystone dist build --output ./dist/release/Keystone
./keystone install --source ./dist/release/Keystone --agent codex
```

This validates staged-payload installation, but it is not yet an npm or marketplace release path.

The repository may automate this same staged build in CI, but the artifact semantics stay the same: the output is still a staged payload for `install --source`, not an npm release and not a marketplace package.

Explicitly out of scope for this V2 freeze:

- npm public publishing
- marketplace distribution
- host marketplace integrations
- general release-archive distribution

Repository visibility and package visibility are separate decisions. Keystone can be open source while `package.json` remains `private`. In the current model, that `private` flag is intentional: it prevents accidental npm publication while the supported release paths are still `repo-install` and `release-install-stage` rather than `npm publish`.

## Behavioral Requirements

Under V2, CLI and docs must both satisfy:

- `install` auto-detects a single supported host by default
- no detected host -> prompt for explicit `--agent`
- multiple detected hosts -> require an explicit choice
- install locations match the manifest
- install contents match the manifest bundle
- Claude gets `/ks-*` command files; Codex and Gemini get public `ks-*` skill directories
- `dist build` clearly marks the output as a staged payload
- `install --source` clearly consumes a staged payload instead of blurring repo-install and staged-install into one concept
- before public release, run at least one real `/ks-help` check in the current Claude, Codex, and Gemini versions
