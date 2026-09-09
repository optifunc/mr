# Milestone C — stage-7 product checkpoint

**Technical status: complete (2026-09-08). Product acceptance: pending user review.**
**Latest follow-up:** [drag cursor and inward-half sibling drops](drag-review/report.md).
The earlier [blue links and minimum editor width](link-editor-review/report.md)
report records those corrections and their own checks/visual candidates.
The milestone-wide results below describe the original C checkpoint.

Stages 6–7 cover clipboard, URL links and mouse restructuring. Stages 8–9 remain
outside this checkpoint. Started with a clean tree at `b80bb9f`; stage 6 is
`3b2f7f8`. The final tested stage-7 implementation and evidence are **`9ade849`**. The
subsequent handover commit changes documentation/log formatting only. All changes
are task-related.

## Run and review

The handover demo is running at http://127.0.0.1:5175/ (5174 was already occupied).
For a fresh run, use `pnpm dev` from the repository and open Vite's printed local URL. The page is
labelled “Milestone C · stage-7 review”. It includes the unchanged reference tree,
independent geometry mount, accepted default comparison, inline editor comparison,
clipboard/link fixture, drag-reference comparison and links to these checks.

1. In the main reference map, use “Select B + C”. Drag C onto N1's top, bottom,
   then right middle edge. Inspect the gradient before each release. Undo and redo
   once per drop; check selection/history and the recent-events panel.
2. Repeat on left branches, root halves, and the collapsed node. A child drop into
   Collapsed node stays hidden; clicking its circle reveals the moved subtrees.
   Move across parents, or select both an ancestor and descendant with modifier
   clicks. The normalized forest moves once in visual order, preserving IDs.
3. Try dropping One into A, B+C after A (their current effective position), a group
   onto itself, and the inward middle of a node. No gradient means no move. Press
   Escape during a valid preview, release outside the map, or hold near an edge to
   inspect stationary-pointer autopan and cancellation.
4. Use “Load clipboard + links fixture”. Copy the selected collapsed Release node
   with Command+C on macOS (Ctrl+C elsewhere), select Paste here, then paste.
   The multiline labels, checked/unchecked boxes, literal marker/backslash/tab,
   empty label and hidden descendants are preserved. New IDs are assigned and
   pasted subtrees start expanded. Undo/redo is one transaction.
5. Use Copy/Cut/Paste buttons to exercise the asynchronous Clipboard API. A browser
   permission denial appears in Recent events and leaves the document intact.
   `canExecute` cannot predict permission. Native keyboard clipboard paths are
   also available. Cut never deletes before the write succeeds.
6. Command/Ctrl+click the URL label. Repeat on its branch/padding to toggle
   selection instead. The prose label containing a URL is plain text. Open the
   read-only demo to check that copy, links and viewport remain usable, while
   cut/paste/drag and other content operations are disabled.
7. At “Drag reference comparison”, B/C are already selected. Drag C to N1's right
   middle edge to reproduce the supplied gradient. “Reset drag comparison” restores
   this deterministic fixture. The older raster is shown at 50% beside 12px Arial
   at 100%; its red arrow/text are reference annotations, not widget UI.

## Stage gates and reproducible checks

| Check | Status / evidence |
|---|---|
| Stage 6 codec, atomic insertion, links | Passed: 135 unit tests at stage 6; [log](stage6/unit.txt) |
| Stage 6 clipboard/editing/interaction browsers | Passed: 112 cases; 2 engine-specific skips, [log](stage6/browser.txt) |
| Initial stage 7 drag browser gate | Passed: all 66 cases in Chromium/Firefox/WebKit, [log](stage7/initial-browser.txt) |
| Final strict TypeScript, ESM/CSS/declarations, unit tests | Passed: 145 unit tests; [checks](checks.txt) |
| Final complete browser suite | Passed: **346 cases**, **2 documented skips**, no failures; [log](browser.txt) |
| Supplied-reference and candidate image inspection | Default/edit/drag, mixed paste and denial captures inspected; review notes below |
| Live demo / evidence links / whitespace | Passed: [HTTP smoke](demo-smoke.json), local report-link audit, `git diff --check` |
| Accepted-A exact default regression | Passed in all three engines, exact PNG bytes; original baselines unchanged |
| 1,000-total / 500-visible workload diagnostic | Passed in all three engines; release profiling remains D |
| Product acceptance | Pending user stage-7 review; these C captures are candidates |

Raw tool-log ANSI styling and trailing whitespace were normalized, and tabs are
shown as `\t` for readable committed evidence; no test result or failure content was removed. The staged
whitespace audit found those log-format issues, which were corrected before final
handover. `git diff b80bb9f --check` verifies the complete milestone change.

Commands: `pnpm typecheck`, `pnpm build`, `pnpm test`,
`pnpm test:browser --workers=1`, `git diff --check`.
Focused commands:
`pnpm test:browser tests/browser/clipboard.spec.ts tests/browser/drag.spec.ts --workers=1`;
`pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1`.
The sandbox requires local server/browser execution permissions; initial denied
server binding was an environment restriction, then the browser run was authorized.

## Coverage and visuals

Acceptance criteria 10–12 are implemented and tested: whole-label HTTP(S) detection,
protected and cancellable opening; native and async clipboard, codec escapes and
empty lines, normalization and new IDs, permission/parse/ID failures, busy/stale
requests after edits (including undo back to old content), new/cancelled edit,
replacement, destruction, and unchanged captured destinations after selection/pan;
all drop zones and root sides, multiple parents and overlapping selection, cycles,
same-position no-ops, collapsed targets, actual capture loss/outside release,
cancellation, zoom/host scale and stationary autopan re-hit. Clipboard and drag
mutations share atomic history and normal event order (criteria 13, 16–17).
The full previous A/B suite remains regression coverage for criteria 1–9 and 14.
Explicit pastes into hidden API targets retain a visible ancestor selection while
completion identifies the new roots, rather than exposing hidden active IDs.

Native Command+C/X/V and textarea clipboard routing run in all three engines with
the real clipboard. A granted asynchronous Clipboard API path also runs in Chromium.
Firefox/WebKit cannot use Playwright's Chromium clipboard permission grant; those
two async-permission cases are explicitly skipped. Their native clipboard paths
and deterministic adapter failure/staleness cases pass; no unavailable path is
reported as passed. C does not establish actual stable Safari/Firefox validation.

- Reference comparisons: [Chromium](stage7/comparison-chromium.png),
  [Firefox](stage7/comparison-firefox.png), [WebKit](stage7/comparison-webkit.png).
- Distinguishable drop outcomes: [before](stage7/before-chromium.png),
  [after](stage7/after-chromium.png), [child](stage7/child-chromium.png).
- Mirrored zoomed feedback: [left at 200% in scaled host](stage7/left-zoom-chromium.png).
- [Autopan capture](stage7/autopan-chromium.png); stationary re-hit and immediate
  stopping are verified by actual pointer input and viewport/gradient assertions.
- [Mixed pasted forest](stage7/clipboard-chromium.png),
  [clipboard denial with events](stage7/clipboard-denied-chromium.png),
  [pasted document/selection](stage7/clipboard-chromium.json).
- Current editing/default/geometry regressions are under [regression](regression/),
  including [editing comparison](regression/editor-sizing/editing-comparison-chromium.png)
  and [exact default capture](regression/editor-sizing/regression-reference-chromium.png).
  Accepted A/B artifacts and supplied images were not overwritten.

The reference inspection checked compact branch spacing, shared curves and junctions,
label baselines/descender clearance, ellipse, gray group selection, and gradient
orientation. These retain the accepted A/B proportions. The older drag raster has
thicker/rasterized strokes and different font antialiasing; it is not a pixel
baseline. The widget's compact drag-label overlay is required new UI. Text and
branch lines remain readable over the gradient, with connectors above backgrounds.

Visual refinement: softened the darkest gradient from #aaa to #bdbdbd to match the
reference's gray edge more closely. Compare [before](stage7/before-gradient-chromium.png)
with [current](stage7/reference-chromium.png). No accepted baseline was changed.

Environment: macOS 26.6.2 (25G83), Apple M2 (8 logical CPUs), 16 GB RAM, arm64;
Node 24.2.0, pnpm 10.28.1;
Playwright 1.58.2 pinned browsers. Captures use device scale 1, default 12px Arial /
15px line height, 1400×1000 browser viewport (reference comparison 1440×1200), widget
zoom 100% unless identified otherwise. Exact versions/font details:
[Chromium](stage7/environment-chromium.json), [Firefox](stage7/environment-firefox.json),
[WebKit](stage7/environment-webkit.json). Hardware metadata is recorded by the workload harness; complete release frame
profiling remains stage 9.

## Failures, corrections and remaining limits

- The first stage-6 browser run passed 39 cases and failed 3 on a new test's
  incorrect left-first expectation. The shared rendered order places One above
  Child 1; the exact expected sequence was corrected. [Initial log](stage6/initial-browser.txt).
- Expanded C coverage initially passed 122 cases, skipped 2 and failed 2 on the
  stationary-autopan test: a narrow target left the pointer before the assertion
  could observe its gradient. A wider fixture at a slower edge position makes
  both states observable without relaxing assertions. All 3 focused engine reruns
  passed. [Initial log](stage7/autopan-timing-browser.txt), [rerun](stage7/autopan-rerun.txt).
- Routine semantics: paste expands its destination to show inserted children;
  child dragging intentionally preserves collapse. Copy can finish from captured
  text after an edit; stale cut can have written the clipboard while correctly
  rejecting deletion. Cancellation leaves viewport panning outside history.
- The first full run passed 340 cases, skipped 2 and failed 3 mount-count assertions:
  the new drag comparison adds a fifth widget. The test now expects five, then four
  after destroying the primary, preserving the exact isolation/focus assertions.
  [Initial full log](initial-full-browser.txt).
- Screenshot inspection found the clipboard fixture's Fit zoom at 330% obscured
  the pasted subtree. Its initial zoom is now capped at 100% for review; normal
  widget Fit remains unchanged. [Before](stage7/before-clipboard-zoom-chromium.png)
  and [current](stage7/clipboard-chromium.png) show the difference.
- No known functional defect remains in stages 6–7 after the final gate. Product
  review of the C appearance and interactions remains pending. No manual actual-stable-browser or screen-reader pass is claimed.
- Not run / not implemented at this checkpoint: stage-8 context menu and final
  host integration hardening; stage-9 packaged consumer, actual stable Chrome/Edge/
  Firefox/Safari, VoiceOver/Safari and NVDA/Windows, final input-to-paint/frame/full
  relayout median/p95/cold-load profiling. Real OS IME remains manually unverified
  from B. These release gates remain required; Playwright WebKit is not Safari.

Next action: user stage-7 product review. Do not begin milestone D without its
implementation authorization. Product acceptance is recorded only after feedback.

## Workload diagnostic (not the final release performance gate)

Exactly 1,000 total and 500 visible nodes rendered in all engines. Timings below
are synchronous work including DOM/layout flush, in milliseconds (median / p95).
They exclude presentation and are diagnostics, not input-to-paint claims.

| Engine | Full measurement refresh | Cached structural command | Selection |
|---|---:|---:|---:|
| chromium | 22.7 / 24.8 | 21.9 / 31.8 | 0.8 / 1.1 |
| firefox | 15.0 / 17.0 | 14.0 / 17.0 | 0.0 / 1.0 |
| webkit | 15.0 / 17.0 | 14.0 / 15.0 | 1.0 / 1.0 |

Source data, samples, cold-refresh meaning and hardware:
[Chromium](regression/workload-chromium.json),
[Firefox](regression/workload-firefox.json), [WebKit](regression/workload-webkit.json).
Full frame traces, actual cold/font-load navigation, and input-to-paint profiling
remain stage 9; no hardware-specific threshold was relaxed or added to CI.
