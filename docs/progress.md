# Implementation progress

Last updated: 2026-09-07

## Current state

**Stage-3 correctness review fixes are in progress.** The user authorized fixes
for malformed-command atomicity, reentrant FIFO ordering, trailing newline rows,
and host-transform-independent measurement. No later milestone was started.

- Item 1: runtime validation and atomic rejection regression coverage implemented;
  typecheck, 79 unit tests, and 9 API browser cases passed.
- Item 2: one iterative FIFO drain implemented; typecheck and all 18 API browser
  cases passed, including branching, errors, destruction, and a 3,000-operation chain.
- Item 3: shared zero-width inline box preserves trailing rows without changing
  text; typecheck and all 3 newline browser cases passed. Screenshots inspected.
- Item 4: fractional local CSS measurements implemented, including root content.
  Typecheck and all 6 edge-case browser tests passed; scaled screenshots inspected.
  The initial Firefox screen-bounds formula failed by 0.008px due to edge rounding;
  the final test compares actual pre-refresh bounds exactly. Full gates remain pending. Full milestone gates and refreshed evidence
  follow all four fixes. The previously recorded checks below predate this review.

Run `pnpm dev`, then open http://127.0.0.1:5173. The live reference, independent
geometry mount, native-size 100% DPI comparison, and `/?workload` diagnostic are
available. [Current review report](evidence/milestone-a/checkbox-gap/report.md),
[API](api.md), [testing](testing.md).

## Milestones

| Milestone | Stages | Technical status | User acceptance | Evidence |
|---|---|---|---|---|
| A: Foundation and appearance | 1–3 | Complete, including review corrections | Pending revised review | [A](acceptance.md#milestone-a-stages-13) |
| B: Navigation and editing | 4–5 | Not started | Pending | [B](acceptance.md#milestone-b-stages-45) |
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
- Current tested working tree is based on `2742408`. The checkbox-gap commit
  contains the change, verification, and evidence.
- Passed: strict typecheck, ESM/declarations/CSS build, **56 unit tests**,
  **36 browser cases** across Chromium, Firefox, and WebKit, and diff whitespace check.
- Actual measurements: root about **98.7×39px**, regular A/B/C row pitch **23px**.
  Root selection/line paint order, absent node outline, and exact checkbox background
  checked across all engines. Final comparisons and geometry screenshots inspected.
- The 1,000-total/500-visible diagnostic reran in all engines; measurements are in
  the current report directory. Final profiling and release checks remain D.

## Product decisions and corrections

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
- The original fixture is preserved. A separate 100% DPI variant matches the new
  screenshot's labels. New evidence is in `docs/evidence/milestone-a/checkbox-gap/`;
  earlier evidence is retained for comparison. No baseline has been approved.

## Next action and known limits

Review the [checkbox spacing](evidence/milestone-a/checkbox-gap/geometry-chromium.png)
and [comparison](evidence/milestone-a/checkbox-gap/comparison-chromium.png).
Windows/macOS font rasterization and small branch-position differences remain.
Ordinary letters have slightly more line clearance than the reference, preserving
a consistent baseline and sufficient space below descenders. No unresolved stage-3 behavior failure is known.

After feedback and authorization, proceed with stages 4–5: selection/navigation,
viewport, and textarea/provisional creation. Model insertion still commits supplied
text immediately at this checkpoint. Clipboard, links, and dragging remain C.
Final menu/API, packaged consumer, actual stable browsers, VoiceOver/NVDA, and full
performance profiling remain required D gates. Playwright WebKit is not actual
Safari verification. No later-stage check has been waived.
