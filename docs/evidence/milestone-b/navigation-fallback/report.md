# B shallower navigation fallback

2026-09-07. Tested tree: task-only changes based on `5208bde`, recorded in the
commit containing this report. The user approved the general fallback before
implementation. Stay at stage 5 for further product review; B acceptance is pending.

## Approved rule and implementation

On the selected node's root side, Up/Down prefers a sibling, then the nearest
same-depth node in the requested direction. Only if both are absent does it choose
the nearest visible shallower node, excluding the entire ancestor chain. The
fallback uses vertical distance rather than depth difference, with stable layout
order breaking ties. Ancestors and deeper nodes are ineligible. Exhausted edges
stay selected. Root entry and horizontal navigation retain their existing behavior.

The shared pure navigation resolver adds a fallback after the existing peer search.
Ancestor exclusion walks parent IDs iteratively. No transaction, layout, rendering,
viewport or editing implementation changed. Shift uses the same destinations and
adds only the traversed nodes to its selection path.

| Selected node | Arrow | New verified destination |
|---|---|---|
| C2 | Down | N4 |
| Child of a single child | Up | C |
| C2.1 | Up | Child 1 |

All original seven examples remain permanent regressions. Requirements §8.1 now
contains the complete ten-row table, with the same rule in the plan, API notes,
acceptance exercise and progress record.

## Checks

| Check | Result / evidence |
|---|---|
| Pre-fix focused unit run | 6 failed / 22 passed, [reproduction](before-checks.txt) |
| `pnpm typecheck` | Passed, [log](checks.txt) |
| `pnpm test` | **114 passed**, [log](checks.txt) |
| `pnpm build` | ESM/CSS/declarations passed, [log](checks.txt) |
| `pnpm test:browser tests/browser/navigation.spec.ts tests/browser/interaction.spec.ts --workers=1` | **30 passed**, [log](browser-checks.txt) |
| `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1` | **3 passed**, [log](appearance-checks.txt) |
| `git diff --check` | Passed |
| Full B browser suite, workload, real OS IME, actual stable-browser, assistive-technology and packaged-consumer checks | Not rerun/not run; previous milestone evidence and release gaps remain |

All ten examples use actual arrow keys in editable and read-only mounts; document,
history and layout remain unchanged. Additional tests cover mirrored trees,
nearest-by-position fallback across different shallower depths, stable ties, peer
priority over a closer shallower node, complete ancestor exclusion, deeper/opposite
side rejection, collapsed peers, exhausted edges, and Shift selection through the
new destinations. Previous assertions expecting no fallback were updated to the
approved contract, without relaxing assertions or screenshot tolerances.

- Actual movement results: [Chromium](results-chromium.json),
  [Firefox](results-firefox.json), [WebKit](results-webkit.json).
- Inspected final C2.1 + Up → Child 1 selection: [Chromium](selection-chromium.png),
  [Firefox](selection-firefox.png), [WebKit](selection-webkit.png).

Environment: macOS 26.6.2 / Apple M2, Arial 12px with 15px line-height,
1400×1000 viewport, DPR 1 and widget zoom 100%. Playwright 1.58.2 bundled engines:
Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0. Approved A reference PNGs still
match exactly in their original page geometry. Earlier evidence and supplied
references are preserved.

## Review and next action

Refresh the demo (B handover URL: <http://127.0.0.1:5174/>) or run `pnpm dev` and
open Vite's printed local URL. Reset the reference map, select each source in the
three-row table, and press its arrow. Repeat with Shift to see the fallback
selection path. No known defect remains in this change's verified scope. Continue
user product review at stage 5; no later milestone has begun.
