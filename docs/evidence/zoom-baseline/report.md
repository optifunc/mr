# Configurable zoom — 2026-09-22

Constructor `zoom: { min, max, default }` options configure actual scene scales.
Defaults remain 0.25–4 with initial/reset 1. Values are copied and validated
before mounting. Initial view, reset command, API, wheel, keyboard applicability
and Fit share the configuration; document and layout are unchanged.

Verified on the working tree:

- `pnpm typecheck`, `pnpm test` (195 unit tests), `pnpm build`.
- `pnpm exec playwright test zoom-options zoom-isolation --workers=3`:
  24 event-ownership cases plus six custom zoom cases passed initially. Three
  geometry comparisons exposed screen-coordinate precision noise; exact world
  node geometry/path comparison replaced screen-space subtraction. The corrected
  `pnpm exec playwright test zoom-options --workers=3` passed all nine cases.
  Combined final coverage: 33 cases across Chromium, Firefox and WebKit.
- `pnpm test:package`: installed consumer passed all three engines. Preserved
  fresh [results](package/result.json); existing historical artifacts restored.
- Willow [integration and visual review](../../../../docs/evidence/zoom-baseline/report.md):
  68 adapter unit tests, 14 chrome/lifecycle groups and four zoom groups passed.

No accepted screenshot baseline changed. Native desktop and performance were
not rerun for this bounded viewport configuration change. Existing manual
accessibility acceptance remains unchanged; user review of Willow’s larger
100% view is pending.
