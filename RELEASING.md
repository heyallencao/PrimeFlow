# Releasing Keystone

This document is for Keystone maintainers.

Keystone is currently released as a **staged payload**, not as a public npm package. The supported release model is:

1. build the `release-install-stage` payload
2. validate it
3. publish or share the staged artifact through your chosen maintainer channel
4. disclose the release status and skipped validation honestly

For the distribution boundary, read [docs/distribution-model.md](docs/distribution-model.md). For general maintainer workflows, read [docs/maintainer.md](docs/maintainer.md).

## Current Release Model

Keystone does **not** currently support:

- npm public publishing
- marketplace publishing
- host marketplace integrations

Keystone **does** support:

- repository install: `./keystone install`
- staged payload install: `./keystone install --source <payload> --agent <target>`

## Preferred Path: GitHub Actions

The preferred maintainer path is `.github/workflows/release-stage.yml`.

It:

- runs `npm run test:generated-skill-docs`
- runs `npm run test:english-foundation`
- runs `npm run smoke`
- runs `npm run build:release-stage`
- uploads the staged payload directory, archive, and checksum as workflow artifacts

Use this path when you want a reproducible staged payload build without relying only on a local machine.

## Local Fallback Path

If you need to build the same staged payload locally:

```bash
npm run test:generated-skill-docs
npm run test:english-foundation
npm run smoke
npm run build:release-stage
```

The output will be written to:

```text
dist/release/Keystone
```

## Validate The Staged Payload

Before sharing or promoting the artifact, validate the staged payload against a sandbox home:

```bash
./keystone install --source ./dist/release/Keystone --home ./.tmp-home --agent claude
./keystone install --source ./dist/release/Keystone --home ./.tmp-home --agent codex
./keystone install --source ./dist/release/Keystone --home ./.tmp-home --agent gemini
```

This confirms that the built payload is still installable as a real Keystone runtime bundle.

## Manual Host Checks

Automation is not enough for public release closeout. Before calling a staged build releasable, run at least one real public entry on the current Claude, Codex, and Gemini versions:

- `/ks-help`
- or `/ks-orchestrate`

The goal is to confirm that the host still discovers the installed public `ks-*` skills correctly.

## Write The Release Statement

Keystone already includes a release-statement scaffold:

```bash
./keystone scaffold release-statement
```

Use it to record:

- what artifact was built
- what validation actually ran
- what validation was skipped
- which risks remain
- whether the release should be treated as full, gradual, paused, or rollback-worthy

## Release Checklist

- the generated `.agents` wrappers match source
- the English-first gate passes
- the smoke test passes
- the staged payload builds successfully
- staged install works in a sandbox home
- real `/ks-help` or `/ks-orchestrate` checks were run on current Claude, Codex, and Gemini versions
- a release statement exists
- any skipped validation is disclosed explicitly

## What This Document Does Not Authorize

This document does not authorize:

- changing `package.json` from `private` to publishable
- publishing Keystone to npm
- redefining the supported distribution model

Those are product/distribution decisions and should be made explicitly, not smuggled in through release operations.
