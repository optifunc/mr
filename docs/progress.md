# Implementation progress

Last updated: 2026-09-07

## Current state

**Milestone A remains at the stage-3 checkpoint. The follow-up spacing and
checkbox alignment corrections are complete; revised visual acceptance is pending.** Work remains stopped
at the stage-3 product checkpoint; no later milestone was started.

Run `pnpm dev`, then open http://127.0.0.1:5173. The live reference, independent
geometry mount, native-size 100% DPI comparison, and `/?workload` diagnostic are
available. [Current review report](evidence/milestone-a/spacing/report.md),
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
- Current tested working tree is based on `f59980d`. The spacing correction commit
  contains implementation, updated contract, tests, and new evidence together.
- Passed: strict typecheck, ESM/declarations/CSS build, **54 unit tests**,
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
- Follow-up feedback requested more clearance above N1, less clearance between
  text and its branch line, and higher checkboxes. Non-root content moves down
  2px within unchanged node boxes; checkboxes move up 1px relative to text. Root
  text stays centered. Native ink-gap measurements match the reference in
  Chromium/WebKit; Firefox differs by one glyph row (see the report).
- The original fixture is preserved. A separate 100% DPI variant matches the new
  screenshot's labels. New evidence is in `docs/evidence/milestone-a/spacing/`;
  earlier evidence is retained for comparison. No baseline has been approved.

## Next action and known limits

Review the [new comparison](evidence/milestone-a/spacing/comparison-chromium.png)
and [selection/checkbox fixture](evidence/milestone-a/spacing/selection-lines-chromium.png).
Windows/macOS font rasterization (including Firefox’s one-pixel ink-gap difference)
and small branch-position differences remain
explicit. No unresolved stage-3 behavior failure is known.

After feedback and authorization, proceed with stages 4–5: selection/navigation,
viewport, and textarea/provisional creation. Model insertion still commits supplied
text immediately at this checkpoint. Clipboard, links, and dragging remain C.
Final menu/API, packaged consumer, actual stable browsers, VoiceOver/NVDA, and full
performance profiling remain required D gates. Playwright WebKit is not actual
Safari verification. No later-stage check has been waived.
