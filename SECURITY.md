# Security Policy

If you discover a security issue in Keystone, please report it privately before opening a public issue.

## How to Report

Use private disclosure first. Include:

- a clear description of the issue
- the affected files, commands, or runtime paths
- reproduction steps or proof of impact
- any suggested mitigation if you already have one

If a dedicated private reporting address is not yet published, contact the maintainer directly through the repository owner channel rather than creating a public issue.

## What to Avoid

- do not publish exploit details before maintainers have a chance to assess the issue
- do not include secrets, tokens, or sensitive user data in public issues or PRs
- do not assume a workflow bug is harmless if it affects installation, routing, command execution, or state handling

## Scope

Security-relevant reports may include:

- installation script behavior
- runtime path handling
- command execution surfaces
- secret or credential disclosure
- privilege, path, or sandbox escape behavior

Routine correctness bugs that do not create a security risk should go through the normal issue tracker.
