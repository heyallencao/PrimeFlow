---
name: ks-roundtable
description: "Direction convergence skill. Use brainstorm, align, or challenge mode to turn messy questions or existing proposals into a clear directional decision."
layer: decision
owner: roundtable
inputs:
  - task_description
  - constraints
outputs:
  - roundtable_report
  - direction_decision
entry_modes:
  - from-scratch
  - aligned-offline
---

# Roundtable

> Preamble: see [templates/preamble.md](../../templates/preamble.md)

## Summary

Direction-convergence hub. Uses Socratic questioning and internal multi-role previewing to compress a messy problem, proposal, or direction into one clear decision. Enter when the real blocker is "what should happen first", "which path is more valuable", or "whether this should happen now at all". If direction is already clear, go to `writing-plan`. Does not write implementation tasks, produce technical design, or act as a quality gate.

## Modes

| Mode | Use when | Goal |
|---|---|---|
| `brainstorm` | no executable direction exists yet | discover candidate directions |
| `align` | offline direction exists, needs fast convergence | fill boundaries, assumptions, smallest viable loop |
| `challenge` | proposal exists, needs adversarial review | expose risks, blind spots, cost of the wrong path |

### Quick Selection

1. No executable direction? → `brainstorm`
2. Direction valid but missing boundaries/dependencies/smallest loop? → `align`
3. Direction plausible but worried about risk/cost/omissions? → `challenge`

Gray areas:
- team discussed offline but unsure conclusion is valid → `challenge`
- direction sounds clear but cannot name smallest viable loop → `align`
- topic too vague to compress → `brainstorm`

## Role Pool

| Role | Responsibility | Typical question |
|---|---|---|
| `product-manager` | value, user need, prioritization | does this help the user enough to matter now? |
| `software-architect` | architecture, tech debt, scalability | will this hold up over the next few months? |
| `frontend-engineer` | frontend feasibility, UX reachability | can this interaction be implemented cleanly? |
| `backend-engineer` | backend feasibility, data consistency, API shape | does the contract and data model make sense? |
| `sre` | reliability, monitoring, recovery | can this run safely and can failure be detected? |
| `security-architect` | security boundaries, permissions, data protection | does this create a security risk? |

Additional roles activated on demand: `ux-researcher`, `incident-response-commander`, `code-reviewer`, `delivery-owner`.

Activation: 3 roles by default, expand to 4-5 for complex questions, minimum 2 + moderator. Even a very small problem should still use at least 2 roles plus the moderator.

Mode-role matching:
- `brainstorm` → product, architecture, feasibility
- `align` → boundary, dependency, smallest-loop clarity
- `challenge` → security, reliability, excluded paths, wrong-choice cost

More roles are not automatically better. Match the role mix to the mode and problem complexity.

## PROCEDURE

### Prerequisite Check

Run these checks before entering. If any fails, do not enter `roundtable`:

- [ ] the problem is actually directional (not root-cause investigation, not evidence-collection, not an already-executable block)
- [ ] there is no directly executable current block yet
- [ ] this is not a root-cause investigation (that is `diagnose`)
- [ ] this is not an evidence-collection problem (that is `verify`)

If the problem is already clear enough to define a current block, skip directly to `writing-plan`.

### Stage 1: Internal Preview (not shown to user)

Do this internally before asking the user anything. Do not dump this stage to the user.

1. **Compress the decision topic** into one sentence
   - Example: "Should we build the notification system now or defer it until after the settings refactor?"
   - If you cannot compress it, the topic is too vague for this mode. Consider `brainstorm`.
   - The one-sentence compression is internal only; it shapes the questions, not the output

2. **Confirm the mode**: `brainstorm`, `align`, or `challenge`
   - Use the quick selection tree above
   - If the mode is wrong, the questions will miss the point

3. **Activate relevant roles** (see Mode-role matching above)
   - Minimum 2 roles + moderator even for small problems
   - For complex cross-cutting questions, expand to 4-5

4. **Let each role form**: `Position`, `Reason`, `Risk`
   - Position: what this role thinks the direction should be (1 sentence)
   - Reason: why (1-2 sentences)
   - Risk: what breaks if this position is wrong (1 sentence)

This stage gives the moderator enough internal structure to ask targeted questions. It does not replace the user-facing question phase.

### Stage 2: Socratic Questions (visible to user)

Ask the user one question at a time. Minimum 3 meaningful questions before the final report.

Per-mode question templates:

**brainstorm** (goal: discover candidate directions):
- "What is the single outcome this round must produce?"
- "If we could only do one thing, which one pays off the most?"
- "What alternative path looks reasonable but is not worth choosing now?"
- "What would make this round a waste of time?"
- "Is this a new direction or a refinement of an existing one?"
- "What is the minimum that would count as progress?"

**align** (goal: fill boundaries, assumptions, smallest viable loop):
- "What is the smallest viable loop we can close?"
- "What dependency or boundary is still missing from the direction?"
- "If the scope had to shrink to the smallest loop, what must survive?"
- "What assumption in the direction is still unconfirmed?"
- "What is the entry condition that must already be true before this starts?"
- "What would make this loop too small to be useful?"

**challenge** (goal: expose risks, blind spots, cost of wrong path):
- "If this path is wrong, what is the most expensive cost?"
- "What is the single least acceptable failure for this round?"
- "What blind spot does this direction not account for?"
- "What alternative was dismissed too quickly?"
- "What would a skeptical reviewer say is the biggest risk?"
- "If we had to reverse this decision in 3 months, how painful would it be?"

Circuit breaker: if the user gives 2 consecutive low-information answers ("continue", "up to you", "either is fine"), force a directional conclusion with risk disclosure. Do not keep asking.

### Exit Conditions for Question Phase

Stop asking questions and produce the final report when any one is true:

- enough information exists for one directional conclusion
- disagreement remains but it is clear what this round will NOT do
- user gives 2 consecutive low-info answers (circuit breaker)
- user explicitly says they do not want more questions

If missing information is still too large and continuing would mislead execution:
- list the missing points
- set `escalate = true`
- do not pretend the direction converged

### Stage 3: Final Report

Produce the report only after the question phase exits. The final report must not appear before the question phase.

```markdown
## Roundtable Final Report

**Mode**: [brainstorm / align / challenge]
**Topic**: [the actual decision in one sentence]
**Activated roles**: role-a, role-b, role-c

### Role Views
- role-a: [1-2 sentences covering position and risk]
- role-b: [1-2 sentences covering position and risk]
- role-c: [1-2 sentences covering position and risk]

### Summary
- **Consensus**: [1-2 sentences describing where roles agree]
- **Disagreement**: [explicit disagreement points, or "none"]

### Conclusion
- **Decision**: [one directional conclusion]
- **Why**: [why this direction won over alternatives]
- **Excluded paths**: [what was excluded and why]
- **Wrong-choice cost**: [most expensive cost if this direction is wrong]

### Next Step
- **next_skill**: writing-plan
- **Entry condition**: direction is now clear enough to define the current block
```

### Failure Handling Within Procedure

| Failure | Action |
|---|---|
| Cannot compress topic into one sentence | Switch to `brainstorm` mode and ask the user to describe the problem from scratch |
| User gives 2+ non-answers | Apply circuit breaker; force conclusion with risk disclosure |
| Roles produce irreconcilable positions | See E2 |
| Direction converges but scope is vague | See E3 |
| Missing information too large to continue | Set `escalate = true`; list missing points; do not fake convergence |

## EXCEPTION HANDLING

### E1: User Non-Answers

When the user gives 2+ consecutive low-information answers ("continue", "up to you", "either is fine", "whatever you think"):
- Do NOT ask a third question in the same direction
- Force a conclusion yourself with explicit risk disclosure
- Mark `confidence = 0.7` instead of 0.9
- State in the report: "Direction was forced due to insufficient user input; risk disclosure applies"
- Choose the direction that minimizes wrong-choice cost
- If no direction can be safely chosen, set `escalate = true` and route to `orchestrate`
- Example: user says "up to you" twice → force the direction with the lowest wrong-choice cost, disclose the risk

### E2: Role Disagreement Cannot Be Resolved

When activated roles produce irreconcilable positions (e.g., security-architect says "do not ship" while product-manager says "ship now"):
- Record both positions in the disagreement section of the report
- Do NOT suppress one role's view to force consensus
- Choose the direction that has the lowest wrong-choice cost
- If neither direction can be eliminated safely, set `escalate = true`
- Route to `orchestrate` instead of `writing-plan` when `escalate = true`
- The roundtable report must still be produced even when escalation occurs
- Example: security-architect blocks release, product-manager insists on shipping → record both, choose lowest wrong-choice cost, escalate if unresolved

### E3: Direction Converges but Scope Remains Unclear

When the decision topic is answered but the scope boundary is still vague (e.g., "build notification system" is agreed but "how much of it" is not):
- Do NOT proceed to `writing-plan` with a vague scope
- Ask one targeted scope question: "What must survive if the scope shrinks to the smallest viable loop?"
- If still unclear after one more question, route to `writing-plan` with an explicit note that scope needs compression
- Set `confidence = 0.8` because the direction is clear but the boundary is soft
- The writing-plan skill is better equipped to handle scope compression through its scope test
- Example: "build the notification system" is agreed but "full system or just the toggle?" is unclear → ask one more scope question

## Routing After Roundtable

| Outcome | next_skill | Condition |
|---|---|---|
| direction converged | `writing-plan` | topic answered, scope is clear enough |
| direction deferred | `roundtable` | more discussion needed |
| escalation | `orchestrate` | disagreement unresolvable by the skill |
| scope unclear | `writing-plan` | with note that scope compression is needed |

## Decision Contract

**decision**: roundtable-aligned
**confidence**: 0.9
**rationale**: The topic has been converged in the appropriate mode, role disagreement has been exposed, and no further direction discussion is required before planning.
**fallback**: If the chosen direction fails, return to roundtable and reopen the broader option set.
**escalate**: false
**next_skill**: writing-plan
**next_action**: Enter writing-plan and define the executable block.

| Situation | decision | escalate | next_skill |
|---|---|---|---|
| direction converged | `roundtable-aligned` | false | writing-plan |
| more discussion needed | `roundtable-deferred` | false | roundtable |
| disagreement unresolvable | `roundtable-escalate` | true | orchestrate |

## State Update

```bash
_KS_CLI="${KEYSTONE_CLI:-./keystone}"
$_KS_CLI state set current_stage "roundtable" >/dev/null
$_KS_CLI state set last_decision "$_DECISION" >/dev/null
$_KS_CLI state set artifacts.roundtable_mode "$_ROUNDTABLE_MODE" >/dev/null

case "$_DECISION" in
  roundtable-aligned)
    _EXIT_CODE="ok"
    _EXIT_NEXT="writing-plan"
    _EXIT_REASON="Direction converged"
    ;;
  roundtable-deferred)
    _EXIT_CODE="deferred"
    _EXIT_NEXT="roundtable"
    _EXIT_REASON="More discussion is still needed"
    ;;
  roundtable-escalate)
    _EXIT_CODE="escalate"
    _EXIT_NEXT=""
    _EXIT_REASON="Directional disagreement cannot be resolved safely"
    ;;
esac
$_KS_CLI state set exit_code "$_EXIT_CODE" >/dev/null
$_KS_CLI state set exit_reason "$_EXIT_REASON" >/dev/null
$_KS_CLI state set next_skill "$_EXIT_NEXT" >/dev/null
```

## Telemetry

```bash
echo "{\"skill\":\"roundtable\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"decision\":\"$_DECISION\",\"confidence\":0.9,\"mode\":\"$_ROUNDTABLE_MODE\"}" >> .keystone/telemetry/events/$(date +%Y-%m).jsonl
```

## Quality Checklist

- [ ] the internal preview and user-visible output are separate
- [ ] the mode is explicit
- [ ] at least 3 Socratic questions were asked before the final report
- [ ] the question phase exit condition is satisfied
- [ ] the final report appears only after the question phase
- [ ] the activated roles match the problem and mode
- [ ] the conclusion is singular (one direction, not "both are fine")
- [ ] excluded paths are explicit
- [ ] the next skill is explicit
- [ ] circuit breaker was applied when user gave consecutive non-answers
- [ ] wrong-choice cost is disclosed in the report
- [ ] role disagreement was not suppressed to force false consensus
- [ ] the one-sentence topic compression was performed before questions began
- [ ] the circuit breaker threshold (2 consecutive non-answers) was respected
