# Working on the mind-map widget

## Read first

- [Requirements](docs/requirements.md) define the product contract.
- [Implementation plan](docs/impl-plan.md) defines architecture, defaults, nine
  implementation stages, and verification. Preserve the agreed TypeScript,
  HTML/SVG, textarea, pnpm, Vite, Vitest, and Playwright choices.
- [Progress](docs/progress.md) records the current milestone and next action.
- [Acceptance](docs/acceptance.md) defines milestone evidence and product reviews.
- Inspect the actual images in `docs/free-mind-references/` before rendering,
  editing, or drag-feedback work. A filename or text description is insufficient.

Follow the user's current instructions. Use plan defaults where requirements leave
details open. Surface genuine contradictions with a proposed resolution; continue
unaffected work. Do not silently change scope or specified behavior.

## Ownership and task boundaries

Complete the assigned task or implementation milestone, including relevant tests,
browser inspection, debugging, documentation, and fixes. Make routine reversible
decisions autonomously and record consequential decisions in the progress file.
Do not begin implementation merely because a documentation task is complete.

For implementation, follow the stages in order and deliver a runnable checkpoint
at the end of the assigned milestone. Pause for a product review only at a checkpoint
the user requested; if they already authorized proceeding beyond it, continue and
record any pending acceptance honestly. Do not repeatedly ask about routine choices.

Keep changes small and reviewable. When committing is authorized, commit coherent
units and include only task-related changes. Preserve unrelated user work.

## Engineering and verification

- Keep model rules, transactions, layout, navigation, and clipboard codec testable
  independently of the browser. Use the shared command path for API and gestures.
- Add meaningful tests with each behavior. Derive expected outcomes from the
  requirements and fixtures, including failures and interactions between features.
- Exercise keyboard, pointer, focus, editing, and drag behavior with actual browser
  input. Direct command calls alone do not verify a user gesture.
- Stage 1 must establish working build/typecheck/unit/browser commands and prove
  that the demo can run, screenshots can be captured, and Codex can inspect them.
  Document actual commands in `docs/testing.md` when they exist; do not claim
  planned commands are already available.
- Run relevant checks and fix failures before handing over. Run all milestone gates
  before declaring the milestone technically complete. Expand testing when changes,
  failures, or unresolved concerns warrant it.
- Never disable tests, relax assertions, or increase screenshot tolerances merely
  to obtain a pass. Explain justified corrections against the product contract.
- Record every required check as passed, failed, or not run, with reproducible
  evidence. Missing tools or environments mean unverified, not passed.
- Preserve the plan's real-browser, accessibility, packaged-consumer, and performance
  release checks. Automated browser coverage does not replace the specified manual
  and actual-browser checks.

## Visual and interaction fidelity

Recreate the exact reference tree as a permanent deterministic demo fixture.
Compare actual widget screenshots with the supplied references at stages 3, 5,
and 7. Inspect and correct spacing, branch junctions, label baselines, ellipse,
selection, editor placement, and drop gradients before handover.

Initial regression baselines need user visual acceptance before being treated as
approved. Baseline changes require an explained before/after comparison and recorded
acceptance; candidate images can be generated autonomously. Never overwrite the
supplied reference images. Keep font/environment differences explicit rather than
claiming pixel identity across platforms.

## Handover and continuity

Maintain `docs/progress.md` at meaningful checkpoints and before handover. Link
evidence from `docs/acceptance.md`; record the tested revision or working-tree state.
Keep technical completion separate from user acceptance. Include demo instructions,
checks and outcomes, visible comparisons, known defects, and the next concrete task.

For a review task, inspect the diff and relevant specification independently of the
implementation summary. Prioritize reproducible behavior defects, missing acceptance
coverage, visual mismatches, atomicity, focus, lifecycle, and performance risks.
Report actionable findings with file locations and reproduction or missing evidence.
