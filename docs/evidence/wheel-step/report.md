# Consistent wheel step — 2026-09-22

Wheel input now passes direction rather than a magnitude-derived target scale.
The editor adds/subtracts one percentage point of its configured default scale,
then uses its existing pointer-anchored zoom and clamp path. Delta normalization
remains in place for panning. Keyboard zoom and all layout metrics are unchanged.

Checks on the working tree:

- `pnpm typecheck`, `pnpm test` (195 unit tests), `pnpm build`: passed.
- `pnpm exec playwright test wheel-step zoom-options zoom-isolation interaction.spec.ts --workers=3`:
  59/63 passed initially. Four new tests assumed fractional synthetic pointer
  coordinates survived event construction; they now use delivered coordinates.
  `pnpm exec playwright test wheel-step --workers=3`: all 12 passed.
  Final combined coverage: 63 cases in Chromium, Firefox and WebKit.
- `MINDMAP_EVIDENCE=docs/evidence/wheel-step/package pnpm test:package`:
  passed in all three engines. [Result](package/result.json).
- Willow typecheck/build, 68 unit tests and four Trilium zoom integration groups
  passed. [Integration report](../../../../docs/evidence/wheel-step/report.md).

Browser tests use Win32/MacIntel platform bindings and varied trusted/synthetic
wheel deltas on macOS. Native Windows hardware, performance and desktop runs
were not performed for this change. Existing visual baselines are unchanged.
