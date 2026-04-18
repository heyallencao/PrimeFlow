## Verification Report

**Current block**: Release playbook
**Verification time**: 2026-04-18T00:00:00Z

### Test Run
- total: 2
- passed: 2
- failed: 0

### Behavior Checks

| Done Criterion | Expected | Actual | Result |
|---|---|---|---|
| Maintainers have a root-level release playbook for the current staged model | the repository should expose one clear release operations entry point without implying npm publication | `RELEASING.md` added and linked from `README.md` and `docs/maintainer.md` | PASS |
| Release playbook is part of the English-first active-doc gate | the new root-level release doc should not drift outside canonical doc checks | `scripts/check-english-foundation.mjs` now checks `RELEASING.md` and `npm run test:english-foundation` passed | PASS |
| Existing install/runtime smoke still passes | release playbook docs must not break existing behavior | `npm run smoke` passed | PASS |

### Claims
- PrimeFlow now has a standard maintainer-facing release playbook for the staged payload model.
- The playbook is documented as an active canonical surface and covered by the English-first gate.

### Conclusion
**verify_result**: pass
