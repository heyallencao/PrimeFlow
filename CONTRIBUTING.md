# Contributing to Keystone

Keystone is an agent workflow project. Contributions are welcome, but the bar is explicit: changes should improve routing clarity, evidence quality, or the honesty of the workflow rather than just adding more prompts.

## How to Contribute

The most useful contributions usually fall into one of these categories:

- improve a workflow skill or its runtime contract
- improve onboarding, installation, or documentation
- fix workflow bugs, packaging issues, or state-handling problems
- add templates, verification coverage, or maintainer tooling

For large changes, open an issue first so the direction and scope can converge before implementation begins.

## Before You Start

- read [README.md](./README.md)
- read [docs/language-policy.md](./docs/language-policy.md)
- check whether an existing issue or discussion already covers the work
- keep the current block narrow; avoid mixing unrelated refactors into the same change

## Workflow Expectations

Keystone is built around a few stable ideas:

- canonical docs and runtime skills are English-first
- runtime `SKILL.md` files should stay single-language English
- behavior claims should be backed by fresh evidence
- scope should be explicit and closeable

If your change touches workflow semantics, keep existing decision labels, state keys, and telemetry structure stable unless the change explicitly intends to evolve the contract.

## Development

Install dependencies and validate the local environment:

```bash
./keystone doctor
```

Useful local checks:

```bash
npm run test:english-foundation
npm run smoke
```

If your change adds or updates docs, runtime skills, or OSS collaboration surfaces, update the corresponding checks when appropriate.

## Verification

Every pull request should describe:

- what changed
- why it changed
- how it was verified
- what remains intentionally out of scope

If you changed workflow behavior, include enough evidence for a reviewer to understand why the new route or contract is correct.

## Pull Request Guidelines

- keep PRs focused
- explain the current block, not just the diff
- link the issue or context when available
- call out any risk, follow-up work, or unresolved questions

Use the repository PR template when opening the PR.
