# B editing adjustments

2026-09-08. Tested working tree: task-only changes based on `53b47b0`, recorded in
the commit containing this report. The user approved all four changes before
implementation. Stage-5 product review remains open; stages 6–9 have not begun.

## Implemented behavior

1. A printable key starts the existing edit command with a replacement buffer.
   The first character is preserved, the caret follows it, and subsequent typing
   stays native. Root and active nodes in multiple selection are supported. The
   document changes only on commit; Escape restores the old label, preserving
   redo, and commit undoes in one step. F2/click/API editing keeps its current
   selected-text behavior. Space, modifier shortcuts and composition keys do not
   start replacement; empty selection/read-only mode do not edit.
2. The textarea uses hidden horizontal overflow, retaining native caret scrolling
   and vertical overflow. It keeps long text editable without a horizontal bar.
3. Empty creation editors are 100 local CSS pixels wide, previously 50px, bounded
   by available viewport space and scaled by widget zoom. Provisional node geometry
   remains independent of the editor width and frozen throughout typing.
4. Left-side editors anchor their content's right edge to the label's right edge,
   expanding leftward. Right/root editors retain their left content anchor. The
   3px border-plus-padding inset and vertical text alignment remain intact.

The implementation uses the shared input/command/edit transaction and the existing
native textarea. No public command shape or document schema changed. Requirements,
plan, API, demo help, testing instructions and acceptance exercises are current.

## Checks

| Check | Result and reproducible evidence |
|---|---|
| Pre-fix Chromium run of `tests/browser/editing-review.spec.ts` with `EDIT_REVIEW_BEFORE=1` | 5 failed, reproducing typing, overflow CSS, width and positioning: [log](before-checks.txt) |
| `pnpm typecheck` | Passed: [log](checks.txt) |
| `pnpm test` | 114 passed: [log](checks.txt) |
| `pnpm build` | ESM/CSS/declarations passed: [log](checks.txt) |
| `pnpm test:browser tests/browser/editing-review.spec.ts tests/browser/editing.spec.ts tests/browser/navigation.spec.ts tests/browser/interaction.spec.ts --workers=1` | First implementation run: 101 passed / 1 failed: [log](initial-browser-checks.txt); all 87 existing editing/navigation/interaction cases passed |
| `pnpm test:browser tests/browser/editing-review.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1` | Final run: 42 passed: [log](browser-checks.txt), including the corrected overflow check and 3 exact accepted-A PNG comparisons |
| `git diff --check` | Passed |
| Full suite/workload, real OS IME, actual stable browsers, screen readers and packaged-consumer/release checks | Not rerun/not run; existing [B gaps](../report.md) remain |

Together the successful runs cover 129 distinct browser cases across Chromium,
Firefox and WebKit. The only post-fix failure came from requiring scrollLeft=0 at
the start of a textarea. Firefox retains a 2px offset, equal to the textarea's left
padding, while the first glyph remains fully visible. The corrected test requires
selectionStart/End=0 and scrollLeft no greater than the actual padding; it also
verifies scrolling to the end. Screenshots confirm both ends are visible. No
screenshot tolerance changed and no test was disabled.

New placement checks exercise Enter, Shift+Enter, Tab and Shift+Tab on Child 1,
nested C2.1 and right-side One at 100%/200% zoom. They measure width and inward
content-edge alignment, freeze node geometry during typing, and verify Escape
restores document, selection and viewport. Existing tests cover long labels in a
small viewport, multiline text, composition guards, outside clicks, lifecycle,
provisional history, root/checkbox alignment and all earlier navigation examples.

## Visual review

- Child 1 + Enter at 200%: [before](before-left-new-2x-chromium.png),
  [after](after-left-new-2x-chromium.png). The old editor crossed into the inward
  connector; the new 200-screen-pixel editor extends leftward from its anchor.
- Empty editor at 100%: [Chromium](after-left-new-1x-chromium.png),
  [Firefox](after-left-new-1x-firefox.png), [WebKit](after-left-new-1x-webkit.png).
- Overflow at the beginning: [Firefox](after-overflow-start-firefox.png);
  overflow at the end: [WebKit](after-overflow-webkit.png).
- Supplied editing-reference comparisons inspected in [Chromium](editing-comparison-chromium.png),
  [Firefox](editing-comparison-firefox.png), [WebKit](editing-comparison-webkit.png).
- Root and checkbox alignment at 150%: [root](editor-root-chromium.png),
  [left multiline](editor-multi-firefox.png), [checked label](editor-checked-webkit.png).
- Exact default regression: [Chromium](regression-reference-chromium.png),
  [Firefox](regression-reference-firefox.png), [WebKit](regression-reference-webkit.png).
- Position measurements: [100%](after-geometry-1x-chromium.json),
  [200%](after-geometry-2x-chromium.json); corresponding files exist for every engine.

Actual before/after images and reference files were opened and inspected. The root
ellipse, branch junctions, spacing, selection and label baselines remain consistent
with the accepted default. The supplied older editing raster at 50% still has its
known font/raster differences from the accepted 12px Arial default. These captures
are review candidates, not newly approved baselines. Earlier evidence and supplied
references remain untouched; the checkpoint capture test writes to this directory.

Environment: macOS, Node 24.2.0, pnpm 10.28.1, Playwright 1.58.2 with Chromium
145.0.7632.6, Firefox 146.0.1 and WebKit 26.0. Arial 12px/15px, DPR 1; navigation
and new editor captures use 1400×1000, reference comparisons 1440×1200.

## Runnable review

The existing demo at <http://127.0.0.1:5174/> and this report URL both returned
successfully at handover. Refresh it, or run `pnpm dev` and open Vite's printed
URL. The live demo links this report.

1. Select One and type a new name. Enter commits; one undo restores One. Repeat
   with Escape, and try root or a multiple selection with one active node.
2. Select One, press F2, type a long line and move the caret between the ends.
   Verify the text scrolls and no horizontal scrollbar appears.
3. Select Child 1 and press Enter. Verify the 100px empty editor extends left from
   the new label position. Type a label, then commit or cancel.
4. Repeat creation on the right, nested on the left, and after zooming. The wider
   editor and its anchor scale together; surrounding geometry stays fixed while
   typing. Repeat typing at `/?readonly` to verify it does not start an edit.

No known defect remains in the verified four-change scope. Real OS composition
startup and manual release environments remain unverified as previously recorded.
Continue product review at stage 5.
