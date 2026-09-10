# Testing and demo

Use Node 22.12+ (verified with Node 24.2.0) and pnpm 10.28.1.

- `pnpm install --frozen-lockfile`: install pinned tools.
- `pnpm dev`: open the local URL printed by Vite, normally http://127.0.0.1:5173.
  The current C handover server URL is recorded in the C report and progress.
- `pnpm typecheck`: strict TypeScript checks for source, demo, and tests.
- `pnpm build`: ESM, declarations, and explicitly exported CSS in `dist/`.
- `pnpm test`: pure Vitest tests.
- `pnpm exec playwright install`: install Chromium, Firefox, and WebKit if absent.
- `pnpm test:browser --workers=1`: milestone C full gate; limits contention without
  changing coverage, assertions or timeouts.
- `pnpm test:browser`: run all three Playwright engines, start Vite automatically,
  capture current screenshots under `docs/evidence/milestone-c/`, retain failure traces in
  ignored `test-results/`.

Stage 1 verified all commands above except browser installation (matching browser
binaries were already available). The sandbox blocks local server binding; browser
runs require execution with local server/browser permissions. Dependency download
also required network permissions. These are environment restrictions, not test failures.

Actual stable browser and screen-reader release checks remain scheduled for stage 9;
Playwright WebKit is not actual Safari verification.

## Stage-5 review and diagnostics

- `pnpm dev`, then `/`: live reference, independent geometry mount, and live
  default and editing comparisons. Buttons expose selection, block movement setup,
  edit, collapse, undo/redo, viewport controls, interleaved sides, and reset.
- `/?readonly`: primary map rejects mutations while retaining selection/navigation/view.
- `pnpm test:browser tests/browser/editing.spec.ts tests/browser/interaction.spec.ts tests/browser/checkpoint-b.spec.ts`:
  targeted B gestures, editing screenshots, and approved A regression.
- `/?workload`: mixed-depth deterministic map with exactly 1,000 total and 500
  visible nodes (250 collapsed leaves each hide two children).
- `pnpm perf`: Chromium early workload diagnostic, writes JSON samples and a
  screenshot under `docs/evidence/milestone-b/`.
- `pnpm test:browser tests/browser/render.spec.ts --project=firefox`: targeted
  Firefox rendering verification; other projects can be selected identically.

Full browser tests also run the diagnostic in all three engines. Viewports are
1400×1000 for normal tests/workload and 1440×1200 for reference captures so the
entire 1226px-wide comparison is visible. Device scale is 1; widget zoom is 100%.
The default comparison mount translates its root to (204,159) to align with the
supplied 605×324 Windows 100% DPI image displayed at native size; normal mounts retain centered roots.

Milestone A's browser-specific default reference images at `253b99d` are approved.
The B regression test recreates the accepted A page shell and compares exact PNG
bytes, with no tolerance. This avoids shifts caused by changed demo prose and its
fractional page coordinates. These baselines are specific to the recorded macOS,
Arial and pinned Playwright browser environment; do not approve replacements merely
because another platform rasterizes differently.

Milestone B's final behavior and appearance were accepted at `4209b2a` on
2026-09-08; see the [acceptance record](acceptance.md#milestone-b-stages-45).
Earlier superseded editing captures remain historical. The supplied editing
reference is displayed at 50% of its raster dimensions beside the 100% 12px widget.
Textarea alignment is also checked beside root and checkbox labels at 150% zoom.
Never overwrite supplied references or the accepted A evidence. New captures are
written to `docs/evidence/milestone-b/`; tests retain failure traces in ignored
`test-results/`. The B report records failures, corrections and final gate results.

## Correctness review regressions

- `pnpm test:browser tests/browser/api.spec.ts`: malformed JavaScript commands,
  preserved undo/redo and event atomicity, FIFO reentrancy, callback errors,
  destruction during draining, and a 3,000-operation chain.
- `pnpm test:browser tests/browser/layout-edge.spec.ts`: trailing-newline and
  newline-only rows, root/checkbox geometry, mounting and refreshing under scaled,
  nested/nonuniform, and rotated hosts, then restoring normal scale.
- Edge-case JSON and screenshots are in `docs/evidence/milestone-b/`.
  Transform tests require exact equality of local boxes, paths, ellipse dimensions,
  and browser-rounded screen bounds before/after refresh. They do not use screenshot
  tolerances or assume infinite precision in screen-coordinate arithmetic.

## B navigation corrections

- `pnpm test:browser tests/browser/navigation.spec.ts tests/browser/interaction.spec.ts --workers=1`:
  all confirmed Up/Down examples using actual keys in editable/read-only mounts,
  sibling/depth navigation, shallower non-ancestor fallback, Shift selection,
  edges, root Up/Down no-ops (with Shift, multiple selection and API parity),
  and existing interaction regressions.
- `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1`:
  unchanged default screenshots against the approved A images.
- New navigation evidence and checks are retained under
  `docs/evidence/milestone-b/navigation-root/`; earlier corrections are retained
  in `docs/evidence/milestone-b/navigation-fallback/` and
  `docs/evidence/milestone-b/navigation/`. Earlier B records remain historical.

## B editing adjustments

- `pnpm test:browser tests/browser/editing-review.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1`:
  typing replacement/undo/cancel, modifier and read-only guards, horizontal overflow
  and native caret visibility, eight-M creation editor and outward alignment at 100%/200%,
  all four insertion bindings on left root/nested and right branches, lifecycle
  regressions, reference editing comparisons and exact accepted-A images.
- `pnpm test:browser tests/browser/editing.spec.ts tests/browser/navigation.spec.ts tests/browser/interaction.spec.ts --workers=1`:
  existing editing/navigation/interaction regressions.
- Current editing captures and logs: `docs/evidence/milestone-b/editor-sizing/`.
  Prior editing adjustments remain in `docs/evidence/milestone-b/editing-adjustments/`.
  The checkpoint capture test now writes here to preserve prior stage-5 evidence.
  Before images and the pre-fix failure log are retained alongside final candidates.

- `pnpm test:browser tests/browser/editor-sizing.spec.ts tests/browser/editing-review.spec.ts tests/browser/editing.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1`:
  current sizing/alignment and editing gate across all engines. Measures unchanged
  text origin and branch-aligned bottom border at 100%/150%/200%, eight-M width in
  12px/18px fonts, leaf/collapsed/expanded behavior, all creation bindings, frozen
  frame during multiline typing, checkbox/root positioning and accepted-default PNGs.

## Focus frame, checkbox shortcut and collapsed circles

- `pnpm test:browser tests/browser/focus-controls.spec.ts tests/browser/interaction.spec.ts tests/browser/editing.spec.ts --workers=1`:
  focused-frame removal and accessibility semantics, Ctrl+Space in simulated Mac
  and Windows platform routing, Cmd+Space no-op, native textarea routing, circle
  pointer down/release on root/left/right branches at 200%, preserved selection,
  one-step undo, drag/cancel/read-only rejection, and existing editing/interaction.
- `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1`:
  exact accepted-default comparisons across all engines.
- Current evidence: `docs/evidence/milestone-b/focus-controls/`. Focused images are
  part of the accepted B appearance at `4209b2a`; accepted default baselines and
  prior evidence are retained.

## Milestone C — stages 6–7

Run `pnpm dev` for the stage-7 review demo. “Load clipboard + links fixture” loads
mixed checkbox/multiline/empty/escaped nodes and URL/prose labels. Native clipboard
shortcuts and API buttons are both available. The recent-event panel shows
completion, errors, selection and history. The separate drag-reference mount starts
with B/C selected. Reset buttons restore each deterministic fixture. See the
[C report](evidence/milestone-c/report.md) for repeatable user exercises and limits.

- `pnpm typecheck`, `pnpm build`, `pnpm test`: strict source/demo/test types,
  ESM/CSS/declarations, and all pure model/codec/history/layout/navigation/drop rules.
- `pnpm test:browser --workers=1`: complete suite in Chromium/Firefox/WebKit,
  including exact accepted-default PNG comparison and the 1,000/500 diagnostic.
- `pnpm test:browser tests/browser/clipboard.spec.ts tests/browser/drag.spec.ts --workers=1`:
  native/async clipboard, denial/unavailability, invalid input and IDs, stale/busy
  completion, captured destinations, hidden targets, teardown, URL hit regions,
  protected/cancelled opening, all drag zones, root sides, overlapping selection,
  cycles/no-ops, collapsed targets, zoom/host scale, capture loss and autopan.
- `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1`:
  unchanged accepted default images; no new baseline is approved by this test.

Current captures go to `docs/evidence/milestone-c/stage7/` and C `regression/`
subdirectories. Historical test captures under A/B remain unchanged. C drag and
clipboard screenshots are review candidates. Failure logs, corrections, final
results and per-engine environment JSON are linked from the C report.

Native clipboard C/X/V paths run in all three engines. Chromium also tests a
granted asynchronous Clipboard API context. The Firefox/WebKit counterparts of
that permission-grant test are explicitly skipped because the grant is engine
specific; their native paths and deterministic async failure/staleness tests run.
This does not establish actual stable-browser or OS-level manual verification.
Stage-8 menu/host completion and every stage-9 packaged-consumer, actual stable
browser, screen-reader and performance release gate remain required.

## C link and editor-width review corrections

`pnpm test:browser tests/browser/link-editor-review.spec.ts --workers=1` verifies
blue links without text underlines, unchanged protected link/branch behavior,
short/wide leaf and collapsed editor sizing on both sides at 100%/150%/200%,
checkbox/multiline alignment, frozen typing frames, root leaves and viewport caps.
Review in the demo: load the clipboard/link fixture to inspect URL color; reset the
reference map and press F2 on Child of a single child or Collapsed node, then A.
Wide nodes use their node width and short nodes retain the eight-M default.

For the related regression run without overwriting prior evidence:
`MINDMAP_EVIDENCE=docs/evidence/milestone-c/link-editor-review pnpm test:browser tests/browser/link-editor-review.spec.ts tests/browser/editor-sizing.spec.ts tests/browser/editing-review.spec.ts tests/browser/editing.spec.ts tests/browser/clipboard.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1`.
The directory includes before/after candidates, measured widths and exact
accepted-default comparisons. The report records actual checks and remaining gaps.

## Stage-7 drag review correction (2026-09-09)

```sh
pnpm typecheck
pnpm build
pnpm test
MINDMAP_EVIDENCE=docs/evidence/milestone-c/drag-review pnpm test:browser tests/browser/drag.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1
```

[Drag review report](evidence/milestone-c/drag-review/report.md) retains before/after
screenshots and computed cursor/zone evidence. New pointer cases drag before/after
on both inward halves at 100% and 200% (with 0.8 host scaling), commit, undo and redo.
Existing drag coverage checks child/root zones, no-ops, cycles, cancellation,
read-only mode and autopan. Checkpoint comparisons retain exact accepted-A images.
In the demo, drag N4 to the left half of N1, or C 2.3 to the right half of C 2.1;
move above/below the vertical midpoint and check the top/bottom gradient and arrow.

## Stage-7 clipboard indentation (2026-09-09)

```sh
pnpm typecheck
pnpm build
pnpm test
MINDMAP_EVIDENCE=docs/evidence/milestone-c/clipboard-indentation pnpm test:browser tests/browser/clipboard.spec.ts --workers=1
```

[Report, sample outlines and evidence](evidence/milestone-c/clipboard-indentation/report.md).
Passed: 163 unit tests and 79 browser cases; 2 existing Chromium-only async permission
counterparts skipped. Native clipboard works in all three engines. New native cases
copy external two-space/four-space/tab/mixed text through a real textarea, paste into
the widget, verify the exact forest/undo/redo, then copy back to the textarea and
assert exact four-space output. Pure cases cover whole-paste detection, ambiguous
widths, whitespace-only lines, literal leading spaces and invalid indentation.
The full milestone and later release/manual gates were not rerun for this correction.

## Stage-7 interaction review fixes (2026-09-10)

```sh
pnpm typecheck
pnpm build
pnpm test
MINDMAP_EVIDENCE=docs/evidence/milestone-c/review-fixes pnpm test:browser tests/browser/review-fixes.spec.ts tests/browser/interaction.spec.ts tests/browser/editing.spec.ts tests/browser/api.spec.ts tests/browser/editor-sizing.spec.ts tests/browser/checkpoint-b.spec.ts tests/browser/drag.spec.ts --workers=1
```

[Review fixes report and evidence](evidence/milestone-c/review-fixes/report.md).
Passed: typecheck/build, 163 unit tests, 267 browser cases, no failures/skips;
three exact accepted-default comparisons and inspected resized-editor screenshots.
Physical `Meta+Shift+Digit0` and `Control+Shift+Digit0` must match the fitted view
and show the reference nodes within the host; unshifted zero resets zoom. Ctrl
routing uses a Win32 platform override, not a claim of real Windows verification.
Resize while F2 is active on left/right/root nodes at 100%/200%; shrink, grow, pass
through zero size, type, use native undo/redo and cancel. The textarea, selection,
buffer and frozen tree are retained. A separate provisional edit commits once.
Viewport listeners test FIFO for commands and all four public viewport methods,
coalescing, detached payloads, exceptions and destruction. Existing A default-image,
API, editing, sizing, pointer/keyboard and drag checks are included.
