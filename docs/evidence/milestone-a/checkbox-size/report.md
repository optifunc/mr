# Stage-3 checkbox size trial — 2026-09-07

The user requested a checkbox expanded 1px in every direction. The candidate
changes `--mindmap-checkbox-size` from **11px to 13px** in both dimensions.
The 4px label gap, 1px optical raise, #339933 checked fill, and border styling
remain unchanged. The checkmark scales with the square. Layout accommodates
the additional width; default label row heights remain unchanged.

Tested working tree: the trial commit containing this report, based on `ceb73d7`.
**Visual acceptance is pending.** No later-stage work was started.

Run `pnpm dev` and open http://127.0.0.1:5173.

- [Before: 11px](../correctness/geometry-chromium.png).
- [After: 13px Chromium](geometry-chromium.png), [Firefox](geometry-firefox.png),
  [WebKit](geometry-webkit.png). All three updated fixtures were inspected.
- [Reference comparison](comparison-chromium.png).
- [Multiline-root containment](root-multiline-chromium.png).
- `pnpm typecheck`, `pnpm build`, `pnpm test`: passed, **79 unit tests**.
- `pnpm test:browser`: passed, **54 cases** across Chromium, Firefox, and WebKit.
- Diff/staged whitespace checks: passed.
- [Type/build/unit log](checks.txt), [browser log](browser-checks.txt).
- Exact size, gap, and optical alignment assertions: [Chromium](spacing-chromium.json),
  [Firefox](spacing-firefox.json), [WebKit](spacing-webkit.json).

Root/multiline containment, non-overlap, host scaling, trailing newline rows, API
atomicity, and FIFO reentrancy remain covered. The workload diagnostic also reran
in all three engines; the corresponding JSON files retain browser/OS/hardware
details. Environment remains macOS on Apple M2, device scale 1, widget zoom 100%,
Arial 12px/15px.

No new defect is known. Existing Windows/macOS rasterization and reference branch
position differences remain. Later interaction stages and milestone-D release
checks remain outstanding as documented in the [previous report](../correctness/report.md).
Earlier evidence and references are preserved. The larger checkbox is a review
candidate, not an approved baseline.
