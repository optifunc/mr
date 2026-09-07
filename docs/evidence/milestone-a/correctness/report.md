# Stage-3 correctness review fixes — 2026-09-07

All four reported P2 defects are fixed. Final gates passed on the working tree
based on `1086255`, with the test artifact paths and handover evidence in the commit
containing this report. Technical completion remains separate from visual product
acceptance. No stage-4 work was started.

## Fixes and acceptance evidence

1. **Malformed commands cannot install invalid state** (`81195b2`). Shared runtime
   validation rejects missing/undefined/non-string `setText.text`, malformed IDs,
   destination objects, positions, and sides. Optional insertion text and move side
   retain their defaults. `canExecute` rejects the same input. API rejection returns
   false with a stable validation error, without document/selection events or DOM
   changes. Twenty-two malformed cases verify preserved document, selection, both
   history stacks, and usable undo/redo; invalid insertion never invokes the ID
   callback. Before the fix, an invalid side installed despite returning false and
   reporting `HOST_CALLBACK`; missing text incorrectly succeeded with undefined data.
2. **Reentrant operations drain one FIFO queue** (`845c9cc`). A enqueuing B/C, then B
   enqueuing D, produces A/B/C/D and final text D; undo returns to C. Each event batch
   finishes before the next operation. Tests also cover a throwing listener,
   destruction during draining, and 3,000 queued selection changes without recursion.
   Before the fix, notifications were A/B/D/C and final text was C.
3. **Trailing newlines retain their final row** (`f4bf9fa`). A zero-width, empty CSS
   inline box creates the final line box in both hidden measurement and visible
   labels without altering text or accessible names. At the default 15px line height,
   `A\n` has 30px of label height and `A\n\n` has 45px (previously 15/30px).
   Tests cover empty, populated multiline, trailing LF/CRLF, and newline-only labels
   on roots and checked/unchecked nodes, exact stored/DOM text, selection, and
   non-overlapping geometry.
4. **Host transforms no longer scale measurements twice** (`1086255`). Node and
   root-content dimensions use resolved fractional local CSS sizes, including box
   sizing, gaps, and the checkbox's vertical offset. Tests compare exact local
   boxes, paths, and ellipse dimensions at mounting, refresh, and scale restoration.
   Half scale, enlarged scale, nested unequal scales, and rotation are covered.
   The half-scale multiline node remains **17.5px** high with a **15px** label after
   refresh; the previous node height incorrectly fell to 8.75px.

The pre-fix reproductions were independently confirmed in all three engines at
`0964854`. The permanent regressions live in `tests/unit/model.test.ts`,
`tests/browser/api.spec.ts`, and `tests/browser/layout-edge.spec.ts`.

## Review

Run `pnpm dev`, then open http://127.0.0.1:5173 for the reference map, geometry
fixture, and live side-by-side comparison. `/?workload` runs the diagnostic fixture.

- Reference comparison: [Chromium](comparison-chromium.png),
  [Firefox](comparison-firefox.png), [WebKit](comparison-webkit.png).
- Reference appearance before these fixes: [previous comparison](../checkbox-gap/comparison-chromium.png).
- Checkbox/multiline fixture: [before](../checkbox-gap/geometry-chromium.png),
  [after](geometry-chromium.png), [Firefox](geometry-firefox.png), [WebKit](geometry-webkit.png).
- Trailing-row selection: [Chromium](newlines-chromium.png),
  [Firefox](newlines-firefox.png), [WebKit](newlines-webkit.png).
- Half-scaled host: [Chromium](scaling-chromium.png),
  [Firefox](scaling-firefox.png), [WebKit](scaling-webkit.png).
- [Six-line root containment](root-multiline-chromium.png).
- Newline measurements: [Chromium](newlines-chromium.json),
  [Firefox](newlines-firefox.json), [WebKit](newlines-webkit.json).
- Transform measurements: [Chromium](scaling-chromium.json),
  [Firefox](scaling-firefox.json), [WebKit](scaling-webkit.json).

All supplied reference images were inspected. Updated comparisons, checkbox,
newline, and scaled-host screenshots were inspected in every engine, along with
the Chromium six-line root. Default font, spacing, green checkbox fill, focus,
and line stacking remain as reviewed. The standard fixture changes only in small
fractional measurement/raster details: [pixel change counts](visual-delta.json).
WebKit's standard comparison and geometry images are byte-content equivalent at
the pixel level; Chromium/Firefox have small edge changes. These counts document
the comparison, not an approved baseline or screenshot tolerance.

## Gates and environment

| Check | Result |
|---|---|
| `pnpm typecheck` | Passed |
| `pnpm build` | Passed, ESM/declarations/exported CSS |
| `pnpm test` | Passed, **79 unit tests** |
| `pnpm test:browser` | Passed, **54 cases**, Chromium/Firefox/WebKit |
| Diff/staged whitespace checks | Passed |
| Screenshot inspection | Completed as described above |

[Type/build/unit log](checks.txt), [full browser log](browser-checks.txt).
The 1,000-total/500-visible workload diagnostic passed in all engines:
[Chromium](workload-chromium.json), [Firefox](workload-firefox.json),
[WebKit](workload-webkit.json). Exact browser/OS/hardware details are in these files.
Environment: macOS / Apple M2 / 16GB; Arial 12px/15px, device scale 1, widget zoom
100%; comparison viewport 1440×1200, edge-case tests 1400×1000. Host scale is .5
for the scaled screenshot; it is separate from widget zoom.

An initial screen-bounds test failed on Firefox by 0.008px because its calculation
assumed screen-coordinate multiplication without browser edge rounding.
[Initial result](initial-render-checks.txt). It was corrected to compare the actual
transformed bounds before refresh with those after refresh/mounting **exactly**,
while retaining exact local geometry and the explicit 17.5px assertion. The
[targeted rerun](edge-checks.txt) and full gates passed. No screenshot tolerance,
non-overlap, containment, or required behavior assertion was relaxed.

## Known limits and next action

No unresolved defect from this four-item review remains known. Windows/macOS text
rasterization and some reference branch positions still differ; ordinary letters
retain slightly more clearance to accommodate descenders. Existing references and
earlier evidence are preserved. Review the corrected stage-3 checkpoint before
authorizing stages 4–5.

Navigation/selection gestures, viewport, and textarea editing remain milestone B;
clipboard/links/drag remain C. Packaged-consumer, actual stable browsers,
VoiceOver/NVDA, and final input-to-paint/frame/cold-load profiling are **not run**,
still required milestone-D gates. The workload evidence is an early synchronous
diagnostic, not final release performance validation.
