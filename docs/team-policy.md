# PrimeFlow Team Policy

This document explains how a team-level policy layer can sit on top of PrimeFlow without rewriting the core workflow contract.

## Design Goal

The team policy layer exists to let teams standardize a few high-value operational rules while keeping the core PrimeFlow skills stable.

It should help teams answer questions such as:

- when QA is required by default
- how strict the review gate should be
- what release disclosures are mandatory
- whether handoff packages need extra required slots

## State Boundary

Team policy may influence routing defaults or required disclosures, but it should not redefine core skill identity or erase PrimeFlow's explicit exit semantics.

## What Policy May Override

### 1. QA default policy

A team may decide:

- when `qa_required` defaults to `true`
- which categories of work may skip QA
- what counts as acceptable degraded QA

### 2. Review gate

A team may tighten:

- severity thresholds that block merge
- which surfaces always trigger extra review
- whether specific findings require explicit human confirmation

### 3. Release disclosure requirements

A team may require additional disclosure for:

- partial QA
- risk acceptance
- mitigations and rollback notes

### 4. Handoff extensions

A team may require extra handoff slots beyond the default 8 if their workflow depends on them.

## What Policy Must Not Override

Policy must not:

- rename public skills
- rewrite the core Decision Contract fields
- change which skill owns which responsibility
- turn sidecar skills into routing authorities
- silently erase honest disclosure requirements

## Minimal File Shape

A team policy file should stay small and explicit:

```yaml
qa:
  default_required_for:
    - browser-path
    - critical-integration

review:
  always_block_on:
    - P0
    - P1

release:
  require_disclosure_for:
    - qa-partial
    - pass-with-risks

handoff:
  extra_required_slots:
    - rollout-status
```

## Recommended Interpretation

When a policy exists:

- treat it as a constrained overlay on top of PrimeFlow
- keep the skill contract stable
- favor explicit disclosure over silent auto-relaxation

## Team Adoption Notes

Teams usually get the most value by starting small:

1. QA defaults
2. review gate
3. release disclosure
4. optional handoff extensions

Do not begin with a giant policy file that tries to encode every edge case on day one.

## Relationship To The Manifest

- the manifest describes the product surface and host-facing metadata
- team policy describes team-specific operating rules on top of that surface

Those layers should not replace one another.

## Maintenance Principles

- keep the policy explicit
- keep the policy small
- version policy changes when they affect team expectations
- update docs when policy meaning changes

## First-Round Done Criteria

The first useful team policy layer is complete when:

- teams can express QA defaults
- teams can express review strictness
- teams can express release disclosure requirements
- the overlay does not distort the core PrimeFlow workflow
