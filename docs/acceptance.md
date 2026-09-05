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

**Product review:** appearance and geometry of the reference map.

- Compare the supplied default image and actual rendered fixture side by side.
- Check compact spacing, mirrored branches, text above lines, shared curved
  junctions, single-child chains, root ellipse, selection, and collapse marker.
- Demonstrate additional multiline, empty-label, and checkbox geometry fixtures.
- Show two isolated mounts, package output, and the stage 1–3 automated gates.
- Run the target workload as an early diagnostic; retain final profiling for D.

Stage 1 passed: build (ESM/declarations/CSS), strict typecheck, 1 unit test, and
3 browser tests across Chromium/Firefox/WebKit. Two mounts, real Tab focus, and
independent teardown verified. [Screenshot](evidence/milestone-a/stage1-chromium.png)
captured and inspected. Tested stage-1 working tree based on `79b9d86`.
[Commands and environment notes](testing.md). Stage 2–3 evidence pending.
User decision: pending.

## Milestone B: stages 4–5

**Product review:** fluent keyboard creation, selection, navigation, and editing.

Use the reference map for a short repeatable exercise:

1. Create and label root branches on both sides and nested children.
2. Navigate across groups and enter the visually central child on each side.
3. Extend and contract selection, then pan and zoom around the pointer.
4. Edit a multiline label; verify geometry stays frozen until commit.
5. Cancel creation under a collapsed parent and cancel insert-parent creation;
   verify structure, collapse state, selection, and history are restored.
6. Commit by clicking another node and verify the resulting selection and focus.

Include editing screenshot comparison and regression against accepted default
appearance. Exercise gestures in the browser as well as command/model tests.

Evidence: not run. User decision: pending.

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
