# Link hints and clipboard termination — 2026-09-14

Working tree based on widget `7c53c4b`, tested on macOS arm64.

Links expose a native title tooltip: Cmd+click to open on Mac; Ctrl+click to open
on Windows/Linux. Editing to plain text removes it; undo restores it. No layout,
selection colours, or link-opening gestures changed.

Copied outlines have no terminating newline. Empty labels encode as `\e` so a
single empty node or last empty sibling survives a round trip. A literal `\e`
label escapes its backslash. Historical input with a final newline remains valid.
Updated previous trailing-newline assertions to the newly approved contract;
preserved indentation, checkbox, multiline, cut/undo and clipboard-failure checks.

Validation: build and typecheck passed; 178 unit tests passed. Clipboard and link
specs passed 94 browser cases across Chromium, Firefox and WebKit; two existing
Chromium-only Clipboard API permission cases were skipped in the other engines.
Mac/Windows/Linux tooltip routing was exercised in each engine by platform override.
This does not claim execution on Windows or Linux operating systems.
[Recorded results](results.json).

Reproduce with `pnpm test`, `pnpm typecheck`, `pnpm build`, and
`pnpm exec playwright test clipboard.spec.ts link-tooltip.spec.ts --workers=3`.
This run used isolated Vite port 5179 to avoid an unrelated checkout on 5173.
No visual baselines were replaced. Product review remains pending.
