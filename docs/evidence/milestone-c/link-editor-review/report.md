# C review — link color and editor minimum width

The user approved both corrections on 2026-09-08. Based on clean `a7e4224`;
the commit containing this report records the task-only tested changes. Product
acceptance remains pending at stage 7. Stages 8–9 were not started.

1. URL labels now use standard blue **#0000EE** without a text underline. Their
   SVG branch line, classification, modifier-click selection regions and protected
   opening behavior remain. Prose containing a URL remains plain text.
2. For every node without visible children, the editor width is now
   `min(viewport cap, max(rendered node width, eight-M default))`. Short labels keep
   the eight-M default; wide leaves/collapsed nodes, including root leaves, use
   their node width. Existing expanded parents retain selection-box sizing;
   provisional parents wrapping visible children retain their creation default.
   Alignment, branch baseline and frozen typing frames are preserved. Wider left
   frames keep checkbox padding transparent so the existing checkbox stays visible.

## Review in the demo

Open http://127.0.0.1:5175/ (or run `pnpm dev` and use its printed local URL).
“Load clipboard + links fixture” shows the blue URL beside a plain prose URL label.
Press F2 on the selected collapsed checkbox node and verify the checkbox remains
visible. Reset the map; select Child of a single child, press F2, then repeat on
Collapsed node and A. Long labels get node-width frames; short A keeps its default.
Repeat at 150%/200% and on the left, then type multiple lines or cancel.

## Evidence and verification

- Passed: strict typecheck, ESM/CSS/declaration build, **145 unit tests**;
  [check log](checks.txt).
- Passed: **178 browser cases**, **2 documented permission-grant skips**, no failures; [log](browser.txt). The command covers links,
  editing, creation, clipboard, sizing, focus/lifecycle and exact accepted-A default
  comparisons in Chromium/Firefox/WebKit.
- Pre-change: all **5** new Chromium cases failed as expected against old link
  styling and fixed eight-M widths. [Before log](before-checks.txt).
- First post-change run: **175 passed, 3 failed, 2 skipped**. The three failures
  were an existing 200% alignment assertion comparing against a pre-pan screen X:
  the wider editor legitimately pans 6 screen pixels to stay within the viewport.
  The corrected assertion compares textarea text with the node label in the same
  current viewport and retains the original tolerance. The old exception for
  the long chain label was removed; its alignment is now covered too.
  [Initial regression](initial-browser.txt).
- Visual inspection also found the wider left frame could cover its checkbox.
  Transparent padding preserves the checkbox. [Intermediate overlap](checkbox-overlap-chromium.png)
  and the final left-checkbox captures below retain the correction evidence.

Command:

```sh
MINDMAP_EVIDENCE=docs/evidence/milestone-c/link-editor-review pnpm test:browser tests/browser/link-editor-review.spec.ts tests/browser/editor-sizing.spec.ts tests/browser/editing-review.spec.ts tests/browser/editing.spec.ts tests/browser/clipboard.spec.ts tests/browser/checkpoint-b.spec.ts --workers=1
```

Also: `pnpm typecheck`, `pnpm build`, `pnpm test`, and `git diff --check`.
New captures are redirected into this directory, preserving all earlier evidence
and accepted baselines. Test output formatting is normalized for committed logs.

## Visual comparison

- Links: [before](before-links-chromium.png), [after Chromium](after-links-chromium.png),
  [Firefox](after-links-firefox.png), [WebKit](after-links-webkit.png).
- Wide left leaf: [before](before-wide-left-1-chromium.png),
  [after](after-wide-left-1-chromium.png).
- Collapsed multiline at 200%: [before](before-collapsed-right-2-chromium.png),
  [after](after-collapsed-right-2-chromium.png).
- Left checkbox: [Chromium](after-collapsed-left-1-chromium.png),
  [Firefox](after-collapsed-left-1-firefox.png), [WebKit](after-collapsed-left-1-webkit.png).
- Measured wide/short/checkbox/multiline widths and origins at 100%:
  [Chromium](after-widths-1-chromium.json), [Firefox](after-widths-1-firefox.json),
  [WebKit](after-widths-1-webkit.json). Corresponding 1.5 and 2 files cover zoom.
- [Current editing/reference comparison](editing-comparison-chromium.png),
  [accepted-default exact capture](regression-reference-chromium.png).

Environment: macOS 26.6.2 arm64, pinned Playwright 1.58.2 engines, 1400×1000
viewport (reference comparison 1440×1200), device scale 1, 12px Arial / 15px line
height, zoom 100%/150%/200%. Supplied native-DPI and older editing references were
opened and inspected. These new images are visual-review candidates, not approved
replacement baselines.

Final screenshots were inspected in Chromium, Firefox and WebKit: blue link text,
wide leaf/collapsed frames, mirrored/zoomed alignment and left-checkbox visibility.
All three accepted-A default PNG comparisons passed exactly. No known defect remains
in these two corrections. Whitespace and local evidence-link checks passed. The full
milestone suite/workload was not rerun for these focused corrections; the previous
C report retains that evidence. The two async-permission engine skips and the
actual-stable-browser, manual IME/screen-reader, packaged-consumer and release
performance gaps remain as previously documented. No release gate is waived.


2026-09-09 verification correction: typecheck on the committed `3e73d17` fixture
found a `MindMapNode`/`RootChild[]` mismatch for the empty root. The earlier typecheck
claim above does not establish a clean gate for that committed test. The subsequent
[drag review](../drag-review/report.md) fixes the fixture's type and records the new
strict typecheck and dedicated root browser results. Runtime behavior is unchanged.
