# Implementation progress

Last updated: 2026-09-08

## Current state

**Milestone B is technically complete and accepted at `4209b2a` on 2026-09-08.**
The user accepted the stage-5 product checkpoint, including the final reviewed
behavior and appearance. [Acceptance record](acceptance.md#milestone-b-stages-45).
Milestone A's default baseline at `253b99d` remains accepted and unchanged.
The approved Up/Down corrections now prefer siblings, then same-depth nodes, then
the nearest shallower node outside the ancestor chain. All ten examples are verified.
Root Up/Down, including Shift, now does nothing as requested on 2026-09-08.
[Navigation evidence](evidence/milestone-b/navigation-root/report.md).
The approved editing adjustments now support typing replacement, hide horizontal
scrollbars, and anchor left editors outward. The latest sizing correction uses
an eight-M width for new/leaf/collapsed nodes and selection width for expanded
parents, with the bottom border on the branch line and stable text position.
[Editor sizing evidence](evidence/milestone-b/editor-sizing/report.md).
The latest approved controls remove the focused-widget frame, use Ctrl+Space on
all platforms, and expand collapsed nodes by clicking their circles without
changing selection. [Latest evidence](evidence/milestone-b/focus-controls/report.md).
Stages 6–9 have not been started.

Stages 4–5 include mouse/range selection, geometry navigation, keyboard sibling-block
movement, viewport controls, checkbox/structural gestures, native textarea editing,
and provisional creation with one-entry commit or full cancellation restoration.
[Review report and gaps](evidence/milestone-b/report.md),
[product exercises](acceptance.md#milestone-b-stages-45).

Run `pnpm dev`, then open http://127.0.0.1:5173.
[Accepted A baseline](evidence/milestone-a/checkbox-size/report.md),
[API](api.md), [testing](testing.md).

## Milestones

| Milestone | Stages | Technical status | User acceptance | Evidence |
|---|---|---|---|---|
| A: Foundation and appearance | 1–3 | Complete | Accepted at `253b99d`, including default visuals | [A](acceptance.md#milestone-a-stages-13) |
| B: Navigation and editing | 4–5 | Complete | Accepted at `4209b2a` on 2026-09-08 | [B](acceptance.md#milestone-b-stages-45) |
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

Milestone B product review is complete. Next is milestone C (stages 6–7: clipboard,
links and dragging), awaiting user authorization. Do not begin implementation yet.
The runnable demo exposes all B behaviors,
reference/editing comparisons, event/selection/history state, read-only mode and
an interleaved-side fixture. See the [B report](evidence/milestone-b/report.md).

Clipboard, links and dragging remain C; menu, packaged consumer, actual stable
browsers, assistive technology and release performance checks remain D. Real OS
IME composition is not manually verified; synthetic composition-event guards are
covered. Default font/rasterization differences from the supplied Windows/older
editing rasters remain explicit. No release gate is waived.

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

## B stage-5 handover (2026-09-07)

Stage 4 is `a5f97bc`; tested stage-5 implementation and evidence are `8e2e3bf`.
The subsequent handover commit changes documentation/evidence only. The tested tree
contained only task-related changes; no unrelated starting changes existed.
Live handover demo: http://127.0.0.1:5174/ (5173 was already occupied).
For a fresh run, `pnpm dev` prints the available local port.

- **Passed:** strict typecheck, ESM/CSS/declaration build, **101 unit tests**,
  **150 browser cases** across Chromium/Firefox/WebKit using
  `pnpm test:browser --workers=1`, and `git diff --check`.
- **Passed:** exact PNG regression against all three accepted A default images,
  using the original page geometry; supplied references/A evidence are untouched.
- **Inspected:** editing/reference comparisons in all engines, frozen/committed
  multiline geometry, and root/checkbox editors at 150%. Measured textarea content
  origin equals label origin (dx=dy=0 in all captured cases).
- **Passed:** 1,000-total/500-visible early diagnostic in each engine. Final release
  profiling, actual stable browsers, screen readers and packaged consumer remain
  not run at this checkpoint, as planned.
- Provisional insertion immediately renders/selects the new node, without a
  document event/history entry. Commit combines creation and label; Escape restores
  structure, collapse, selection, prior view, and redo. Public snapshots exclude
  the textarea buffer. Origin/event behavior is documented in [API](api.md).
- Routine refinements: textarea is bounded to the viewport and scrolls long text;
  zero-size deferred fit refreshes observation so a coalesced hide/show cannot
  strand it; no-op zoom commands return false and emit no events. Reentrant
  destruction prevents a following mutation. Ordinary read-only gestures are silent.
- Retained failure evidence and corrections are in the [report](evidence/milestone-b/report.md).
  One run was interrupted during extreme host contention without relaxing tests.
  The single-worker rerun reproduced a Firefox deferred-fit race; the code fix then
  passed the full suite. Historical API/focus tests were updated against the B
  contract, with exact assertions retained.

[Checks](evidence/milestone-b/checks.txt), [browser log](evidence/milestone-b/browser-checks.txt),
[editing comparison](evidence/milestone-b/editing-comparison-chromium.png),
[default regression](evidence/milestone-b/regression-reference-chromium.png).
Technical completion is not user acceptance. Stop here for the requested review.

## B navigation correction (2026-09-07)

Approved after clarification: Up/Down prefers siblings, then continues at the same
depth in adjacent branches on the same side, skipping other depths. Single child
+ Down is N1. Non-root edges stay selected; root entry and Left/Right behavior are
preserved. The requirements table, plan, API and acceptance exercise now agree.

Tested working tree: task-only changes based on `0204593`, captured in the commit
containing this entry and its [report](evidence/milestone-b/navigation/report.md).
Passed: build/typecheck, **110 unit tests**, **27 interaction/navigation browser
cases** and **3 exact accepted-A screenshot regressions**, all three engines,
plus `git diff --check`. All seven user examples were exercised with actual keys
in editable/read-only mounts; mirrored trees, sibling priority, ties, collapsed
peers, edge no-ops and Shift contraction are covered. New selection screenshots
were inspected in each engine. Earlier B evidence is preserved.

The focused pre-fix run failed nine cases, confirming the old cross-depth behavior.
Updated old assertions now enforce the approved rule; none were relaxed. The full
B browser suite, workload and manual/release checks were not rerun for this small
navigation-only correction; their prior evidence and remaining gaps still apply.
Next: user review of the correction and any further B feedback. Remain at stage 5.

## B shallower navigation fallback (2026-09-07)

Approved follow-up: when no sibling or same-depth destination exists in the requested
direction, use the nearest visible shallower node on the same root side, excluding
all ancestors. Vertical distance takes priority over depth difference; stable layout
order breaks ties. Deeper nodes are excluded; exhausted edges stay selected.

Verified examples: C2 + Down → N4; Child of a single child + Up → C; C2.1 + Up →
Child 1. All prior seven cases still pass, including on mirrored trees. Requirements,
plan, API, acceptance and testing docs now describe this priority sequence.

Tested tree: task-only changes based on `5208bde`, in the commit containing this
entry and [report](evidence/milestone-b/navigation-fallback/report.md). Passed:
typecheck/build, **114 unit tests**, **30 navigation/interaction browser cases**,
**3 exact approved-A regressions**, and `git diff --check`. Browser keys verify
editable/read-only behavior and Shift extension through the fallback. Final
selection screenshots were inspected in all three engines. The pre-fix focused
run failed six cases; corrected assertions enforce the newly approved behavior.

Earlier evidence is preserved. Full B/browser workload and manual/release checks
were not rerun for this focused change; previous release gaps remain. Next action:
user review and any further B feedback. Remain at the stage-5 checkpoint.

## B root navigation correction — 2026-09-08

Requested root Up/Down no-op implemented in the shared navigation resolver, including
Shift and API commands. Tests preserve single/multiple selection with root active,
focus, document, viewport, page scroll, event log, layout count and history in both
editable/read-only modes. Requirements, plan, API and testing instructions updated.

Based on `d7ca866`; tested task changes are in the commit containing this record.
Passed: typecheck, build, 114 unit tests, 36 focused browser cases and 3 exact
accepted-A screenshot comparisons. Root screenshots inspected in all three engines.
[Report and reproducible logs](evidence/milestone-b/navigation-root/report.md).
Full B suite and later release gates were not rerun; existing gaps remain recorded.
Demo: `pnpm dev`, open Vite's printed URL, select root and press Up/Down with and
without Shift. Continue stage-5 product review; stages 6–9 remain unstarted.

## B editing adjustments — 2026-09-08

Implemented the four approved changes: printable typing replaces the active label
through the shared edit transaction, horizontal editor scrollbars are hidden while
native caret scrolling remains available, empty creation editors use 100px instead
of 50px, and left-side editors anchor at the label's right edge and expand outward.
The width remains capped by the viewport and scales with zoom. Space and modifier
shortcuts retain their bindings. Multiple selection edits the active node only.

Tested task-only changes based on `53b47b0`, in the commit containing this record.
Passed: typecheck, build, 114 unit tests, 87 existing editing/navigation/interaction
browser cases plus 42 final editing-review/checkpoint cases, totaling 129 distinct
browser cases in Chromium/Firefox/WebKit. The latter include all three exact
accepted-A default comparisons. Before testing reproduced five failures. The first
implementation run passed 101/102; its sole failure was a test's incorrect assumption
that Firefox scrollLeft must be zero at the start. It may scroll away the 2px
padding without hiding text. The corrected assertion checks the caret at index zero
and that scrolling does not exceed the padding; the rerun passed all 42 cases.

Inspected before/after left creation at 100%/200%, overflow, all three editing
reference comparisons, and representative root/checkbox editors at 150%. No new
visual discrepancy remains in this scope. Updated requirements, plan, API, demo
help, testing and acceptance. New captures preserve previous evidence and accepted
baselines. [Report, logs, geometry and screenshots](evidence/milestone-b/editing-adjustments/report.md).

Next: user stage-5 product review. Run `pnpm dev` and follow the report's four
exercises. Full release/browser workload and real OS IME/manual assistive technology
checks were not rerun; existing milestone C/D gaps remain unchanged.

## B editor sizing and baseline — 2026-09-08

Implemented the approved follow-up: measure eight Ms in the current font, plus
padding/borders (86px at default 12px Arial), for new nodes and existing nodes with
no visible children. Existing expanded parents use the selection rectangle's width.
Every new node, including an inserted parent, uses the new-node width. Both sizing
paths are viewport-bounded and shared by F2, click, typing and API editing.

The lower 1px border is centered on the branch line, retaining the measured text
origin. The default single-line frame is now 20.5px high. Existing short left-side
labels retain their text position using adjustable padding; multiline rows remain
left aligned. Expanded-parent padding keeps checkbox space visible. Root retains
its label-aligned height because it has an ellipse rather than a bottom branch line.
The frame stays fixed during typing, scrolling multiline/long text internally.

Based on `13a5f88`; tested task changes are in the commit containing this entry and
[report](evidence/milestone-b/editor-sizing/report.md). Passed: typecheck/build,
114 unit tests, 105 distinct sizing/editing/checkpoint browser cases across three
engines, including 3 exact accepted-A PNG comparisons, and whitespace checks.
The browser run passed 104/105; one WebKit case lost `window.primary` during a demo
source update, consistent with Vite reloading the page. It passed the isolated
rerun with stable source files. No assertion/tolerance was relaxed. Pre-fix sizing
coverage failed all four Chromium cases; the focused sizing run then passed all 12.

Measured zero vertical text-origin difference at 100%/150%/200% in every engine.
Inspected before/after parent width/baseline, leaf/collapsed, new-node, editing
reference, multiline scrolling, root and checkbox screenshots. Previous images and
accepted baselines remain unchanged; new images are product-review candidates.
Requirements, plan, API, demo evidence link, testing and acceptance are current.
Next: continue user review at stage 5. Full suite/workload, OS IME and later release
checks were not rerun; the previously documented milestone C/D gaps remain.

## B focus frame and controls — 2026-09-08

Implemented the approved follow-up: remove the focused widget outline while keeping
keyboard focus/active-descendant semantics; Ctrl+Space toggles checkbox selection
on every platform, with Cmd+Space unhandled; clicking a collapsed circle expands
that node on release while preserving selection. Marker geometry is checked through
the existing local/world pointer path, including root and mirrored branches. A
marker press has its own state, so dragging away, cancellation and read-only mode
cannot expand or select the target. Effective expansion uses the shared command
path, producing one undoable change. Textarea keyboard routing remains native.

Based on `f2fdcfa`; tested task-only changes are in the commit containing this
record and [report](evidence/milestone-b/focus-controls/report.md). Passed:
typecheck/build, 114 unit tests, 90 focused interaction/editing browser cases,
3 exact accepted-A PNG comparisons and whitespace checks. The pre-fix new tests
failed 6 Chromium cases and passed the existing Windows Ctrl+Space case. Final
checks passed without changed tolerances or disabled assertions.

Inspected focused-widget and expanded-child images in all engines; prior focus
image retained for before/after comparison. Requirements, plan, API, demo help,
testing and acceptance are updated. Previous images/default baselines are preserved.
Next: user stage-5 review. Full suite/workload, actual stable-browser, real OS IME,
screen-reader and packaged-consumer release checks were not rerun; prior C/D gaps
remain. The demo still runs with `pnpm dev` or the existing 5174 server.

## B product acceptance — 2026-09-08

The user explicitly accepted Milestone B at `4209b2a`, including the final reviewed
behavior and appearance after the navigation, editing and direct-control corrections.
[Acceptance record](acceptance.md#milestone-b-stages-45). Historical pending-review
notes above are superseded. Superseded screenshots remain historical; accepted A
baselines and all existing evidence are preserved.

This update changes acceptance/progress/testing documentation only. `git diff --check`
passed; implementation tests were not rerun. The last implementation checks remain
114 unit tests, 90 browser interaction/editing cases and 3 exact default comparisons
as recorded in the final controls report. No new test pass is claimed here.
Next: await authorization for milestone C. Stages 6–9 and their release checks
remain unstarted/unverified as previously recorded.
