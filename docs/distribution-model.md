# PrimeFlow Distribution Model

## V2 Frozen Conclusion

In V2, PrimeFlow should be treated as an installable skill product rather than a repo that users must manually study and assemble.

The frozen public model is:

1. users install PrimeFlow directly; if exactly one supported host is detected, PrimeFlow selects it automatically
2. PrimeFlow installs the full runtime bundle into the shared runtime location and flattens the public `pf-*` skills into `.agents/skills/`
3. only Claude mounts the support-bundle entry layer; Codex and Gemini consume the public `pf-*` skills directly
4. users invoke PrimeFlow through their host-native `/pf-*` entry shape

Default shared runtime:

- `~/.primeflow/runtime/PrimeFlow`

Default host targets:

- Claude: `~/.claude/skills/PrimeFlow`
- Codex: `~/.agents/skills/pf-*`
- Gemini: `~/.agents/skills/pf-*`

Claude command files are installed into:

- `~/.claude/commands`

## Single Source Of Truth

The single source of truth for distribution is `primeflow.manifest.json`.

It defines:

- product identity and summary
- the default install model and default entry skills
- supported hosts and their target locations
- install payload
- the full skill bundle list
- Claude `/pf-*` aliases
- host-facing invocation guidance

These outputs must converge from the manifest:

- `./primeflow install`
- `./primeflow dist build`
- Claude command files
- README and installation docs

## Installation Unit

PrimeFlow installs as a full bundle, not as loose fragment skills.

The V2 bundle includes the public PrimeFlow skill set, and installs both:

- the shared runtime bundle
- the flattened public `pf-*` skills

## Host Invocation Contract

PrimeFlow standardizes:

- skill identity
- public naming
- `/pf-*` entry shape

Default starting point:

- `orchestrate`

Host usage:

- Claude: `/pf-help`, `/pf-orchestrate`, `/pf-review`, `/pf-verify`, and other `/pf-*`
- Codex: after restart, `/pf-help`, `/pf-orchestrate`, and other `/pf-*`
- Gemini: after restart, `/pf-help`, `/pf-orchestrate`, and other `/pf-*`

The public entry shape is shared. Menu rendering and completion still depend on host capability.

## Frozen Install Paths

The current model freezes two install paths with different maturity:

### 1. `repo-install`

```bash
./primeflow install
```

This is the default repository entry point. `--agent` may still override auto-detection.

### 2. `release-install-stage`

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --agent codex
```

This validates staged-payload installation, but it is not yet an npm or marketplace release path.

The repository may automate this same staged build in CI, but the artifact semantics stay the same: the output is still a staged payload for `install --source`, not an npm release and not a marketplace package.

Explicitly out of scope for this V2 freeze:

- npm public publishing
- marketplace distribution
- host marketplace integrations
- general release-archive distribution

Repository visibility and package visibility are separate decisions. PrimeFlow can be open source while `package.json` remains `private`. In the current model, that `private` flag is intentional: it prevents accidental npm publication while the supported release paths are still `repo-install` and `release-install-stage` rather than `npm publish`.

## Behavioral Requirements

Under V2, CLI and docs must both satisfy:

- `install` auto-detects a single supported host by default
- no detected host -> prompt for explicit `--agent`
- multiple detected hosts -> require an explicit choice
- install locations match the manifest
- install contents match the manifest bundle
- Claude gets `/pf-*` command files; Codex and Gemini get public `pf-*` skill directories
- `dist build` clearly marks the output as a staged payload
- `install --source` clearly consumes a staged payload instead of blurring repo-install and staged-install into one concept
- before public release, run at least one real `/pf-help` check in the current Claude, Codex, and Gemini versions
