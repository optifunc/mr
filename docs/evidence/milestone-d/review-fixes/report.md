# Approved P2 review corrections — 2026-09-10

The user approved all four triaged corrections. Implementation and verification
are in progress; final combined browser and performance gates have not yet run.

1. Invalid move destinations now use shared reducer preflight before committing
   existing/provisional edits. `2f7ede1`; typecheck, 163 unit tests and 33 integration
   browser cases passed. Buffer, caret/focus, selection, viewport, events and
   undo/redo history survive invalid self/descendant/root destinations.
2. The package gate owns preview startup/exit and verifies a unique consumer run,
   tarball SHA-256 and the HTML/JS/CSS bytes loaded by each browser. `5e8b580`;
   five guard regression tests and the fresh consumer passed in all three engines.
3. Profiling uses the platform modifier and verifies each individual pan/zoom
   transition. Nine Mac/Windows/Linux-mapping cases passed in the three engines;
   actual OS release checks remain separate.
4. Reporting derives target status from validated raw samples and records run/source
   provenance and actual execution settings. Regressions include 150 ms failure,
   fabricated summaries, missing/non-finite samples, mixed runs and stale reports.
   All 15 tooling tests passed. Final fresh profiles remain pending.

- [Atomicity checks](atomicity-checks.txt), [browser results](atomicity-browser.txt)
- [Packaged consumer](package/result.json), [build logs](package-run.txt),
  [guard tests](package-tools.txt)
- [Platform gesture checks](profile-input.txt), [tool tests](tools.txt)

Current demo: http://127.0.0.1:5173/ (`pnpm build` then `pnpm dev`).
The stage-9 product checkpoint and previously recorded manual release gaps remain.
