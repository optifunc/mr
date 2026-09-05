# Milestone A: stage-3 product checkpoint

Date: 2026-09-05. Technical status: complete. **User visual acceptance: pending.**
Tested implementation/evidence revision: `ab99572` (stage 3), following `a165cca`
(stage 2) and `7ea0658` (stage 1). The final handover commit updates documentation
references only; see [progress](../../progress.md). No supplied reference image was changed.

## Run and review

Run `pnpm install --frozen-lockfile`, then `pnpm dev`, and open
http://127.0.0.1:5173. The page contains the live reference tree, an independent
geometry map, and the live side-by-side comparison. Demo buttons exercise selection,
collapse/expand, undo, and replacement through the public facade. `/?workload`
shows the diagnostic fixture. [API and checkpoint limits](../../api.md).

- [Side-by-side Chromium comparison](comparison-chromium.png)
- [Firefox comparison](comparison-firefox.png), [WebKit comparison](comparison-webkit.png)
- [Geometry fixture](geometry-chromium.png), [multiline root](root-multiline-chromium.png)
- [Focused selection](focus-chromium.png), [isolated mounts](mounts-chromium.png)
- [Before refinement](comparison-before-refinement.png)

The supplied default image is 1130×598, displayed at 60% as 678×359. The candidate
uses 14.5px Arial, 18px line height, device scale 1, and 100% widget zoom. The
comparison-only scene translates the root to (238,159) for alignment. Normal mounts
center the root. Comparison capture viewport is 1440×1200; ordinary checks and
workload use 1400×1000. The provided editing and drag images were also opened and
inspected; their interaction overlays belong to milestones B/C. The drag image's
red arrow/text are annotations, not UI to implement.

The permanent fixture reproduces all 21 visible labels, both sides, sibling order,
three-child fan, single-child chain, nested N3 branch, and collapse marker. Since
the supplied raster cannot reveal collapsed content, a deterministic hidden child
is included solely to represent that collapsed subtree; it is never rendered.

## Gates and evidence

| Check | Outcome | Evidence |
|---|---|---|
| Stage 1 package: ESM, declarations, CSS | Passed | `pnpm build`; [output manifest](package-output.json), [gate log](checks.txt) |
| Strict source/demo/test types | Passed | `pnpm typecheck`; [gate log](checks.txt) |
| Stage 2 model/transaction gates | Passed | 46 model tests + 1 contract test; [test source](../../../tests/unit/model.test.ts), [gate log](checks.txt) |
| Stage 3 pure layout gates | Passed | 7 tests; [test source](../../../tests/unit/layout.test.ts), [gate log](checks.txt) |
| Browser gates in Chromium/Firefox/WebKit | Passed | 30 cases total; [browser log](browser-checks.txt), [tests](../../../tests/browser) |
| Screenshot capture and assistant inspection | Passed | All three final comparisons, geometry, focus, workload, and multiline-root captures inspected |
| User visual acceptance / approved baselines | Pending | No user approval recorded; all images are candidates |
| Early 1,000-total/500-visible diagnostic | Passed (counts and run) | [Chromium samples](workload-chromium.json), [Firefox](workload-firefox.json), [WebKit](workload-webkit.json) |

Unit coverage includes malformed shapes, duplicate/invalid IDs, cycles/shared
objects, schema-only detached snapshots, a 12,000-level tree, atomic host-ID
failures, root protection, side-aware insertion/wrapping, checkbox inheritance,
ancestor normalization, multi-parent moves/cycles/no-ops, collapsed destinations,
selection restoration, bounded patch history/redo invalidation, and every current
mutation in read-only mode. Layout tests cover non-overlap, exact mirroring under
equal measurements, determinism, hidden exclusion, stable order, single-child
rise, multiline/empty geometry, and a 5,000-level tree.

Browser coverage uses real mouse input on demo controls and actual Tab focus
between widget entry points, alongside API scenarios. It verifies detached event
payloads, callback failures/reentrancy, replacement atomicity, independent histories,
visible-node counts, real measured non-overlap, geometry reuse for selection/checks,
geometry invalidation for presence/fonts/theme, text safety, resize, unique DOM IDs,
root-ID reuse, hidden checkbox recreation, root ellipse containment, and teardown.
Node editing, navigation, checkbox gestures, and dragging are not claimed verified
by those demo-button checks; those gestures are assigned to later milestones.

## Visual corrections and remaining differences

The first candidate used overly sharp root bends, completely flat chains, and a
slightly smaller font. The retained [before](comparison-before-refinement.png) and
[after](comparison-chromium.png) show the broader root curves, 2px outward rise,
14.5px labels, and darker thin connectors. Subtree bounds account for that rise
and collapse markers. Empty/multiline roots now grow to contain label/checkbox
corners while staying horizontal; ordinary reference root dimensions are unchanged.

The final candidate has compact mirrored branches, labels directly above lines,
shared non-root junction origins, an outlined ellipse, gray selection, a separate
focused active outline, and an outward collapse circle. Browser screenshots were
visually inspected rather than accepted through a self-generated pixel baseline.

Remaining appearance differences for user review: the supplied raster has different
font metrics and softer/resampled strokes; Arial glyph widths and smooth SVG curves
are not pixel-identical. At the comparable scale, several branch endpoints and rows
differ by a few pixels, and the long right chain is roughly 10px shorter. No visible
label overlap, clipped label, or disconnected branch remains in the final reference
captures. These candidates require your acceptance before becoming regression
baselines.

Some Firefox captures initially had partially painted labels after scrolling or
offscreen relayout. Individual widget captures were
intact. Capturing the complete comparison in a wider viewport and letting the visible
fixtures paint for two frames resolved the evidence issue; the final Firefox image was reopened and
inspected. No screenshot tolerance was changed. After the full 30-case run, the
multiline-root capture setup was verified again with
`pnpm test:browser tests/browser/render.spec.ts --project=firefox -g "root ellipse"`
(1 passed); only capture timing changed, not assertions or widget behavior.

Initial test corrections: the reference contains **21** visible nodes (root + 5 left
+ 15 right), not the initial hand-count of 20. The Tab test now starts from a
known focused widget and asserts actual Tab reaches the next widget, avoiding a
platform-specific assumption that links participate in the same tab sequence.

## Early workload diagnostic

Hardware: Apple M2, 8 logical CPUs, 16 GB RAM, arm64, macOS 26.6.2 (25G83).
Node 24.2.0, pnpm 10.28.1, Playwright 1.58.2. Automated browsers:
Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0.

The seeded-by-construction fixture has ten mixed-depth branches, multiline labels,
checkboxes, 500 visible nodes and 500 hidden descendants. Each engine records
30 warmed samples separated by animation frames. Full refresh clears measurement
cache and includes measurement, pure layout, DOM/SVG application, and a synchronous
layout flush. Cached structural timing also includes command preparation/history.
Selection timing is synchronous API-to-layout-flush, **not input-to-paint**.

| Engine | Full refresh median / p95 (ms) | Cached structural median / p95 (ms) | Selection median / p95 (ms) |
|---|---|---|---|
| Chromium | 6.5 / 9.9 | 6.1 / 8.5 | 0.3 / 0.4 |
| Firefox | 11.0 / 20.0 | 11.0 / 19.0 | 1.0 / 2.0 |
| Webkit | 11.0 / 13.0 | 10.0 / 12.0 | 0.0 / 1.0 |

See the JSON files for exact median/p95 values, raw samples, and the first explicit
font-ready cache refresh. All measured relayout p95 values were below 100 ms on
this machine. These are early diagnostics with concurrent browser tests, not final
release profiling or timing assertions for arbitrary CI machines. Full cold
navigation/font-load, paint timing, and frame traces remain required in D.

## Known gaps and next work

- No known unresolved stage 1–3 behavioral test failures. Visual acceptance is pending.
- Milestone B (stages 4–5) is **not implemented**: node mouse selection, geometry
  keyboard navigation/ranges, pan/zoom/fit, checkbox gestures, and textarea/provisional
  creation coordination. The workload extends outside the clipped canvas at 100%;
  viewport controls are scheduled for B.
- Milestone C (stages 6–7) is **not implemented**: clipboard, URL opening, dragging,
  previews/gradients, and autopan. Editing/drag comparisons remain required there.
- Milestone D (stages 8–9) is **not run**: finalized menu/API integration, separate
  packaged consumer, actual stable Chrome/Edge/Firefox/Safari checks, VoiceOver with
  Safari, NVDA with a supported Windows browser, and final performance traces.
  WebKit automation is not Safari evidence; preliminary ARIA is not screen-reader
  acceptance. These release checks remain required and have not been waived.

Stop here for the requested stage-3 product review. After feedback and authorization
to continue, implement stage 4 and then stage 5 against the existing plan.
