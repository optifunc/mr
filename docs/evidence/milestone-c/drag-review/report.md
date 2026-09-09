# C review — drag cursor and inward-half sibling drops

Approved on 2026-09-09, based on clean `3e73d17`. The commit containing this report
records the tested task changes. Stage-7 product acceptance remains pending;
stages 8–9 are not started.

1. Valid drops now use the regular arrow (`cursor: default`) on the widget and
   hovered labels. Invalid/no-op targets keep `not-allowed` and no valid gradient.
2. The inward half nearest the parent inserts a sibling before above the vertical
   midpoint, or after at/below it. It is the left half on right branches and the
   right half on left branches. Top/bottom quarters keep precedence; the outward
   middle and exact horizontal midpoint retain child drops. Root halves retain
   their side behavior. Preview and commit still use the same move resolver.

## Try it

Open http://127.0.0.1:5175/, or start `pnpm dev` and open its printed URL. Demo help
now describes the revised zones. On the initial reference map:

- Drag N4 into the left half of N1. Move between the upper and lower part of the
  label: a top gradient means before, bottom means after, both with an arrow.
- Drag C 2.3 into the right half of C 2.1 and repeat on the mirrored branch.
- Release, undo once and redo once. Repeat at 200% zoom.
- Select B/C and hover the lower inward half of A: this would keep the current
  sibling position, so the prohibited cursor remains. Move onto a valid target
  to restore the arrow. Outward child and root-side drops work as before.

## Checks

Passed: strict typecheck, build, **147 unit tests**, **123 drag/checkpoint browser
cases** and **3 root-fixture browser cases**, with no failures or skips in the final
runs. All three accepted-A default PNG comparisons passed exactly. Whitespace and
local evidence-link checks passed. Reproduce the focused gate with:

```sh
pnpm typecheck
pnpm build
pnpm test
MINDMAP_EVIDENCE=docs/evidence/milestone-c/drag-review pnpm test:browser tests/browser/drag.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1
pnpm test:browser tests/browser/link-editor-review.spec.ts --grep 'wide root leaf' --workers=1
```

- [Typecheck/build/unit log](checks.txt).
- [Drag and checkpoint browser log](browser.txt).
- [Root fixture browser check](root-fixture-browser.txt).
- [Pre-change log](before-browser.txt): four new Chromium inward-half tests
  failed as expected, with prohibited cursors and absent gradients.
- [Initial browser run](initial-browser.txt): 120 passed, 3 failed. The old scaled
  left test still probed the former invalid center. It now explicitly tests the
  upper before zone, lower same-position rejection and outward child zone during
  one drag. No tolerance was relaxed; exact midpoint rules have pure unit coverage.
- Initial typecheck found an existing `MindMapNode`/`RootChild[]` mismatch in the
  prior review's empty-root fixture. Explicit empty root children correct the test
  type without changing its runtime document; the dedicated browser check covers it.

## Visual evidence

- Right before: [old](before-inward-right-before-1-chromium.png),
  [new](after-inward-right-before-1-chromium.png).
- Right after: [old](before-inward-right-after-1-chromium.png),
  [new](after-inward-right-after-1-chromium.png).
- Mirrored, zoomed: [left before in Firefox](after-inward-left-before-2-firefox.png),
  [left after in WebKit](after-inward-left-after-2-webkit.png).
- [Supplied-reference/live child-drop comparison](comparison-chromium.png).
- Computed cursor/edge: [old right](before-inward-right-before-1-chromium.json),
  [new right](after-inward-right-before-1-chromium.json),
  [new left at 200%](after-inward-left-after-2-webkit.json).

Screenshots do not capture the OS cursor; browser assertions and JSON record the
computed cursor on both the widget and hovered label. Captures were inspected for
before/after top/bottom gradients, mirrored 200% drops and preserved child feedback
against the supplied drag reference. Old images and accepted baselines are retained;
new images remain review candidates.

Environment: macOS, pinned Playwright 1.58.2 Chromium/Firefox/WebKit, 1400×1000
viewport (comparison 1440×1200), DPR 1, 12px Arial/15px line height. New cases cover
100% and 200% zoom, with 0.8 host scaling at 200%. Engine versions and gradient/font
values are in `environment-{engine}.json`.

No known defect remains in these two corrections. No full milestone/workload or
release/manual checks were rerun for these focused
corrections. Existing actual-stable-browser, screen-reader/IME, packaged-consumer
and release performance gaps remain in the [C checkpoint report](../report.md).
