# PrimeFlow Maintainer Guide

This document is for repository maintainers, not first-time PrimeFlow users.

If you only want to install PrimeFlow into your own host environment and start using it, read [README.md](../README.md) and [installation.md](./installation.md) first.

If you want the end-to-end staged release playbook, read [RELEASING.md](../RELEASING.md).

## In-Repo Validation Path

If you want to validate the PrimeFlow product inside this repository, use this path:

```bash
npm run test:generated-skill-docs
npm run smoke
./primeflow install --home ./.tmp-home --agent claude
./primeflow dist build --output ./dist/release/PrimeFlow
./primeflow install --source ./dist/release/PrimeFlow --home ./.tmp-home --agent codex
```

This path exists to:

- verify that committed `.agents` wrappers still match generated output from source skills
- verify that CLI and install logic did not regress
- verify that the staged release payload installs correctly
- test inside a sandbox without polluting real host environments

## Automated Staged Build

PrimeFlow now includes `.github/workflows/release-stage.yml`.

Use it when you want the repository to build the same `release-install-stage` payload in GitHub Actions instead of only on your local machine.

What it does:

- runs `npm run test:generated-skill-docs`
- runs `npm run test:english-foundation`
- runs `npm run smoke`
- runs `npm run build:release-stage`
- uploads the staged payload directory plus a `.tar.gz` archive and `.sha256` checksum as workflow artifacts

What it does not do:

- publish to npm
- publish to a marketplace
- change the supported installation model

The uploaded artifact is still meant for:

```bash
./primeflow install --source ./dist/release/PrimeFlow --agent codex
```

in other words, it is the same staged payload model, just built in CI.

## `smoke`

```bash
npm run smoke
```

The smoke test currently covers:

- `doctor`
- `state init`
- `handoff create`
- `install --dry-run`
- missing-host failure messaging
- single-host auto-detection install
- multi-host ambiguity messaging
- `dist build`
- `install --source`

Smoke does not prove that the current host versions will surface `/pf-*` correctly. Before public release, still run a real manual check in the current Claude, Codex, and Gemini versions.

## Sandbox Install

To avoid writing into real host directories, use:

```bash
./primeflow install --home ./.tmp-home --agent claude
```

That redirects installation into sandbox paths such as:

- `./.tmp-home/.claude/skills/PrimeFlow`
- `./.tmp-home/.primeflow/runtime/PrimeFlow`
- `./.tmp-home/.agents/skills/pf-help`

## Staged Payload Validation

Build the staged payload:

```bash
./primeflow dist build --output ./dist/release/PrimeFlow
```

Install from it:

```bash
./primeflow install --source ./dist/release/PrimeFlow --home ./.tmp-home --agent codex
```

This validates:

- `dist build` copies the payload described by the manifest
- `release.json` is written correctly
- `install --source` can perform a full staged install

## When To Read This

Use this document when:

- changing CLI install logic
- changing the distribution model
- maintaining the smoke test
- validating the release-install-stage path
