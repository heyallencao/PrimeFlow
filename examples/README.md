# PrimeFlow Examples

These examples have one goal:

> give you copyable PrimeFlow prompts instead of only describing the rules.

Default assumptions:

- you already ran `./primeflow install`
- you are back inside your host agent
- the next step is to call the installed PrimeFlow skills directly

Each example covers the same high-frequency situations:

- you do not know where to start
- the background is messy and should be compressed into a brief
- something broke and needs bug triage
- the code is done and closeout should begin
- the main workflow needs formal routing

## Host Guides

- [claude.md](./claude.md) - PrimeFlow on Claude
- [codex.md](./codex.md) - PrimeFlow on Codex
- [gemini.md](./gemini.md) - PrimeFlow on Gemini

## Usage Notes

Pick your host, then copy and paste the first sentence that matches your situation.

If you are implementing host support instead of using PrimeFlow normally:

- start with `primeflow.manifest.json`
- use `docs/decision-matrix.md` for routing semantics
- use the relevant `SKILL.md` file for skill boundaries
