# PrimeFlow Decision Matrix

This document compresses the common exit semantics of PrimeFlow skills into one shared table.

It answers:

- what the stable `decision` label should be at exit
- where `next_skill` should usually point
- where the workflow should route if the result does not hold

It does not replace each skill's `SKILL.md`, but it gives host implementations a shared baseline.

## How To Use It

When implementing PrimeFlow for Claude, Codex, or Gemini:

- presentation may differ
- prompt framing may differ
- entry shape may differ

But these should not drift:

- `decision`
- `next_skill`
- `fallback`

## Direct-Entry Skills

| Skill | Stable decision | Normal next_skill | Fallback |
|---|---|---|---|
| `help` | `help-guided` | `orchestrate` or the best matching existing skill | fall back to `orchestrate` when uncertain |
| `brief` | `brief-defined` | `roundtable` or `writing-plan` | if the topic is still unclear, return to `roundtable` |
| `bug-triage` | `triage-complete` | `writing-plan` / `diagnose` / `ship` | rerun triage if later evidence changes the classification |
| `pr-prep` | `pr-context-ready` | `ship` or `release` | regenerate if review or verify conclusions change |
| `docs-writer` | `docs-draft-ready` | `release` / `knowledge` / `DONE` | return to verify/review/release when facts are incomplete |

## Mainline Skills

| Skill | Stable decision | Normal next_skill | Fallback |
|---|---|---|---|
| `orchestrate` | `route-*` | routed skill | escalate on routing loops or low-confidence routing |
| `roundtable` | `roundtable-aligned` | `writing-plan` | defer or escalate when direction does not converge |
| `writing-plan` | `block-defined` | `test-first`; `implement` only for controlled low-risk exceptions | reopen planning when scope drifts |
| `test-first` | `test-contract-ready` | `implement` | return to planning when behavior boundaries are unclear |
| `implement` | `implement-complete` | `verify` | return to planning or test-first when scope or risk assumptions break |
| `verify` | `verify-pass` / `verify-fail-bug` / `verify-fail-spec` | `review` / `diagnose` / `writing-plan` | stay evidence-only; do not impersonate review |
| `review` | `review-pass` / `review-pass-with-risks` / `review-blocked` | `qa` / `ship` / `implement` | unresolved P0/P1 findings block progress |
| `qa` | `qa-pass` / `qa-partial` / `qa-fail` | `ship` / `diagnose` | incomplete coverage must stay marked as partial |
| `ship` | `ship-advisory` / `ship-done` / `ship-failed` | `release` / `diagnose` | stay advisory when project adaptation is missing |
| `release` | `release-full` / `release-gradual` / `release-paused` / `release-rollback` | `knowledge` / `ship` / `DONE` | pause or rollback when risk exceeds the allowed threshold |
| `knowledge` | `knowledge-skip` / `knowledge-update` / `knowledge-create` | `DONE` | update instead of duplicating when overlap is high |

## Key Invariants

### 1. `help` does not own formal routing

- `help` may recommend an entry
- formal routing still belongs to `orchestrate` or the current stage skill

### 2. `brief` only compresses input

- `brief` reduces startup friction
- it does not quietly replace `roundtable`

### 3. `bug-triage` classifies but does not diagnose

- `triage-complete` does not mean the root cause is known
- root-cause work still belongs to `diagnose`

### 4. `pr-prep` and `docs-writer` are sidecars

- they help package and close work
- they do not replace `review`, `release`, or `knowledge`

## Cross-Host Implementation Advice

At minimum, keep these aligned:

1. `decision`
2. `next_skill`
3. failure routing and fallback wording

If those stay aligned, the user still experiences one coherent PrimeFlow system even when host presentation differs.

## Related Docs

- skill boundaries: each `SKILL.md`
- host invocation shape: [agent-invocations.md](./agent-invocations.md)
- cross-host consistency principles: [agent-implementation.md](./agent-implementation.md)
