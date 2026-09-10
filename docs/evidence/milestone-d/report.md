# Milestone D — stage-9 product checkpoint

**Completion recorded 2026-09-10:** milestone D was accepted by the user at
`497eff9`, including the subsequent menu and P2 review corrections.
[Accepted final checkpoint and verification](review-fixes/report.md).
The original checkpoint evidence below is historical; its pending-product-review
statements are superseded by this acceptance. Unavailable release/manual checks
retain their recorded status.

Stage 8 is committed at `87da40b`, based on accepted C (`bb4145b`) and its acceptance
record `7979ca8`. Final widget fixes are committed at `de15b91`. Stage 9 adds the packaged consumer, performance profiler, final
integration fixes, review demo and release evidence. The final milestone-wide gate passed **490 browser cases**, with **two documented
permission skips** and no failures. Strict typecheck/build and **163 unit tests**
also passed. The stage-9 commit containing this report records the tested
working-tree state (widget source at `de15b91`, plus demo/harness/package changes). **Product acceptance is
pending; release validation is incomplete where required environments are missing.**

## Review the runnable demo

Run `pnpm build` then `pnpm dev`; the handover server is
http://127.0.0.1:5173/. All controls are reversible and Reset restores the fixtures.

1. Right-click One or focus it and press Shift+F10 / Context Menu. Traverse all 13
   items with arrows, Home/End; use Enter/Space. Disabled items are discoverable.
   Escape/Tab returns to the map. Right-click B with B/C selected and delete/undo;
   right-click a different node and verify sole selection. Resize the viewport and
   open near an edge to inspect bounded scrolling.
2. Use menu insertion, type a multiline label, commit, undo/redo once. Escape a new
   node to remove its provisional structure. F2 on root, left/right leaves,
   expanded and collapsed parents preserves label position and the frozen frame.
3. Load clipboard + links. Copy and paste the mixed collapsed subtree; undo/redo.
   Paste two/four-space and tab outlines. Invalid indentation reports an error
   without a mutation. Open a URL through the menu or modifier-click its label.
4. Reset drag comparison. Drag B/C before, after and into N1, across root sides,
   and into a collapsed target. Inspect mirrored inward-half sibling gradients,
   arrow/prohibited cursor, Escape cancellation and edge autopan. Undo once.
5. Visit `/?readonly` and `/?no-menu`. Read-only keeps selection/copy/link/view;
   disabled mutation items cannot execute. Menu-disabled mode retains host/native UI.
6. Use Inspect document snapshot and Try invalid replacement; check document,
   selection/history and event origin. The separate geometry map stays independent.
7. Visit `/examples/consumer/` after building. Edit/undo in the first map, try the
   read-only second map, destroy and remount. Caller-owned content survives. This
   convenient public-export preview complements the separately installed consumer.
8. Visit `/?workload` for review or `/examples/performance/` for the isolated
   1,000-total/500-visible fixture. Profile with the documented command; do not
   infer physical display performance from headless timing alone.

## Checks and reproducibility

- [Stage-8 gate](stage8/report.md): typecheck/build, 163 unit tests, 117 browser cases,
  no skips/failures, all three exact accepted-default PNGs.
- [Final typecheck](typecheck.txt), [build](build.txt), [unit tests](unit.txt),
  [full browser gate](browser.txt), [12-case final integration gate](integration.txt).
- [Packaged-consumer checks](package/checks.txt), [result and environment](package/result.json),
  [production consumer screenshot](package/consumer-chromium.png).
- [Performance report](performance/report.md), per-engine samples and frame trace.
- [Review demo smoke](demo/smoke.json): all three engines passed snapshot/replacement,
  every demo evidence URL and public-export consumer destruction/remount.
  [Review screenshot](demo/review-chromium.png).
- [Installed browser and manual release matrix](installed-browsers/report.md).

Commands: `pnpm typecheck`, `pnpm build`, `pnpm test`,
`MINDMAP_EVIDENCE=docs/evidence/milestone-d/regression pnpm test:browser --workers=1`,
`pnpm test:package`, `pnpm perf` (Chromium); use
`pnpm test:browser tests/browser/performance.spec.ts --workers=1` for all engines.
Keep one persistent `pnpm dev --port 5173 --strictPort` running when invoking
multiple browser commands; otherwise one run's managed server can exit under another.
The historical first installed-Chrome attempt demonstrates that harness issue.

## Acceptance mapping

Every row refers to the requirements' numbered criterion, with test sources and
captured evidence. Automated completion does not substitute for product or manual
screen-reader acceptance.

| Criterion | Automated evidence |
|---|---|
| 1. Reference rendering | [render](../../../tests/browser/render.spec.ts), [exact accepted A](../../../tests/browser/checkpoint-b.spec.ts), [default comparison](regression/comparison-chromium.png) |
| 2. Root branch creation | [editing](../../../tests/browser/editing.spec.ts), [interaction](../../../tests/browser/interaction.spec.ts) |
| 3. Insertions and keyboard moves | [interaction](../../../tests/browser/interaction.spec.ts), [editing review](../../../tests/browser/editing-review.spec.ts), [pure commands](../../../tests/unit/interaction.test.ts) |
| 4. Editing frame/typing/multiline | [editor sizing](../../../tests/browser/editor-sizing.spec.ts), [link/editor widths](../../../tests/browser/link-editor-review.spec.ts), [editing comparison](regression/editing-comparison-chromium.png) |
| 5. Provisional cancellation | [editing](../../../tests/browser/editing.spec.ts), [pure editing](../../../tests/unit/editing.test.ts) |
| 6. Navigation | [all confirmed navigation examples](../../../tests/browser/navigation.spec.ts), [pure navigation](../../../tests/unit/interaction.test.ts) |
| 7. Selection | [pointer/keyboard selection](../../../tests/browser/interaction.spec.ts), [collapse cleanup](../../../tests/unit/model.test.ts) |
| 8. Checkboxes/collapse | [focus controls](../../../tests/browser/focus-controls.spec.ts), [menu actions](../../../tests/browser/menu.spec.ts) |
| 9. Checkbox inheritance | [editing creation](../../../tests/browser/editing.spec.ts), [model](../../../tests/unit/model.test.ts) |
| 10. URLs | [clipboard/link gestures](../../../tests/browser/clipboard.spec.ts), [menu policy/origins](../../../tests/browser/menu.spec.ts) |
| 11. Clipboard | [codec/atomic forest](../../../tests/unit/clipboard.test.ts), [real native clipboard and async failures](../../../tests/browser/clipboard.spec.ts) |
| 12. Drag/drop | [pure zones/moves](../../../tests/unit/drag.test.ts), [actual mouse/drop/autopan](../../../tests/browser/drag.spec.ts), [reference](regression/drag-comparison-chromium.png) |
| 13. History | [model](../../../tests/unit/model.test.ts), [editing](../../../tests/unit/editing.test.ts), drag/clipboard/menu undo cases |
| 14. Viewport | [interaction](../../../tests/browser/interaction.spec.ts), [resize and event queue](../../../tests/browser/review-fixes.spec.ts) |
| 15. Context menu | [menu](../../../tests/browser/menu.spec.ts), [keyboard screenshot](regression/menu-keyboard-chromium.png) |
| 16. Public API/events | [API](../../../tests/browser/api.spec.ts), [integration atomicity](../../../tests/browser/integration.spec.ts), [viewport queue](../../../tests/browser/review-fixes.spec.ts) |
| 17. Multiple instances/lifecycle | [mount](../../../tests/browser/mount.spec.ts), [menu cleanup](../../../tests/browser/menu.spec.ts), [isolated package consumer](package/result.json) |
| 18. Workload measurements | [profiler](../../../tests/browser/performance.spec.ts), [report](performance/report.md); physical display gate pending |

## Visual review

All four supplied FreeMind images were opened and inspected. The final default,
editing, clipboard and drag screenshots are inspected alongside the references.
Exact accepted-A comparisons retain the original page geometry and compare PNG
bytes; no tolerance changed. New screenshots are review candidates; accepted A/B/C
and supplied images are preserved. Engine/font differences remain explicit: macOS
Arial at DPR 1, pinned Playwright browsers, 100% widget zoom for references.

Menu colors and item focus are legible in the inspected normal and small/scaled
hosts. Explicit accessible groups preserve map geometry. The package consumer
shows isolated styling and intact host content. No new tree visual styling was
needed for this milestone. The final demo screenshot exposed a disclosure-target
mistake: Inspect snapshot populated the correct text but opened the earlier event
panel. It now opens its own bounded, scrollable snapshot panel; the demo smoke
asserts visibility. Before/after review captures are retained under `demo/`.

## Corrections and known gaps

The initial menu test assumed mouse focus on a host button in WebKit; a native
text input now tests outside focus consistently. The first consumer build failed
because macOS's `/var` temporary directory aliases `/private/var`; canonical paths
fixed Vite output generation. Initial profiler compilation found a shadowed DOM
`document` variable and strict type errors; corrected before measurement. First
installed-Chrome checks lost a managed Vite server; rerun against a persistent one.
Initial failure logs are retained in their evidence directories. The [intermediate integration gate](intermediate-integration.txt) passed 271 cases,
skipped two and reproduced the initial menu race in all three engines. The API audit
reproduced invalid targets committing an unrelated active editor; target IDs now
validate before edit completion. A new immediate-mount test also reproduced initial
ResizeObserver delivery dismissing a menu without a size change; size-change
tracking corrects that race. The accepted paste behavior was retained while a
stale plan sentence was synchronized: paste expands the destination; child drops
keep it collapsed.

No known functional or visual regression remains after final checks.
Required gaps remain in the installed-browser/manual matrix: latest stable browser
coverage, Safari automation, VoiceOver/Safari, NVDA/Windows, actual OS IME and physical
input-to-display/manual smoothness. They are not passed or waived. Timing tails
above one frame are reported and investigated in the performance report. The next
product task is the user's stage-9 review; release requires completing those gates.

Final ancillary checks: all local Markdown evidence links resolve; whitespace audit
passed; accepted A/B/C/reference paths have no diff from `7979ca8`. Initial failure
logs retain their outcomes with terminal colors/trailing blank whitespace normalized.
