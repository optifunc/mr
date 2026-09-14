# Editor and checkbox borders under host zoom — 2026-09-14

Working tree based on parent `0097165` and widget `4783b2f`. Reproduced in stock
Trilium 0.105.0 on native macOS, Retina display. At 90% UI zoom, Chromium resolves
a 1px CSS border to 0.555556 CSS px (one device pixel at DPR 1.8). At 80%, it
resolves to 0.625px. CSS outlines suffer the same rounding; inset shadows retain
the intended logical stroke width. [Probe measurements](probe.json).

Editor and checkbox outer frames now use 1px inset shadows. Their former border
space is reserved in padding, keeping 100% sizing and text alignment intact.
The native textarea, checkbox input, checkbox tick, branch lines and model are
unchanged. High-contrast mode keeps a visible outline/native checkbox fallback.

Passed build and both typechecks, 178 widget + 46 adapter unit tests, 69 existing
three-engine editing/alignment checks, and 12 new fractional-scale/high-contrast
checks. Existing alignment assertions now add measured border widths rather than
assuming a 1px layout border; their original geometric tolerances were retained.
The new checkbox width check allows the engines' 1/64-pixel layout quantization,
not a change to the nominal 13px size. [Browser results](browser-results.json).

Native verification exercised UI zoom 100%, 90%, 80%, 67%, each with map zoom
100% and 200%, before and after. Escape preserved the stored map. Native metrics
and screenshots confirm the result: at 90% UI zoom the editor's stroke changed
from about 0.55 to 1.00 CSS px, and the checkbox from 0.56 to 1.00. Measurements
integrate pixel contrast across straight top edges and divide by actual DPR and
map zoom, so antialiasing contributes fractional coverage. The 67% editor samples
measure about 0.91–0.96px; checkbox samples remain about 1px. These are raster
coverage estimates, not claims of identical pixels across fractional positions.

[Native measurements](native.json), [editor paint coverage](painted-width.json),
[checkbox paint coverage](checkbox-width.json).
[Before at 90%](before-0.9-1-page.png), [after at 90%](after-0.9-1-page.png).
Inspected full-window screenshots; locator crops at non-100% Electron zoom use
incorrect coordinates and were excluded from evidence. No visual baselines changed.

Reproduce browser checks from `mr/` with:

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm exec playwright test editor-sizing.spec.ts link-editor-review.spec.ts editing-review.spec.ts checkpoint-b.spec.ts border-zoom.spec.ts --workers=3
```

Use a dedicated Vite port if 5173 belongs to another checkout; this run used 5179.
For native review, launch the isolated Trilium app, put checked and unchecked
nodes in a map, enter F2 editing, and compare at the four host zoom levels above.
Keep host zoom separate from map zoom. The fixed bundle is deployed to the isolated
server; personal Trilium data was not modified. Product review remains pending.
