# B editor sizing and baseline alignment

2026-09-08. Tested working tree: task-only changes based on `13a5f88`, recorded in
the commit containing this report. User approved this follow-up before implementation.
Remain at the stage-5 product checkpoint; later milestones have not started.

## Result

- New nodes and existing leaves/collapsed nodes use the width of `MMMMMMMM` measured
  in the active font, rounded up, plus 6px of padding/borders. Default 12px Arial
  gives **86px**, replacing the previous 100px new-node width. At 18px it is 126px.
  All new nodes use this size, including parent insertion around an existing child;
  the visible-children width rule applies when editing an existing node.
- Existing nodes with visible children use the full gray selection rectangle's
  width and horizontal bounds. The rule is shared by all editing entry points.
- The lower border's center meets the branch stroke's baseline. Default single-line
  height is **20.5px**, with text at exactly its pre-edit vertical origin. Local
  padding, label size and checkbox/root insets determine placement independently
  of zoom; no rounded offset or transformed screen coordinate drives geometry.
- Existing short left-side labels preserve their text-block position within the
  outward editor. Padding releases as the buffer grows, then native overflow takes
  over; multiline rows stay left aligned. New empty editors start with ordinary
  left padding. Full-node frames leave checkbox-prefix padding transparent.
- The editor frame remains fixed throughout typing, with long/multiline text
  scrolling internally and no horizontal scrollbar. Root retains its label-aligned
  vertical frame because it has no bottom branch line. Viewport caps still take
  priority for oversized labels. Surrounding map geometry and history rules remain.

Requirements, plan, API, demo link, tests, progress and acceptance exercises are
updated. Earlier editing/default evidence and supplied references are preserved.

## Verification

| Check | Result / evidence |
|---|---|
| Pre-fix Chromium sizing tests (`EDITOR_SIZING_BEFORE=1`) | 4 failed: [reproduction](before-checks.txt) |
| Focused sizing tests across engines | 12 passed: [log](sizing-checks.txt) |
| `pnpm typecheck` | Passed: [log](checks.txt) |
| `pnpm test` | 114 passed: [log](checks.txt) |
| `pnpm build` | ESM/CSS/declarations passed: [log](checks.txt) |
| `pnpm test:browser tests/browser/editor-sizing.spec.ts tests/browser/editing-review.spec.ts tests/browser/editing.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1` | 104 passed / 1 interrupted: [log](browser-checks.txt) |
| `pnpm test:browser tests/browser/editing.spec.ts --project=webkit --grep 'Shift\+Enter on root' --workers=1` | Interrupted case passed: [log](rerun-checks.txt) |
| Exact accepted-A PNG comparisons | All 3 passed within the browser run |
| `git diff --check` | Passed |
| Full suite, separate navigation suite, workload, actual stable browsers, real OS IME, screen readers, packaged consumer and final release profiling | Not rerun/not run; previous [B gaps](../report.md) remain |

All **105 distinct cases** in the editing/sizing/checkpoint gate have passed across
the main run and isolated rerun. The one interruption lost `window.primary` during
WebKit's root creation test while the demo source link was updated. This is consistent
with Vite reloading the page; the unchanged test passed after source files stabilized.
No assertions or screenshot tolerances were relaxed, and no test was disabled.
Old 100px assertions now measure eight Ms against the new contract. The initial
probe for wrapped-parent creation was corrected to use the new-node width, since
it is a creation edit rather than F2 on an existing expanded parent.

New measurements cover One/Two/Child2 expanded parents, A/Child 1/long chain leaves,
and Collapsed node at 100%, 150% and 200% in each engine. **Vertical text-origin error
is 0px in all captured cases**; the lower border center matches the branch baseline.
Font-width tests cover 12px and 18px. Existing regressions cover all four insertion
bindings, both sides, typing replacement, cancellation, single-entry undo, read-only,
composition guards, long labels in small viewports, root/checkbox insets and lifecycle.

## Visible evidence

- One at 200%: [before](before-one-chromium.png), [after](after-one-chromium.png).
  The frame shrinks to the selected node's bounds and its lower border joins the
  branch line; the word One stays at the same position.
- Left leaf: [Firefox](after-child1-firefox.png). The wider outward frame retains
  Child 1's text position on entry.
- Collapsed node: [WebKit](after-collapsed-webkit.png), using eight-M width.
- New left node at 200%: [Chromium](after-left-new-2x-chromium.png).
- Eight Ms fit: [Chromium](after-eight-M-chromium.png),
  [Firefox](after-eight-M-firefox.png), [WebKit](after-eight-M-webkit.png).
- Root and checkbox frames: [root](editor-root-chromium.png),
  [left multiline parent](editor-multi-firefox.png), [checked leaf](editor-checked-webkit.png).
- Editing reference: [Chromium](editing-comparison-chromium.png),
  [Firefox](editing-comparison-firefox.png), [WebKit](editing-comparison-webkit.png).
- Frozen multiline buffer scrolls inside the frame: [Firefox](editing-multiline-firefox.png).
- Geometry: [100% Chromium](after-geometry-1-chromium.json),
  [150% Firefox](after-geometry-1.5-firefox.json), [200% WebKit](after-geometry-2-webkit.json).
  Corresponding measurements exist for every engine/zoom, plus font-width and
  creation-binding measurements.

Before/after images and reference files were opened and inspected. Parent frames,
text placement, branch junctions, ellipse, checkboxes and default selection paint
were inspected. No discrepancy remains in the verified scope. Accepted A defaults
still match byte-for-byte. The older supplied editing raster at 50% retains the
known font/raster differences from the accepted 12px Arial default. New editing
images are candidates for user acceptance, not replacements for accepted baselines.

Environment: macOS, Node 24.2.0, pnpm 10.28.1, Playwright 1.58.2 with Chromium
145.0.7632.6, Firefox 146.0.1 and WebKit 26.0. DPR 1, Arial 12px/15px by default;
1400×1000 normal captures and 1440×1200 reference comparisons.

## Review

Refresh the existing demo at <http://127.0.0.1:5174/>, or run `pnpm dev` and open
the printed local URL. The demo links this report.

1. Select Child 1 and press Enter. Type `MMMMMMMM`: all eight letters should fit.
2. Select One or Child2 and press F2: compare the frame width with the prior gray
   selection rectangle. Text must stay in place and the lower border meet the line.
3. Repeat F2 on A, Child 1 and Collapsed node: each uses the same eight-M width.
4. Repeat at 150%/200% zoom. Type several lines, move the caret, commit and undo;
   the frame stays fixed while editing. Escape on a new node restores its creation.

No known defect remains in this change's verified scope. Real OS composition and
later release environments remain unverified as previously recorded. Continue user
product review at stage 5.
