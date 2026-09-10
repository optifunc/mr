# Approved P2 review corrections — 2026-09-10

All four approved corrections are implemented. The runnable demo remains at the
stage-9 product checkpoint; product acceptance and the existing manual release
checks remain pending. No release waiver is inferred.

## Changes and tested revisions

1. **Invalid move destinations preserve active edits** — `2f7ede1`.
   Shared reducer preflight rejects self/descendant destinations and insertion
   beside root before committing an existing or provisional edit. Error code remains
   `INVALID_TARGET`. Browser tests preserve buffer, caret/focus, document, selection,
   viewport, events and undo/redo history; a valid move retains its normal edit/move
   commits and separate undo steps. [Focused evidence](atomicity-browser.txt).
2. **The package gate verifies the actual consumer** — `5e8b580`.
   Startup errors, process exit and readiness timeout fail the gate. A new run ID,
   tarball SHA-256 and hashes of built HTML/JS/CSS identify the consumer; hashes are
   also checked against actual browser responses. The result records an overall
   status, loaded assets and preview diagnostics. Occupied ports, previous consumers,
   tampered assets and unexpected exits are tested. The fresh consumer loaded
   `assets/index-Bbj07AQL.js` in all engines, matching its manifest.
   [Identity/results](package/result.json), [failure-path tests](package-tools.txt).
3. **Profiling gestures match the platform and intended action** — `a39b37f`.
   Meta is used on macOS, Control elsewhere. Each individual pan must change Y
   without changing X/zoom; each zoom must change scale in the wheel's expected
   direction. Alternating gestures cannot hide an incorrect action behind an
   unchanged final viewport. Nine Mac/Windows/Linux-mapping browser cases passed;
   these overrides do not establish actual OS release coverage.
   [Gesture regressions](profile-input.txt).
4. **Reports derive conclusions from validated evidence** — `a39b37f`.
   Raw samples and stored summaries must agree. A 150 ms full-relayout p95 reports
   failure; missing/non-finite samples, absent provenance, mismatched runs/sources
   and failed gesture/layout invariants are rejected. Failed regeneration replaces
   stale passing prose with invalid/unverified status. Profiles capture run identity,
   revision, source digest/dirty state, hardware/browser/viewport settings and declared
   concurrency. Unknown concurrent work is not presented as verified isolation.
   [Tool regressions](tools.txt), [current derived report](performance/report.md).

`d134744` additionally corrects the initial frame-interval measurement discovered
by the new validator. Final profiles record that revision, source dirty **false**,
run `1bc18a33-0389-4432-8fac-e624b6bfae91`, and the source SHA-256 in each JSON.
The full non-profile suite tests the same widget implementation; only the profile's
frame initialization changed after its initial run. Package assets contain the
final widget implementation; later changes are tooling, tests and review links.

## Verification

| Check | Result | Evidence |
|---|---|---|
| `pnpm typecheck`, `pnpm build`, `pnpm test` | Passed; 163 unit tests | [Checks](checks.txt), [final frame typecheck](frame-typecheck.txt) |
| `pnpm test:tools` | Passed; 15 tool regressions | [Log](tools.txt) |
| Full non-profile browser coverage | 529 unique cases passed across initial Chromium/Firefox and final WebKit; two documented clipboard-permission skips | [Initial full run](browser.txt), [final WebKit run](webkit-final.txt) |
| Exact accepted-A PNG comparisons | Passed in all three engines, within the browser gate | Same browser logs; [current images](regression/regression-reference-chromium.png) |
| `MINDMAP_EVIDENCE=docs/evidence/milestone-d/review-fixes/package pnpm test:package` | Passed; fresh tarball install, declarations, production build and behavior in all three engines | [Build log](package-run.txt), [result](package/result.json) |
| Three-engine isolated profiling | Passed; three cases, every pan/zoom transition verified | [Run log](performance-run.txt), [profiles/report](performance/report.md) |
| Performance report generation | Passed; measured full-relayout p95 7.8 / 11 / 13 ms, all within 100 ms | [Generator log](performance-summary.txt) |
| Review-demo smoke and evidence URLs | Passed in all three engines; evidence URLs and public-package mount/cleanup | [Results](demo/smoke.json), [log](demo-smoke.txt) |
| Whitespace and local evidence links | Passed before commit | `git diff --check` and local link validation |

There are **532 unique passing browser cases including the three isolated profiles**,
plus two existing permission skips. Repeated diagnostics are not added to that count.

Reproduce the non-profile gate with
`MINDMAP_EVIDENCE=<directory> pnpm test:browser --grep-invert 'release workload' --workers=1`.
The final WebKit rerun added `--project=webkit --trace=on`. No assertion, screenshot
tolerance or timeout was relaxed. Profiling reproduction and recorded conditions
are in the generated report; run it separately from other tests/builds.

## Failures retained and resolved scope

- The first fresh profile run at `a39b37f` passed the then-existing browser assertions,
  but the new generator rejected a **−15 ms first Chromium frame interval**.
  `performance.now()` at registration can be later than the current rAF timestamp.
  The fix measures between consecutive rAF timestamps and asserts finite,
  nonnegative intervals in the browser. No measured value was clamped away.
  [Rejected samples](performance-initial/profile-chromium.json),
  [invalid/unverified report](performance-initial/report.md),
  [diagnostic](performance-initial-summary.txt) remain available. The corrected
  fresh run and derived report pass.
- The initial broad run had two WebKit `page.goto('/')` timeouts before behavior
  checks (527 passed, two failed, two skipped). A first WebKit rerun passed the
  editor case but repeated the drag case's navigation timeout (175 passed, one
  failed, one skipped). Replaying the preceding drag test and reference case twice
  passed all four cases. The final complete WebKit run with diagnostic tracing
  passed 176 cases with one skip. Traces recorded no network responses for the
  failed navigations; the underlying intermittent navigation cause is not established.
  This is retained as a test-environment limitation, not hidden by retries or a
  product-code change. [Initial drag trace](webkit-initial-load-trace.zip),
  [initial editor trace](webkit-initial-editor-load-trace.zip),
  [first rerun](webkit-rerun.txt), [rerun trace](webkit-rerun-load-trace.zip),
  [sequence replay](webkit-drag-sequence.txt), [final pass](webkit-final.txt).

## Visual review and runnable checkpoint

Demo: **http://127.0.0.1:5173/**. Fresh start: `pnpm build` then `pnpm dev`.
The evidence section links this report, the refreshed performance report and the
verified packaged-consumer results. All existing fixture, menu, edit, clipboard,
drag, API/state, read-only, replacement and teardown exercises remain available.

| Engine | Default | Editing | Drag | Initial menu | Packaged consumer |
|---|---|---|---|---|---|
| Chromium | [View](regression/comparison-chromium.png) | [View](regression/editing-comparison-chromium.png) | [View](regression/drag-comparison-chromium.png) | [View](regression/menu-initial-pointer-chromium.png) | [View](package/consumer-chromium.png) |
| Firefox | [View](regression/comparison-firefox.png) | [View](regression/editing-comparison-firefox.png) | [View](regression/drag-comparison-firefox.png) | [View](regression/menu-initial-pointer-firefox.png) | [View](package/consumer-firefox.png) |
| WebKit | [View](regression/comparison-webkit.png) | [View](regression/editing-comparison-webkit.png) | [View](regression/drag-comparison-webkit.png) | [View](regression/menu-initial-pointer-webkit.png) | [View](package/consumer-webkit.png) |

Inspected current default/edit/drag/menu comparisons, all three packaged-consumer
screenshots and the three fresh workload views. No appearance correction was needed.
Some older tests write fixed output paths; their fresh outputs were copied into this
review directory and prior historical artifacts restored. Supplied references and
accepted A/B/C evidence remain unchanged; new captures are review evidence.

Known gaps remain the [actual-browser/manual release matrix](../installed-browsers/report.md):
latest stable applications, Safari automation, VoiceOver/Safari, NVDA/Windows, real
OS IME and physical display/manual smoothness. Rendering-opportunity tails can
exceed a nominal frame; the generated report states observed values and limits.
No known defect remains in the four corrected behaviors. Next: user's stage-9 review.
