# Milestone acceptance and evidence

This record supplements [the implementation plan](impl-plan.md#11-verification-and-acceptance-mapping).
Its stage gates and all 18 requirement acceptance criteria still apply.
Passing tests establishes technical evidence; product acceptance also requires
review of the actual appearance and editing experience.

## Evidence for each handover

Codex fills in each milestone's record with:

- Date, commit/revision and any uncommitted changes, browser/OS, and relevant
  viewport, zoom, fonts, and device scale for visual comparisons.
- Exact commands and fixtures used; checks marked passed, failed, or not run.
- Runnable demo instructions and links to screenshots, comparisons, traces, or
  reports. Identify artifact locations and retain review evidence with the project
  or a durable CI artifact link; temporary files alone are not a lasting record.
- Relevant requirement criteria and stage gates, including regression results.
- Known discrepancies, unverified checks, and a short reproduction for each defect.
- User decision and requested corrections, recorded only after actual feedback.

Use the supplied images as reference material and recreate their tree in the demo.
Review comparable crops and scale; document unavoidable font rasterization
differences. Regression baselines come from the accepted widget rendering, with a
recorded environment. A passing self-generated baseline does not establish fidelity.
The arrow and red annotation in the drag reference are explanatory, not widget UI.

## Milestone A: stages 1–3

**Accepted 2026-09-07:** the user explicitly accepted Milestone A, including its
default visual baseline at `253b99d`. The approved browser-specific images are
preserved in [checkbox-size evidence](evidence/milestone-a/checkbox-size/report.md).
Historical pending decisions below are superseded by this acceptance. Milestone B
is authorized; its editing appearance requires a separate product review.

**Product review:** appearance and geometry of the reference map.

- Compare the supplied default image and actual rendered fixture side by side.
- Check compact spacing, mirrored branches, text above lines, shared curved
  junctions, single-child chains, root ellipse, selection, and collapse marker.
- Demonstrate additional multiline, empty-label, and checkbox geometry fixtures.
- Show two isolated mounts, package output, and the stage 1–3 automated gates.
- Run the target workload as an early diagnostic; retain final profiling for D.

**2026-09-07 checkbox-size trial:** the user requested expanding the checkbox
1px in each direction. The candidate uses 13×13px squares (previously 11×11px),
retaining the 4px label gap and vertical optical alignment. Visual acceptance is
pending. [Trial report](evidence/milestone-a/checkbox-size/report.md),
[larger checkbox fixture](evidence/milestone-a/checkbox-size/geometry-chromium.png).

**2026-09-07 correctness review:** all four P2 findings were independently
reproduced and fixed after the user's go-ahead. Runtime command rejection preserves
state/history/events, reentrant operations run FIFO, final newline rows render,
and host transforms no longer contaminate local measurements. Technical checks
passed: build/typecheck, **79 unit tests**, **54 browser cases**. Revised product
review remains pending; no later stage was started.

[Current report and commits](evidence/milestone-a/correctness/report.md),
[reference comparison](evidence/milestone-a/correctness/comparison-chromium.png),
[trailing-row fixture](evidence/milestone-a/correctness/newlines-chromium.png),
[scaled-host fixture](evidence/milestone-a/correctness/scaling-chromium.png).
Earlier evidence is preserved unchanged.

**2026-09-07 checkbox-gap follow-up:** the user said the clearance correction
looks good and requested 1px more horizontal space between checkbox and text.
The gap is now 4px. [Checkbox-gap report](evidence/milestone-a/checkbox-gap/report.md),
[checkbox fixture](evidence/milestone-a/checkbox-gap/geometry-chromium.png).
The updated candidate remains at stage 3 for review; later stages are not authorized.

**2026-09-07 descender-clearance follow-up:** implemented after the user's go-ahead.
Arial is retained; text moves up 1.5px and root subtree spacing increases separately.
Two fully clear rows now separate descenders from the line in all three engines,
including every faint edge; the gap above N1 and inner row pitch are preserved.
[Current report](evidence/milestone-a/clearance/report.md),
[comparison](evidence/milestone-a/clearance/comparison-chromium.png),
[pixel measurements](evidence/milestone-a/clearance/ink-spacing.json).
Typecheck/build, 56 unit tests, 36 browser cases, and pixel checks passed.
**Visual acceptance remains pending.** Earlier evidence remains unchanged.

**2026-09-07 spacing follow-up:** the user requested a larger gap above N1,
a smaller text-to-line gap, and higher checkboxes. These corrections are complete;
**visual acceptance remains pending**. [Previous report](evidence/milestone-a/spacing/report.md),
[comparison](evidence/milestone-a/spacing/comparison-chromium.png),
[checkbox alignment](evidence/milestone-a/spacing/geometry-chromium.png),
and [native gap measurements](evidence/milestone-a/spacing/ink-spacing.json).
Build/typecheck, 54 unit tests, and 36 browser cases passed. Final screenshots
were inspected in all three engines. Earlier candidates remain unchanged.

**2026-09-07 first correction review:** the user requested smaller, native-DPI
proportions, a filled selected root ellipse, unobstructed selection lines, removal
of the dotted node focus outline, and #339933 checked backgrounds. All five
corrections are implemented; **revised visual acceptance remains pending**.

[First correction report](evidence/milestone-a/100dpi/report.md),
[native-size comparison](evidence/milestone-a/100dpi/comparison-chromium.png),
[geometry/selection lines](evidence/milestone-a/100dpi/selection-lines-chromium.png).
Build/typecheck, 54 unit tests, and 33 browser cases passed. The earlier evidence
below is retained unchanged for before/after review; it is not an approved baseline.

**Technical status: complete (2026-09-05). User decision: pending.**

Stages 1–3 are implemented. All three supplied reference images were opened and
inspected. Final gates passed: ESM/declarations/CSS build, strict typecheck,
54 unit tests, and 30 browser cases across Chromium/Firefox/WebKit. The
1,000-total/500-visible mixed-depth diagnostic ran in all three engines.

- [Full milestone report, environment, gates, known gaps, and next action](evidence/milestone-a/report.md)
- [Side-by-side reference comparison](evidence/milestone-a/comparison-chromium.png)
- [Geometry fixture](evidence/milestone-a/geometry-chromium.png) and
  [multiline root](evidence/milestone-a/root-multiline-chromium.png)
- [Build/type/unit log](evidence/milestone-a/checks.txt),
  [browser log](evidence/milestone-a/browser-checks.txt),
  [package output](evidence/milestone-a/package-output.json)
- [Run instructions](testing.md), [current API](api.md), [revision/status](progress.md)

Stage 1 commit: `7ea0658` (1 unit / 3 browser tests). Stage 2 commit: `a165cca`
(45 unit / 9 browser tests). Stage 3 tested implementation and durable evidence: `ab99572`.
The final handover commit updates documentation references only; see progress.

The report explains before/after visual refinement, residual font/raster differences,
and all later-stage gaps. Images are candidate review evidence; no approved visual
regression baseline exists. Stop at this product checkpoint as requested.

## Milestone B: stages 4–5

**Accepted 2026-09-08 at `4209b2a`.** The user explicitly stated:
“Milestone B is accepted, record that acceptance”. This accepts the completed
stage-4/5 navigation, selection, movement, viewport, editing and creation experience,
including the reviewed navigation, editor sizing/alignment, focus, shortcut and
collapsed-circle corrections and their final appearance.

The [final controls evidence](evidence/milestone-b/focus-controls/report.md) and
[editor sizing evidence](evidence/milestone-b/editor-sizing/report.md) identify the
reviewed implementation and screenshots. Historical pending decisions below and
in earlier handover reports are superseded by this acceptance; superseded candidate
images remain historical. Milestone A's accepted default baselines remain unchanged.

This records product acceptance, not new test execution or completion of later
release gates. Milestone C (stages 6–7) was subsequently authorized and implemented; its current
review/evidence record follows below. Stages 8–9 and their release checks remain outstanding.

**Product review:** fluent keyboard creation, selection, navigation, and editing.

**2026-09-08 focus and controls:** focused widgets have no frame, Ctrl+Space toggles
checkboxes on macOS and other platforms, and clicking a collapsed circle expands
its node without changing selection. Typecheck/build, 114 unit tests, 90 browser
interaction/editing cases and 3 exact accepted-default comparisons passed.
[Latest report, before/after screenshots and results](evidence/milestone-b/focus-controls/report.md).
Focused/expanded screenshots were inspected in all engines; product review remains
at stage 5.

**2026-09-08 editor sizing/baseline:** new nodes and existing leaves/collapsed nodes
now fit eight Ms; existing expanded parents match the selection width. Bottom borders
meet branch lines and text keeps its position on F2. Typecheck/build, 114 unit tests,
105 distinct browser cases and exact accepted-default comparisons passed. Inspected
before/after images and measured zero vertical text-origin movement across engines.
[Editor sizing report, screenshots, measurements and checks](evidence/milestone-b/editor-sizing/report.md).
These editing images await user acceptance; the checkpoint remains stage 5.

**2026-09-08 editing adjustments (superseded sizing):** the four approved changes are implemented:
typing replaces the active label, horizontal scrollbars stay hidden, empty creation
editors are 100px wide, and left-side editors expand outward from the label's right
edge. Typecheck/build, 114 unit tests and 129 distinct browser cases passed across
Chromium/Firefox/WebKit, including the three exact accepted-A comparisons.
[Previous report, before/after screenshots and checks](evidence/milestone-b/editing-adjustments/report.md).
The revised editing images are review candidates; B product acceptance is pending.

**2026-09-08 root navigation:** Up/Down and Shift+Up/Down now do nothing when
root is active, including a multiple selection. Typecheck/build, 114 unit tests,
36 focused browser cases and 3 exact approved-default comparisons passed. Root
screenshots inspected across Chromium, Firefox and WebKit.
[Root navigation report and evidence](evidence/milestone-b/navigation-root/report.md).
Stage-5 product acceptance remains pending.

**2026-09-07 shallower fallback:** the approved priority is siblings, same depth,
then nearest shallower node outside the ancestor chain, always on the same side.
All ten reference examples pass. Typecheck/build, 114 unit tests, 30 focused browser
cases and 3 exact approved-default regressions passed.
[Fallback report and evidence](evidence/milestone-b/navigation-fallback/report.md).
Product acceptance remains pending; previous results below are retained history.

**2026-09-07 navigation correction:** updated to the user's confirmed sibling-first,
same-depth rule, including Single child + Down → N1. Build/typecheck, 110 unit tests,
27 interaction/navigation browser cases and 3 exact approved-default regressions
passed. [Correction report, results and screenshots](evidence/milestone-b/navigation/report.md).
B product acceptance remains pending; earlier handover results below are historical.

Use the reference map for a short repeatable exercise:

1. Create and label root branches on both sides and nested children.
2. Navigate siblings, continue across groups at the same depth, and enter the
   visually central child on each side. Verify all ten movements in requirements
   §8.1, including C2 + Down → N4, Child of a single child + Up → C, and C2.1 + Up
   → Child 1. These shallower fallbacks apply only when no sibling/same-depth node
   exists in that direction. Ancestors/deeper nodes are skipped; exhausted edges
   stay selected. Use Shift to extend through a fallback and retrace same-depth
   ranges to check contraction. Select root and press Up/Down, with and without
   Shift: selection and viewport must remain unchanged. Repeat in read-only mode.
3. Extend and contract selection, then pan and zoom around the pointer.
4. Type with a selected node: its text is replaced from the first character.
   Commit and undo once; repeat and Escape to restore the original. F2 still
   selects the existing text. Type a long line: no horizontal scrollbar appears,
   and the caret remains reachable at both ends. Edit a multiline label and verify
   geometry stays frozen until commit. Select Child 1 and press Enter: the empty
   editor fits eight Ms and grows leftward from the new label's right edge.
   F2 on One/Child2 matches the gray selection width; F2 on a leaf or collapsed
   node uses max(eight-M default, node width), following the C review correction.
   Watch the text as F2 opens: it must not jump. The lower
   border must join the branch line with no step. Repeat on both sides and at
   150%/200% zoom; Escape restores the creation state.
5. Cancel creation under a collapsed parent and cancel insert-parent creation;
   verify structure, collapse state, selection, and history are restored.
6. Commit by clicking another node and verify the resulting selection and focus.
7. Use Primary-modifier+Up/Down on a contiguous sibling block; move one position
   and wrap the whole block at both edges without reversing its order. Selecting
   all applicable siblings is a no-op.
8. Move inward on both branches to promote a block immediately after its parent.
   Promote into the root and verify inherited side. Move existing root children
   inward to flip sides and append after the destination side's last child,
   including an empty destination. Verify direction after a flip follows the new
   side. Interleaved root child arrays use same-side adjacency and wrapping.
9. Verify selections with holes, mixed parents, mixed root sides, the root, or
   ancestor/descendant pairs cannot move. Outward arrows do nothing. No-op keys
   preserve document, selection, viewport, and history without plain navigation.
10. Verify each effective move retains selected IDs and the active node, reveals
    the moved selection, emits one document change, and undoes/redoes in one step.
    Check read-only rejection and normal textarea behavior for these shortcuts.
11. Focus the map with the keyboard: no widget frame appears, but arrows and F2
    work. In the checkbox fixture press Ctrl+Space (also on macOS): only selected
    existing checkboxes toggle. Select a different node/group, then click the
    collapsed circle: its children appear while selection stays unchanged. Undo
    once restores collapse. Repeat on the left, at zoom, and in read-only mode.

Include editing screenshot comparison and regression against accepted default
appearance. Exercise gestures in the browser as well as command/model tests.
Keyboard movement extends requirement acceptance criterion 3 and stage 4; use
Command on macOS and Ctrl elsewhere. The approved movement requirements are now
implemented and covered by pure rules and actual browser key input.

**Technical status: complete (2026-09-07). User decision: pending.**

Stages 4–5 passed strict typecheck/build, **101 unit tests**, **150 browser cases**
in Chromium/Firefox/WebKit, and whitespace checks. New editing screenshots were
inspected; all three accepted A default PNGs match byte-for-byte in the original
page geometry. B editing images remain candidates awaiting this product review.

- [Full report, environment, exercise instructions, fixes and known gaps](evidence/milestone-b/report.md)
- [Editing comparison](evidence/milestone-b/editing-comparison-chromium.png),
  [frozen multiline buffer](evidence/milestone-b/editing-multiline-chromium.png),
  [committed multiline](evidence/milestone-b/committed-multiline-firefox.png)
- [Approved-default regression](evidence/milestone-b/regression-reference-chromium.png)
- [Build/type/unit results](evidence/milestone-b/checks.txt),
  [full browser results](evidence/milestone-b/browser-checks.txt)
- [Revision/next action](progress.md#b-stage-5-handover-2026-09-07), [run instructions](testing.md), [API](api.md)

The demo includes the reference exercises, event/selection/history state, independent
checkbox geometry, read-only mode, and interleaved root sides. Later clipboard/link/drag,
menu, packaged-consumer, actual stable-browser, screen-reader and final performance
checks remain unimplemented or unverified as recorded; no release gate is waived.

## Milestone C: stages 6–7

**Complete and accepted on 2026-09-10 at `bb4145b`.** The user accepted the stage-7
product checkpoint, including all reviewed follow-ups and final behavior/appearance.
[Final review evidence](evidence/milestone-c/review-fixes/report.md) identifies the
latest implementation checks and images. Historical pending-review notes in earlier
reports are superseded; before/intermediate images remain historical. Existing
accepted baseline files are preserved. This records acceptance, not new test
execution or completion of milestone-D release gates.

**2026-09-10 review fixes:** physical shifted-zero fit, editor visibility on host
resize, and FIFO viewport listener/API handling are implemented. Typecheck/build,
163 unit tests and 267 browser cases passed, including the three exact accepted-A
image comparisons. Resized editor/reference screenshots were inspected.
[Current report, checks and screenshots](evidence/milestone-c/review-fixes/report.md).

**2026-09-09 clipboard indentation:** copy uses four spaces; paste detects two/four
spaces per paste and accepts tabs/mixed prefixes. Typecheck/build, 163 unit tests
and 79 browser cases passed (2 documented permission skips). Native clipboard and
screenshots were checked in all engines. [Report and evidence](evidence/milestone-c/clipboard-indentation/report.md).

**2026-09-09 drag review (accepted at `4e46cea`):** valid drops use a regular arrow; inward halves insert
before/after as siblings according to vertical position, mirrored on left branches.
Typecheck/build, 147 unit tests and 126 focused browser cases passed, including all
three exact accepted-default comparisons. Screenshots were inspected in all engines.
[Current changes, screenshots and verification](evidence/milestone-c/drag-review/report.md).

**2026-09-08 review corrections (technically complete):** the user approved blue
(#0000EE) URL labels without text underlines, and leaf/collapsed editors at least
as wide as the rendered node (retaining the eight-M minimum and viewport cap).
Passed typecheck/build, 145 unit tests and 178 browser cases with 2 documented
permission skips, including all three exact accepted-default comparisons.
Screenshots were inspected in all three engines.
[Report, before/after images and checks](evidence/milestone-c/link-editor-review/report.md).

**Product review:** clipboard and predictable restructuring.

1. Copy and paste mixed checkbox/multiline subtrees, then undo and redo. Copy uses
   four spaces per level. Paste two-space, four-space, tab and mixed outlines;
   verify hierarchy and atomic rejection of odd counts/depth jumps. Include escaped
   literal leading spaces and empty labels.
2. Select multiple nodes and drag before, after, into a node, and across root sides.
3. Verify each drop result is clear from its gradient before release. In the half
   nearest the parent, upper/lower positions insert before/after; mirror on the left.
   Valid drops show an arrow, invalid/no-op drops keep the prohibited cursor.
4. Include ancestor/descendant selections, collapsed targets, invalid cycles,
   same-position drops, Escape cancellation, and edge autopan.
5. Verify one-step undo for each completed move and paste.
6. Exercise URL-label versus branch-line modifier clicks.

Include drag-reference comparison and browser evidence for clipboard denial,
invalid text, and delayed completion after edits or document replacement. Test
available real clipboard paths alongside deterministic failure/staleness stubs.

**Original milestone-wide verification (2026-09-08):**

Stage 6 is `3b2f7f8`; the original stage-7 implementation is `9ade849`.
The accepted implementation, including subsequent corrections, is `bb4145b`.
The documentation-only handover state is recorded in [progress](progress.md#c-stage-7-handover--2026-09-08).
Passed: strict typecheck, ESM/CSS/declaration build, **145 unit tests**, **346 browser
cases** across Chromium/Firefox/WebKit, exact accepted-A PNG comparisons in every
engine, workload diagnostic and whitespace checks. Two Chromium-only async
permission-grant counterparts are explicitly skipped; native clipboard C/X/V works
in all three engines. No required release check is represented as completed.

- [Full report, commands, environment, review exercises, corrections and known gaps](evidence/milestone-c/report.md)
- [Drag reference comparison](evidence/milestone-c/stage7/comparison-chromium.png),
  [before](evidence/milestone-c/stage7/before-chromium.png),
  [after](evidence/milestone-c/stage7/after-chromium.png),
  [child](evidence/milestone-c/stage7/child-chromium.png),
  [mirrored/zoomed drag](evidence/milestone-c/stage7/left-zoom-chromium.png)
- [Mixed clipboard paste](evidence/milestone-c/stage7/clipboard-chromium.png),
  [denial/events](evidence/milestone-c/stage7/clipboard-denied-chromium.png),
  [build/type/unit results](evidence/milestone-c/checks.txt),
  [full browser results](evidence/milestone-c/browser.txt)

All supplied images and current default/edit/drag comparisons were inspected.
Softened the drag gradient against the reference and corrected the demo clipboard
fixture's initial zoom so the pasted descendants are visible. Before/after images
and failure corrections are retained in the report. Accepted A/B artifacts were
preserved; final C appearance is accepted at `bb4145b`. Superseded images remain
historical rather than becoming replacement baselines.

Demo: http://127.0.0.1:5175/; fresh start: `pnpm dev`. Use the reference selection,
clipboard/link fixture, API buttons/event log and separate drag comparison.
No known C functional defect remains after verification. Menus, final host
integration, packaged consumer, actual stable browsers, screen readers and final
performance validation remain stages 8–9. Next: await authorization for milestone D.

## Milestone D: stages 8–9

**Product review:** complete widget in a realistic host and release readiness.

- Verify menu and focus behavior, public API/events, read-only mode, replacement,
  two-instance isolation, and teardown with active/pending interactions.
- Install the built package into a separate minimal consumer and exercise exports,
  declarations, stylesheet, mounting, and cleanup.
- Run the full suite and account for all 18 acceptance criteria with evidence links.
- Record actual stable Chrome, Edge, Firefox, and Safari verification separately
  from Chromium/Firefox/WebKit automation.
- Record VoiceOver/Safari and NVDA/supported-Windows-browser manual checks.
- Profile the deterministic 1,000-total/500-visible workload using the plan's
  input-to-paint, frame behavior, full-relayout, median/p95, and cold-load measures.
- Repeat the B/C user exercises and inspect final default/edit/drag appearance.

Unavailable release checks remain not run, with the required environment and next
action recorded. Do not declare release validation complete while required evidence
is missing. Document any user-approved change to release scope explicitly.

**Implementation is at the stage-9 product checkpoint. User decision: pending.**

Latest menu correction after review of `64d273a`: focus paint appears only after
Up/Down, resets on reopening, and shortcut hints are lighter than labels. Passed
typecheck/build, 163 unit tests, 48 menu/integration cases and three exact accepted
default-image comparisons. Initial/navigated three-engine screenshots inspected;
visual acceptance remains pending. [Current evidence](evidence/milestone-d/menu-focus/report.md).

Context-menu appearance follow-up authorized on 2026-09-10: grouped separators,
Delete with creation, 4px corners, platform shortcut hints and lighter disabled
labels/hints are implemented. Passed typecheck/build, 163 unit tests, 42 focused
browser cases and three exact accepted-default comparisons. Inspected the new
three-engine screenshots; acceptance is pending.
[Current menu review, before/after images and checks](evidence/milestone-d/menu-review/report.md).

Final verification: typecheck/build, 163 unit tests and 490 browser cases passed
with two documented clipboard-permission skips. All exact accepted-default images
passed; the isolated packaged consumer passed in three engines. Installed Chrome
152 passed 98 cases plus 12 final lifecycle/menu cases.

Stage 8 is technically complete; stage-9 release tooling, profiling, packaged
integration and review fixtures are implemented. Required unavailable release/manual
checks remain not run, so release validation is **not complete**.

- [Complete D report and all 18 acceptance criteria](evidence/milestone-d/report.md)
- [Final full browser gate](evidence/milestone-d/browser.txt)
- [Stage-8 menu/API evidence](evidence/milestone-d/stage8/report.md)
- [Final lifecycle/API corrections](evidence/milestone-d/integration.txt)
- [Default comparison](evidence/milestone-d/regression/comparison-chromium.png),
  [editing comparison](evidence/milestone-d/regression/editing-comparison-chromium.png),
  [drag comparison](evidence/milestone-d/regression/drag-comparison-chromium.png),
  [keyboard menu](evidence/milestone-d/regression/menu-keyboard-chromium.png)
- [Separate installed-tarball consumer](evidence/milestone-d/package/result.json)
- [Performance methodology, samples and limits](evidence/milestone-d/performance/report.md)
- [Actual browser / manual check matrix](evidence/milestone-d/installed-browsers/report.md)

Demo: http://127.0.0.1:5173/ (`pnpm build` then `pnpm dev`). It contains menus,
all accepted A/B/C fixtures and gestures, reference comparisons, event/state display,
valid/invalid host replacement, snapshot inspection, read-only and menu-disabled
routes, repeated mounting/destruction in the public-package integration example,
and the isolated workload. The D report gives reproducible product exercises.

Existing default/edit/drag appearance remains accepted through C. New menu and
stage-9 screenshots are review candidates; no accepted baseline or supplied image
is overwritten. Stage-9 product acceptance is separate from all technical passes.
Required gaps: latest stable Chrome/Edge/Firefox, actual Safari, VoiceOver/Safari,
NVDA/Windows, actual OS IME and physical input-to-display/manual smoothness. Installed
Chrome 152 automation is additional evidence, not the latest stable Chrome gate.
No scope reduction or release waiver is inferred from this handover.

### B stage-4 interim evidence

Stage-4 implementation and checks are recorded in [progress](progress.md#b-stage-4-checkpoint-2026-09-07).
Default PNGs remain byte-identical to the three accepted A engine images. This interim record is superseded by the complete stage-5 evidence above.
