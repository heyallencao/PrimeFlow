# Review Checklist

Use this checklist during interactive review to ensure nothing is missed.

## Before Review
- [ ] fresh evidence from verify exists (not just code reading)
- [ ] plan document is readable
- [ ] diff scope is measured (file count, line count)

## Specialist Selection
- [ ] always-on specialists selected: correctness, testing, maintainability, project-standards
- [ ] conditional specialists activated based on diff content
- [ ] specialist skip conditions checked before running each

## Per-Specialist Output
- [ ] each finding has: file:line, issue, severity, confidence, evidence, autofix_class
- [ ] low-confidence findings (<0.60) discarded before presentation
- [ ] duplicate findings deduped by fingerprint (file + line_bucket +/-3 + normalized title)
- [ ] overlapping findings from 2+ specialists: confidence boosted by +0.10 (max 1.0)

## QA Routing
- [ ] qa_required set to true or false (not null)
- [ ] qa_required=true justified by user path, browser interaction, or runtime risk
- [ ] qa_required=false justified by internal/script/non-interactive nature

## Fix Classification
- [ ] safe_auto: deterministic local fixes review can apply
- [ ] gated_auto: fixes that change behavior, need approval
- [ ] manual: human-owned follow-up
- [ ] advisory: report-only notes

## Verdict
- [ ] pass: no unresolved P0/P1
- [ ] pass_with_risks: only P2/P3 remain, disclosed
- [ ] blocked: unresolved P0/P1 exist

## After Review
- [ ] review report generated with all sections
- [ ] qa_required is explicit
- [ ] state updated with review_result and qa_required
