# Stage-3 checkbox spacing — 2026-09-07

Increased `--mindmap-checkbox-gap` from 3px to 4px at the user's request.
The same spacing applies to root, multiline, checked/unchecked, and nested labels.
Measured node widths accommodate the extra pixel. Vertical alignment and all
other appearance defaults remain unchanged.

Tested working tree: the checkbox-gap commit containing this report, based on
`2742408`. The user said the preceding clearance correction looks good. This
small follow-up remains at stage 3 for review; no later-stage work was started.

Run `pnpm dev` and open http://127.0.0.1:5173.

- Checkbox fixture: [before](../clearance/geometry-chromium.png),
  [after](geometry-chromium.png), [Firefox](geometry-firefox.png),
  [WebKit](geometry-webkit.png). All three updated images were inspected.
- [Reference comparison](comparison-chromium.png).
- `pnpm typecheck`, `pnpm build`, `pnpm test`: passed; **56 unit tests**.
- `pnpm test:browser`: passed; **36 cases** across all three engines.
- `git diff --check` and staged whitespace check: passed.
- [Type/build/unit log](checks.txt), [browser log](browser-checks.txt).
- Gap/vertical geometry measurements: [Chromium](spacing-chromium.json),
  [Firefox](spacing-firefox.json), [WebKit](spacing-webkit.json).
  Existing browser coverage now asserts exactly 4px between checkbox and label.
- Workload diagnostics: [Chromium](workload-chromium.json),
  [Firefox](workload-firefox.json), [WebKit](workload-webkit.json).

Environment and remaining gaps are unchanged from the
[clearance review](../clearance/report.md): macOS, Apple M2, device scale 1,
100% widget zoom, Arial 12px/15px. Exact browser/OS versions are in workload JSON.
Font rasterization and some reference branch positions differ; later interaction
stages and milestone-D release checks remain outstanding. No new defect is known.
Earlier evidence and supplied references are preserved; these captures are review
candidates, not newly approved pixel baselines.
