# B navigation correction

2026-09-07. Tested working tree based on `0204593`; the commit containing this
report contains only the navigation correction, tests, documentation and evidence.
The user approved the rule after clarifying Single child + Down → N1. Remain at the
stage-5 product checkpoint for further review; B is not newly marked accepted.

## Behavior

Up/Down first chooses a visible sibling in the requested direction. If none exists,
it continues at the same depth in an adjacent branch on the same root side.
Other depths are excluded. Within each candidate group, vertical-center distance
and stable layout order determine the destination. Non-root edges stay selected;
they no longer fall back to root. Root's existing entry behavior and Left/Right
navigation remain unchanged. Shift+Up/Down follows the same destinations and
contracts when retracing the selection path. Primary-modifier structural moves
and cross-parent Shift+click keep their existing rules.

| From | Key | Verified destination |
|---|---|---|
| One | Down | Two |
| C | Up | B |
| A | Down | B |
| Single child | Up | C |
| Single child | Down | N1 |
| N2 | Down | N3 |
| N3 | Up | N2 |

The old search included every depth, allowing closer parents/deeper descendants to
win. The pure resolver now filters non-root candidates by side and depth and ranks
siblings first. It remains shared by API navigation and keyboard input. No layout,
rendering, text-editing, transaction or viewport implementation changed.

## Verification

| Check | Result |
|---|---|
| Pre-fix focused unit run | 9 failed / 15 passed, [retained reproduction](before-checks.txt) |
| `pnpm typecheck` | Passed, [log](checks.txt) |
| `pnpm test` | **110 passed**, [log](checks.txt) |
| `pnpm build` | ESM/CSS/declarations passed, [log](checks.txt) |
| `pnpm test:browser tests/browser/navigation.spec.ts tests/browser/interaction.spec.ts --workers=1` | **27 passed**, [log](browser-checks.txt) |
| `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1` | **3 passed**, [log](appearance-checks.txt) |
| `git diff --check` | Passed |
| Full B browser suite and workload profiling | Not rerun; this correction used focused navigation/interaction and appearance regressions |
| Actual stable browsers, OS IME, screen readers and packaged consumer | Not run; previous milestone/release gaps remain |

All seven examples are checked with actual keys in both editable and read-only
mounts, without document/history/geometry changes. Further coverage checks mirrored
maps, closer cross-group candidates versus siblings, equal candidate centers,
collapsed peers, same-depth edges, root entry, and Shift range reversal across groups.
Old assertions expecting cross-depth destinations were updated to the approved
product contract; no assertion or screenshot tolerance was relaxed.

Environment matches the B handover: macOS 26.6.2, Apple M2, Arial 12px/15px, DPR 1,
1400×1000 browser viewport, widget zoom 100%. Pinned Playwright 1.58.2 engines:
Chromium 145.0.7632.6, Firefox 146.0.1 and WebKit 26.0.

- Actual movements: [Chromium](results-chromium.json), [Firefox](results-firefox.json),
  [WebKit](results-webkit.json).
- Inspected final N3 + Up → N2 selection: [Chromium](selection-chromium.png),
  [Firefox](selection-firefox.png), [WebKit](selection-webkit.png).
- Approved A reference PNGs still match exactly; no supplied image or accepted
  baseline was changed. Earlier B evidence remains intact.

## Review

Use the running demo (the B handover URL was <http://127.0.0.1:5174/>) or run
`pnpm dev` and open the URL Vite prints. Reset the map, select each source in the
table, and press its arrow. To check cross-group selection, select C and press
Shift+Down twice, then Shift+Up twice: C → Single child → N1 → Single child → C.

No known defect remains in this correction's verified scope. Further B product
feedback is the next action; later milestone work has not started.
