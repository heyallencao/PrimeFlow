# PrimeFlow Walkthrough

This is not the full manual. It is the smallest first run that should make PrimeFlow feel concrete.

Goals:

- show how PrimeFlow enters real work
- show when each major skill should be used
- avoid making you read all 18 skills upfront

---

## Example Task

Add a `Continue with GitHub` entry to an existing login page while keeping these constraints:

- existing login methods must not regress
- the new button should appear only on the web surface
- implementation, evidence, and closeout should all be recorded explicitly

## Recommended First Sentence To Your Agent

```text
Use PrimeFlow and start from orchestrate. This is a from-scratch feature with a clear goal: add a GitHub OAuth entry to the existing login page. Determine the correct entry mode, then move through the smallest safe loop.
```

## Default Mainline For Scratch Work

When you are starting a task from scratch, the default PrimeFlow mainline is:

```text
orchestrate -> roundtable -> writing-plan -> test-first -> implement -> verify -> review -> qa? -> ship -> release -> knowledge
```

Where:

- `qa?` means QA only runs when real runtime risk exists
- `knowledge` is optional and only worth entering when the work has future reuse value

This is a recommended path, not a mandatory chain for every task.

## Smallest Useful Path

```text
orchestrate -> roundtable -> writing-plan -> test-first -> implement -> verify -> review
```

That path alone is enough to feel PrimeFlow's core contract.

If the task needs production closeout after that:

```text
qa -> ship -> release -> knowledge
```

## What Each Step Is Doing

### 1. orchestrate

Purpose:

- recognize that this is `from-scratch`
- set the initial `risk_level`
- choose `roundtable` as the next step

Expected outcome:

- the entry mode is explicit
- the next skill is explicit

### 2. roundtable

Purpose:

- converge the direction instead of writing immediately
- confirm that this is a new entry point, not a rewrite of the whole authentication system

Questions worth answering here:

- where should the GitHub OAuth entry appear?
- does the work include backend callback behavior?
- is a feature flag needed?

### 3. writing-plan

Purpose:

- compress the task into one executable current block
- define what counts as done and what stays out of scope

A good current block should say at least:

- add the GitHub button to the login page
- connect it to the existing OAuth flow
- do not change the existing email login behavior

### 4. test-first

Purpose:

- lock the behavior boundary before implementation
- prevent accidental scope creep

The contract should at least lock:

- the condition for showing the GitHub button
- the behavior after clicking it
- the lack of regression in the existing login flow

### 5. implement

Purpose:

- complete only the approved block
- avoid unrelated UI cleanup
- avoid pulling future work into the same diff

### 6. verify

Purpose:

- collect fresh evidence
- decide between `pass`, `fail_bug`, and `fail_spec`

The key question here is not "does it feel fine?" but:

- what did you actually verify?
- is that evidence fresh?

### 7. review

Purpose:

- apply the formal quality gate
- decide whether QA is still required

If the work is a small page-level change on an already-stable auth flow, review may decide that QA is unnecessary. If it touches real runtime risk or important integrations, continue to `qa`.

## When To Use Handoff

If you need to pause halfway through, do not leave a vague note like "continue later".

Use:

```text
Use PrimeFlow and run handoff out.
```

To restore:

```text
Use PrimeFlow and run handoff in latest.
```

`handoff` is worth remembering because it turns AI context from a black box into an explicit recoverable package.

## What Not To Do On Your First Run

- do not try to memorize all 18 skills first
- do not assume `qa`, `ship`, and `release` are mandatory on every task
- do not skip `writing-plan` and start "thinking while coding"
- do not treat `verify` as a subjective confidence check

## Suggested Reading Order

1. read [README.md](../README.md)
2. run this walkthrough once
3. read [STATE.md](../STATE.md) when you need field-level details
4. read individual `SKILL.md` files when you need specific behavior contracts
