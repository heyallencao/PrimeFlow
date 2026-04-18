# PrimeFlow Golden Paths

This is not the full protocol manual. It is the fast reference for common situations: which skill chain to use, where to stop, and when to route backward.

Each path tries to stay:

- short
- explicit about skill names
- honest about where to stop, continue, or roll back

## 1. New Feature Path

Use when:

- you are starting a new feature from scratch
- the goal is known, but the current block is not defined yet

Recommended path:

```text
help -> orchestrate -> roundtable -> writing-plan -> test-first -> implement -> verify -> review
```

Stop when:

- `review` passed and the round only needs the feature-development loop

Continue when:

- browser interaction, critical integration paths, or high runtime risk still require `qa -> ship -> release`

Route backward when:

- direction is still unclear -> `roundtable`
- the current block is still unclear -> `writing-plan`
- verification found a bug -> `diagnose`
- verification found spec drift -> `writing-plan`

## 2. Small Fix Path

Use when:

- the fix is small
- the issue and scope are mostly known
- a full zero-to-one discovery loop is unnecessary

Recommended path:

```text
help -> brief -> writing-plan -> test-first / implement -> verify -> review
```

Stop when:

- `review` passed and no formal delivery closeout is needed

Continue when:

- PR context is needed -> `pr-prep`
- formal delivery is needed -> `ship -> release`

Route backward when:

- planning reveals the scope is actually not small -> `roundtable`
- verify finds a spec problem rather than an implementation bug -> `writing-plan`

## 3. Build-Ready Path

Use when:

- code already exists, fully or partially
- the current focus is evidence, review, and closeout

Recommended path:

```text
help -> verify -> review -> pr-prep -> ship -> release
```

Stop when:

- code review and PR context are enough and you do not need release closeout yet

Continue when:

- release disclosure or knowledge archival is needed -> `release -> knowledge`

Route backward when:

- verify finds a bug -> `diagnose`
- verify finds spec drift -> `writing-plan`
- review is blocked -> `implement`

## 4. Incident Path

Use when:

- the system is failing
- tests are breaking
- a user path is down
- a production or high-impact environment regressed

Recommended path:

```text
help -> bug-triage -> diagnose -> implement -> verify -> review
```

Stop when:

- the root cause is known, the fix is verified, and formal delivery has not started yet

Continue when:

- triage decides containment or rollback thinking should come first -> `ship`

Route backward when:

- triage reveals a spec problem -> `writing-plan`
- diagnose still has no answer after 3 loops -> escalate

## 5. PR Closeout Path

Use when:

- the code and evidence are mostly done
- the next job is to package the change for reviewers and maintainers

Recommended path:

```text
help -> verify -> review -> pr-prep -> docs-writer
```

Stop when:

- the PR description and delivery context are clear

Continue when:

- delivery execution is next -> `ship`
- release disclosure is next -> `release`

Route backward when:

- verify finds a bug -> `diagnose`
- verify finds spec drift -> `writing-plan`
- review finds blocking issues -> `implement`
- the document depends on facts that are not stable yet -> return to `verify` or `review`

## 6. Session Switch Path

Use when:

- you need to pause
- you need to switch agents
- you need to continue in a fresh session

Recommended path:

```text
help -> handoff out -> handoff in latest -> orchestrate
```

Stop when:

- `handoff out` finished and the current session should pause

Continue when:

- the restored session should let `orchestrate` reread the context and choose the next skill

Route backward when:

- the recovery preview is wrong -> do not continue; choose a different handoff package

## Fast Entry Table

If you only want to pick one starting point, use this:

| Current state | Start with |
|---|---|
| no idea where to start | `help` |
| lots of context, but not one clear task yet | `brief` |
| new feature from scratch | `orchestrate` |
| failure exists but the failure type is still unknown | `bug-triage` |
| code is written and evidence is needed | `verify` |
| PR context is needed | `pr-prep` |
| changelog, ADR, or migration note is needed | `docs-writer` |
| pause or resume is needed | `handoff` |

## Usage Notes

- on your first run, do not memorize all skills; pick the path that most closely matches your current state
- paths are recommendations, not hard law, but the rollback rules are worth respecting
- if a path keeps branching into three parallel options, that path still needs convergence
