# Testing and demo

Use Node 22.12+ (verified with Node 24.2.0) and pnpm 10.28.1.

- `pnpm install --frozen-lockfile`: install pinned tools.
- `pnpm dev`: open the local URL printed by Vite, normally http://127.0.0.1:5173.
  The B handover server uses http://127.0.0.1:5174 because 5173 was occupied.
- `pnpm typecheck`: strict TypeScript checks for source, demo, and tests.
- `pnpm build`: ESM, declarations, and explicitly exported CSS in `dist/`.
- `pnpm test`: pure Vitest tests.
- `pnpm exec playwright install`: install Chromium, Firefox, and WebKit if absent.
- `pnpm test:browser --workers=1`: recorded final B gate; limits contention without
  changing coverage, assertions or timeouts.
- `pnpm test:browser`: run all three Playwright engines, start Vite automatically,
  capture current screenshots under `docs/evidence/milestone-b/`, retain failure traces in
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
