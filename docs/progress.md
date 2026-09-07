# Implementation progress

Last updated: 2026-09-07

## Current state

**Milestone A accepted, including its default visual baseline at `253b99d`.**
The user authorized Milestone B (stages 4–5) on 2026-09-07. Navigation,
viewport controls, inline editing, and provisional creation are now in progress.
Stop at B's product checkpoint after verification and fixes.

The 2026-09-07 requirements update adds keyboard movement to stage 4/Milestone B.
This update changes documentation only; movement implementation and verification
remain pending. [Behavior](requirements.md#91-keyboard-movement-of-selected-nodes),
[plan](impl-plan.md#keyboard-movement), [review coverage](acceptance.md#milestone-b-stages-45).

Run `pnpm dev`, then open http://127.0.0.1:5173.
[Accepted A baseline](evidence/milestone-a/checkbox-size/report.md),
[API](api.md), [testing](testing.md).

## Milestones

| Milestone | Stages | Technical status | User acceptance | Evidence |
|---|---|---|---|---|
| A: Foundation and appearance | 1–3 | Complete | Accepted at `253b99d`, including default visuals | [A](acceptance.md#milestone-a-stages-13) |
| B: Navigation and editing | 4–5 | In progress | Pending | [B](acceptance.md#milestone-b-stages-45) |
| C: Clipboard and dragging | 6–7 | Not started | Pending | [C](acceptance.md#milestone-c-stages-67) |
| D: Integration and release | 8–9 | Not started | Pending | [D](acceptance.md#milestone-d-stages-89) |

## Verification and revisions

- Stage 1: `7ea0658`; stage 2: `a165cca`; original stage 3: `ab99572`, with
  handover `a50ede7`. [Historical evidence](evidence/milestone-a/report.md).
- First appearance corrections: `f59980d`, following the user's reference commit
  `9dfdd7e`. [Retained evidence](evidence/milestone-a/100dpi/report.md).
- Previous spacing correction: `0f6ab03`; [retained evidence](evidence/milestone-a/spacing/report.md).
- Descender-clearance correction: `2742408`; the user said it looks good and
  requested only a 1px larger checkbox-to-text gap.
- Checkbox-gap correction: `0964854`; [retained evidence](evidence/milestone-a/checkbox-gap/report.md).
- Correctness fixes: `81195b2` command validation, `845c9cc` FIFO queue,
  `f4bf9fa` trailing rows, and `1086255` local measurements.
- Correctness handover: `ceb73d7`; [retained report](evidence/milestone-a/correctness/report.md).
- Current checkbox-size trial is based on `ceb73d7`, with verification and evidence
  in the commit containing the trial report.
- Passed: strict typecheck, ESM/declarations/CSS build, **79 unit tests**,
  **54 browser cases** across Chromium, Firefox, and WebKit, and diff whitespace check.
- Actual measurements: root about **98.7×39px**, regular A/B/C row pitch **23px**.
  Root selection/line paint order, absent node outline, and exact checkbox background
  checked across all engines. Final comparisons and geometry screenshots inspected.
- The 1,000-total/500-visible diagnostic reran in all engines; measurements are in
  the current report directory. Final profiling and release checks remain D.

## Product decisions and corrections

- Keyboard movement approved on 2026-09-07: Command+Arrow on macOS, Ctrl+Arrow
  elsewhere. Require a contiguous selection of siblings, restricted to one root
  side for root children. Up/Down moves the block one position and wraps it at
  edges; inward promotes it immediately after the parent, or flips root children
  and appends them on the opposite side. Outward is a no-op. Preserve block order,
  subtrees, selection, and active node; reveal moved nodes and record one undoable
  transaction per effective move. Read-only disables it and textarea shortcuts
  retain platform behavior. Full-selection eligibility precedes normalization.
- Documentation verification for this update: requirements, plan, and B acceptance
  coverage reviewed for consistency; `git diff --check` passed. No implementation
  or runtime tests were run for this documentation-only change. Working-tree
  changes are limited to these four documents; previously recorded test counts are
  historical evidence and do not verify keyboard movement.
- User authorized the five appearance changes on 2026-09-07 after reviewing the
  proposal. The new Windows screenshot anchors native-size proportions and root
  selection; the previous three references remain unchanged and applicable.
- Default font is 12px with 15px line height; spacing, root padding, markers, and
  checkbox size were reduced proportionally while strokes remain 1px.
- Root selection fills the entire ellipse with #d2d2d2. SVG strokes now paint over
  selection backgrounds and remain pointer-transparent. Node focus outlines were
  removed; canvas keyboard focus and active-descendant semantics remain.
- Checked inputs use #339933 with a white tick. Explicit CSS avoids WebKit's native
  tinting; inputs retain their semantics and native forced-color appearance.
- Follow-up feedback identified insufficient descender clearance. The user approved
  retaining Arial, restoring text clearance, and adjusting the N1 gap separately.
  Standard Java Windows SansSerif maps Latin text to Arial (sources in the report).
- Non-root offset is now 0.5px downward (a 1.5px lift from the previous candidate),
  with 2px bottom padding. Root subtree gap is independently 4.5px; inner gap stays
  3px. Checkboxes remain raised 1px relative to text; root text stays centered.
- Native pixel checks now include all nonwhite descender pixels: two completely
  clear rows below In-place editing and eleven above N1 in all three engines.
  The earlier dark-only measurement missed faint edges and overstated clearance.
- Checkbox-to-text gap is now 4px (previously 3px), as requested. The input’s
  vertical alignment, dimensions, and color remain unchanged. Browser assertions
  measure the 4px gap beside root, single-line, multiline, and nested labels.
- Runtime commands validate required text, ID shapes, and move enums before any
  installation. Rejection preserves document, selection, DOM, and undo/redo; errors
  are stable validation codes. Twenty-two malformed-input cases are covered.
- Reentrant commands drain one iterative FIFO queue: A/B/C/D ordering, full event
  batches, listener failures, destruction, and 3,000-operation chains are covered.
- Empty trailing rows now participate in both measured and visible line boxes
  without adding text. LF/CRLF and newline-only labels are covered.
- Measurement reads fractional local CSS sizes, including root content. Mount and
  refresh preserve exact local geometry under scales, nested/nonuniform transforms,
  rotation, and restoration. Half-scale multiline height remains 17.5px.
- The checkbox-size trial increases the square from 11×11px to 13×13px. Its
  center remains 1px above the text-block center, with a 4px gap to the label.
  Geometry measurement includes the larger square. Accepted in Milestone A.
- The original fixture is preserved. A separate 100% DPI variant matches the new
  screenshot's labels. New evidence is in `docs/evidence/milestone-a/checkbox-size/`;
  earlier evidence is retained for comparison. The checkbox-size default visuals are now approved.

## Next action and known limits

Implement stages 4–5 under the updated plan, including keyboard block movement,
preserve accepted A screenshots, and produce B interaction tests and editing
comparisons. Windows/macOS font
rasterization differences remain accepted A limitations. Clipboard, links, and
dragging remain C; menu, packaged consumer, actual stable browsers, assistive
technology, and release performance checks remain D. No release gate is waived.

## B stage-4 checkpoint (2026-09-07)

Selection, pure geometry navigation/range paths, keyboard block movement, mouse
pan, wheel/keyboard zoom, fit/reveal, resize preservation, and checkbox/structural
key routing are implemented. Movement uses the shared reducer and history path.
Passed: typecheck/build, 93 unit tests, 18 new interaction browser cases across all
three engines. Full regression: 69 passed / 3 initially failed because the old
mount test expected Tab to leave the widget; Tab is now the required insert-child
binding. Corrected the test to use pointer entry into the independent mount;
all 3 rerun cases passed. No assertion tolerance was increased.

Evidence: [stage-4 checks](evidence/milestone-b/stage4/checks.txt),
[full run](evidence/milestone-b/stage4/browser-checks.txt),
[corrected focus check](evidence/milestone-b/stage4/mount-checks.txt).
All three default reference PNGs are byte-identical to accepted A images.
Inspected Chromium/WebKit default images and Firefox checkbox geometry.
Accepted A evidence is preserved; new captures go to `evidence/milestone-b/`.
Next: stage 5 provisional creation, textarea and focus/composition coordination,
then final B regression, review demo and editing comparisons. B acceptance pending.
