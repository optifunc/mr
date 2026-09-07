# Milestone A appearance corrections — 2026-09-07

The user requested five adjustments and authorized implementation after reviewing
the proposal. This remains the stage-3 checkpoint. **Revised visual acceptance is
pending**; no screenshot baseline is approved. Tested working tree: the appearance
correction commit containing this report, based on `9dfdd7e` (the user's new image).
The four supplied reference files and earlier evidence are unchanged.

## Review

Run `pnpm dev` and open http://127.0.0.1:5173. The page includes the original live
fixture, the independent geometry fixture, and a new native-size comparison with
`FreeMind-reference-100dpi.png`. The comparison fixture preserves the original
structure and matches the new image's `In-place editing` and `C2.3` labels. The
original deterministic fixture remains available to existing tests and the primary
mount. Root selection is shown in the comparison.

- [New comparison: Chromium](comparison-chromium.png),
  [Firefox](comparison-firefox.png), [WebKit](comparison-webkit.png)
- [New geometry, checkbox color, and visible selection lines](selection-lines-chromium.png)
- [Focused node without its old outline](focus-chromium.png)
- [Multiline root containment](root-multiline-chromium.png)
- Before: [original comparison](../comparison-chromium.png),
  [original geometry](../geometry-chromium.png), [original focus](../focus-chromium.png)

## Changes and evidence

| Requested adjustment | Result |
|---|---|
| True-to-original size | Font 14.5 → 12px; line height 18 → 15px; regular row pitch 28 → 23px; root approximately 117×48 → 99×39px. Root padding, branch gaps, markers, and checkbox dimensions were reduced with the font. One-pixel strokes remain. |
| Selected root | The whole ellipse fills with #d2d2d2, sampled from the supplied image; its label is transparent over that fill and its outline remains visible. |
| Lines over selection | Explicit stacking puts SVG strokes above the HTML selection backgrounds. SVG remains pointer-transparent in production. |
| No dotted node focus outline | Removed the additional node outline. Real keyboard focus, active-descendant semantics, and the canvas-level keyboard-focus indication remain. Requirements and plan were updated to reflect the approved change. |
| Checked background #339933 | Native checkbox inputs have an explicit CSS fill and white tick. Native accent color alone produced platform tinting in WebKit, so visual styling is explicit while input semantics remain native. Forced-color mode retains native appearance. |

Browser assertions measure the reference-sized root and 23px A/B/C row pitch,
check the full root fill and transparent label, and confirm absence of a focused
node outline after actual mouse input on the demo's focus button. A paint-order
probe temporarily enables SVG hit testing and confirms the branch stroke and root
outline are above the selected HTML node; this probe does not change visual styles.
Selection still creates no relayout. Final comparisons, geometry, focus, and
multiline-root captures were opened and inspected; [pixel inspection](color-inspection.json)
also confirms exact #339933 fill pixels in all three engines. Checked and unchecked CSS fills are verified
in each engine, alongside existing checkbox state/undo tests.

The six-line root test now expects 90px of text (6 × the new 15px line height)
instead of 108px. Ellipse-containment and non-overlap assertions were not relaxed.
No screenshot tolerances or pixel baselines were introduced.

## Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed; ESM, declarations, and exported CSS produced.
- `pnpm test`: passed, 54 unit tests.
- `pnpm test:browser`: passed, 33 cases across Chromium, Firefox, and WebKit.
- `git diff --check`: passed.
- [Build/type/unit output](checks.txt), [browser output](browser-checks.txt).
- Browser measurements: [Chromium](appearance-chromium.json),
  [Firefox](appearance-firefox.json), [WebKit](appearance-webkit.json).
- The 1,000-total/500-visible workload ran in all three engines:
  [Chromium](workload-chromium.json), [Firefox](workload-firefox.json),
  [WebKit](workload-webkit.json). These remain early synchronous diagnostics,
  not final input-to-paint or cold-load release profiling.

Environment: Apple M2, 16 GB RAM, macOS; exact OS and browser versions are retained
in the workload JSON. Comparison capture viewport 1440×1200, image/candidate panels
605×324, device scale 1, widget zoom 100%, Arial 12px/15px. The reference is shown
at native size. Only the comparison mount translates its root to (204,159) to match
the reference's position; ordinary mounts center the root.

## Remaining review limits

Windows ClearType and macOS browser text rasterization differ; a few glyph widths,
branch endpoints, and junction/row positions still differ slightly. The primary
size anchors now match the 100% DPI screenshot. The new captures are review
candidates, not a claim of pixel identity or approved baselines.

This work adds no stage-4+ interaction behavior. Editing, navigation/viewport,
clipboard/URLs, drag feedback, finalized integration, packaged-consumer checks,
actual stable browsers, manual screen-reader checks, and final performance profiling
remain assigned to milestones B–D. The next step is review of these five corrections.
