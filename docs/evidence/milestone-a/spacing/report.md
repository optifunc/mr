# Stage-3 spacing corrections — 2026-09-07

All three requested corrections are implemented. **Visual acceptance remains
pending.** Tested working tree: the spacing correction commit containing this
report, based on `f59980d`. No stage-4 work was started. Previous candidates and
all four supplied reference images are preserved.

Run `pnpm dev` and open http://127.0.0.1:5173 for the live map, checkbox/multiline
fixture, and native-size FreeMind comparison.

## Review evidence

- Current comparison: [Chromium](comparison-chromium.png),
  [Firefox](comparison-firefox.png), [WebKit](comparison-webkit.png).
- Previous comparison: [before](../100dpi/comparison-chromium.png).
- Checkbox alignment: [before](../100dpi/geometry-chromium.png),
  [after](geometry-chromium.png), [Firefox](geometry-firefox.png),
  [WebKit](geometry-webkit.png).
- [Multiline root](root-multiline-chromium.png).

Non-root labels move down 2 native CSS pixels within the same measured boxes.
Redistributing the existing vertical padding (4.5px top, 0.5px bottom) moves text
closer to its underlying line and increases the line-to-next-label gap above N1.
Root text remains centered. Checkboxes move up 1px relative to the label block,
including root, checked/unchecked, nested, and multiline cases. These corrections
are shared theme defaults, not special positions for the reference fixture.

The user's annotated image is magnified. Native-size measurements use fully blank
pixel rows between dark glyph ink and the gray line; this differs from measuring
the magnified annotation itself. [Reproducible measurements](ink-spacing.json),
generated with `python3 docs/evidence/milestone-a/spacing/inspect-spacing.py`:

| Native blank rows | FreeMind | Before Chromium / Firefox / WebKit | After Chromium / Firefox / WebKit |
|---|---|---|---|
| Child2 text to underlying line | 4 | 6 / 5 / 6 | 4 / 3 / 4 |
| In-place editing line to N1 text | 11 | 9 / 9 / 9 | 11 / 11 / 11 |

The script reads fixed crops from the reference and retained screenshots. It
excludes faint antialiasing and gray branches from text-ink detection. Firefox
paints a final glyph row one pixel lower; this remaining rasterization difference
is explicit rather than compensated with browser-specific node geometry.

## Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed, ESM/declarations/exported CSS.
- `pnpm test`: passed, 54 unit tests.
- `pnpm test:browser`: passed, 36 cases across Chromium, Firefox, and WebKit.
- `git diff --check`: passed.
- [Type/build/unit log](checks.txt), [browser log](browser-checks.txt).
- Spacing/checkbox measurements: [Chromium](spacing-chromium.json),
  [Firefox](spacing-firefox.json), [WebKit](spacing-webkit.json).
- Existing appearance guards: [Chromium](appearance-chromium.json),
  [Firefox](appearance-firefox.json), [WebKit](appearance-webkit.json).
- Workload diagnostic, 1,000 total / 500 visible:
  [Chromium](workload-chromium.json), [Firefox](workload-firefox.json),
  [WebKit](workload-webkit.json).

The new browser regression compares the corrected offsets with the previous zero
offsets: node boxes, connector paths, root text placement, and layout count remain
unchanged; other labels move down 2px and checkbox centers sit 1px above text-block
centers. Regular row pitch remains 23px and root dimensions remain about 99×39px.
Existing line-over-selection, full root fill, #339933 checkbox fill, focus, API,
non-overlap, and multiline-root containment checks pass without relaxed assertions.
Final comparison and geometry images from all three engines and the Chromium
multiline root were opened and inspected. No pixel baseline was introduced.

Environment: macOS on Apple M2 / 16GB; browser/OS versions in workload JSON.
Comparison viewport 1440×1200, device scale 1, widget zoom 100%, Arial 12px/15px.
Reference is 605×324 at native size. The candidate's CSS panel is the same size;
Chromium/Firefox locator capture rounding includes one extra bottom pixel.

## Known gaps and next step

Windows ClearType and macOS glyph rasterization still differ, as do some branch
endpoints/junction positions. The two requested gap corrections match the native
reference in Chromium/WebKit; Firefox differs by one glyph-ink row as recorded.
These are candidate images awaiting stage-3 product review.

No stage-3 behavior failure remains known. Selection/navigation gestures,
viewport, and textarea editing remain stages 4–5. Clipboard/links/drag remain
stages 6–7. Packaged-consumer, actual stable browsers, VoiceOver/NVDA, and final
input-to-paint/frame/cold-load profiling are **not run**, still required in
milestone D; the workload numbers here are early synchronous diagnostics.
