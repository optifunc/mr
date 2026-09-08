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

**Product review:** fluent keyboard creation, selection, navigation, and editing.

**2026-09-08 editor sizing/baseline:** new nodes and existing leaves/collapsed nodes
now fit eight Ms; existing expanded parents match the selection width. Bottom borders
meet branch lines and text keeps its position on F2. Typecheck/build, 114 unit tests,
105 distinct browser cases and exact accepted-default comparisons passed. Inspected
before/after images and measured zero vertical text-origin movement across engines.
[Latest report, screenshots, measurements and checks](evidence/milestone-b/editor-sizing/report.md).
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
   node uses eight-M width. Watch the text as F2 opens: it must not jump. The lower
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

**Product review:** clipboard and predictable restructuring.

1. Copy and paste mixed checkbox/multiline subtrees, then undo and redo.
2. Select multiple nodes and drag before, after, into a node, and across root sides.
3. Verify each drop result is clear from its gradient before release.
4. Include ancestor/descendant selections, collapsed targets, invalid cycles,
   same-position drops, Escape cancellation, and edge autopan.
5. Verify one-step undo for each completed move and paste.
6. Exercise URL-label versus branch-line modifier clicks.

Include drag-reference comparison and browser evidence for clipboard denial,
invalid text, and delayed completion after edits or document replacement. Test
available real clipboard paths alongside deterministic failure/staleness stubs.

Evidence: not run. User decision: pending.

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

Evidence: not run. User decision: pending.

### B stage-4 interim evidence

Stage-4 implementation and checks are recorded in [progress](progress.md#b-stage-4-checkpoint-2026-09-07).
Default PNGs remain byte-identical to the three accepted A engine images. This interim record is superseded by the complete stage-5 evidence above.
