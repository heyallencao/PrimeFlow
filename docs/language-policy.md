# PrimeFlow Language Policy

This document defines how PrimeFlow handles language across docs, runtime skills, and mirrored content.

## Canonical Rule

English is the canonical language for PrimeFlow.

That applies to:

- the repository README
- primary onboarding docs
- runtime `SKILL.md` files
- machine-adjacent prompts, contracts, and workflow instructions

## Chinese Content

Chinese may exist, but only as an optional mirror for human-facing docs.

That means:

- a Chinese translation can exist for README-like content
- a Chinese explainer can exist for maintainers or community onboarding
- Chinese should not be embedded into canonical runtime skills

## Runtime Skills

Runtime skills must remain single-language English.

Reasons:

- bilingual prompts increase token cost
- mixed-language prompts create routing ambiguity
- English-first runtime assets are easier to maintain across Claude, Codex, and Gemini

If a Chinese explanation is valuable, place it in a separate mirror doc rather than inside the canonical `SKILL.md`.

## Translation Policy

When translating an existing canonical surface:

1. preserve decision labels, state keys, and telemetry schema
2. preserve exit semantics and routing meaning
3. translate headings, prose, examples, and inline comments into English
4. avoid changing behavior under the cover of translation

## Mirror Scope

PrimeFlow does not promise a full Chinese mirror for every file.

Priority order:

1. canonical English surfaces stay current
2. high-value human docs may get Chinese mirrors
3. internal drafts and historical notes may remain untranslated

## Maintainer Rule

When adding a new canonical doc or runtime skill:

- write the English source first
- add a mirror only if it has a real maintenance owner
- do not make runtime prompts bilingual
