# B root navigation correction

2026-09-08. Tested working tree: task-only changes based on `d7ca866`, recorded in
the commit containing this report. The user requested that root Up/Down do nothing.
Stage-5 product review remains open; no later stage has begun.

The shared navigation resolver now returns no destination for root Up/Down before
searching candidates. This also makes Shift extension a no-op and makes API
`canExecute` / `execute` return false. Horizontal navigation continues through its
existing path. Requirements §8.1, the plan, API, testing and acceptance docs agree.

## Checks and evidence

| Check | Result |
|---|---|
| Pre-fix focused unit regression | 1 failed / 27 passed: [reproduction](before-checks.txt) |
| `pnpm typecheck` | Passed: [log](checks.txt) |
| `pnpm test` | 114 passed: [log](checks.txt) |
| `pnpm build` | ESM/CSS/declarations passed: [log](checks.txt) |
| `pnpm test:browser tests/browser/navigation.spec.ts tests/browser/interaction.spec.ts --workers=1` | 36 passed: [log](browser-checks.txt) |
| `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1` | 3 passed, exact accepted PNG comparisons: [log](appearance-checks.txt) |
| `git diff --check` | Passed |
| Full B browser suite, workload and later release checks | Not rerun; prior evidence and known gaps remain in the [B report](../report.md) |

Actual Up/Down and Shift+Up/Down input preserves selection (root alone and root
active in a multiple selection), focus, document, viewport, page scroll, history,
layout count and demo event log. The same assertions cover API no-ops in editable
and read-only mounts. All ten earlier navigation examples still pass in each mode.

Inspected root-selected screenshots after the no-op keys:
[Chromium](root-chromium.png), [Firefox](root-firefox.png), [WebKit](root-webkit.png).
The root ellipse stays filled, labels and branches remain aligned, and no visual
discrepancy was found. Accepted A default images match byte-for-byte; supplied
references and prior evidence remain unchanged.

Earlier movement regression results:
[Chromium](results-chromium.json), [Firefox](results-firefox.json),
[WebKit](results-webkit.json).

Environment: Playwright 1.58.2, Chromium 145.0.7632.6, Firefox 146.0.1 and WebKit
26.0 on macOS, Arial 12px/15px, DPR 1. Navigation screenshots use a 1400×1000
viewport; accepted-default comparisons use the original accepted page geometry.

## Review

Run `pnpm dev` and open the printed local URL. Select New Mindmap and press Up,
Down, Shift+Up and Shift+Down. Repeat at `/?readonly`. Root selection should stay
unchanged; Left/Right still enter branches. No known defect remains in this fix's
verified scope. Continue product review at stage 5; later browser, accessibility,
packaged-consumer and performance release gates remain pending.
