---
name: state-lock-race
type: bug
category: runtime-errors
keywords: [state, lock, race, concurrent, stale, .primeflow]
module: orchestrate
date: 2026-04-18
---

## Problem
Two concurrent `primeflow state set` calls can race on the lock file, causing one write to be lost or the state file to become empty.

## Symptoms
- state.json becomes `{}` or `null` after rapid consecutive skill runs
- `state get` returns `undefined` for fields that were previously set
- Lock file `.primeflow/state.json.lock` persists after a crashed process

## What Didn't Work
- Simple `touch`/`rm` lock files: they don't survive process crashes
- `flock`: not portable across macOS and Linux
- File-per-field approach: too many files, slow to read full state

## Solution
Use atomic write (write to temp file, rename). Add stale-lock detection: if lock is older than 10 seconds and the holding process is gone, remove it. Always fsync before rename.

## Why This Works
Rename is atomic on POSIX filesystems. Stale-lock detection handles crashed processes. fsync ensures data is on disk before the swap.

## Prevention
Never hold the lock across user interaction. Always lock -> write -> unlock in a single script block. If a skill needs to pause for user input, release the lock first.
