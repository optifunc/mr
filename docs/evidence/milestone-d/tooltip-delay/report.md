# Repeatable link tooltip delay — 2026-09-14

Working tree based on widget `7c53c4b`, following the uncommitted link/clipboard
changes. The user's approved change replaces the native `title` tooltip with
an editor-owned hint, shown after 2,000 ms on each entry into a link node.

All 30 focused cases passed in Chromium, Firefox and WebKit on macOS. Tests use
real pointer events and Playwright's clock to check hidden at 1,999 ms, visible
at 2,000 ms, and three successive entries per platform hint. Other cases cover
an early exit, label/checkbox transitions within a node, pending and visible
hint cancellation during editing, replacement and zoom, pending destruction,
modifier-click opening and positioning inside the unscaled viewport.
Windows/Linux wording is tested through platform overrides, not OS execution.

Build/typecheck and 178 widget unit tests passed. The parent build/typecheck
and 46 adapter unit tests passed. Stock Trilium 0.105.0 was checked with real
clock time: hidden at 1.7 seconds on both entries, then visible with correct
macOS wording; leaving hides it immediately and document content stays unchanged.
The recorded visibility observations include Playwright's polling latency;
exact delay boundaries are verified by the controlled-clock tests.

[Results and deployed hash](results.json). [Inspected Trilium screenshot](trilium-tooltip.png).
The hint has readable text beneath the link node, with no clipping or change
to the root layout. No visual baselines were replaced. Native desktop and the
broader release matrix were not rerun for this focused follow-up.

Reproduce widget checks with `pnpm build`, `pnpm typecheck`, `pnpm test`, and
`pnpm exec playwright test link-tooltip.spec.ts --workers=3`. This run used
isolated Vite port 5179. To review in Trilium, hover any link node for two
seconds, move outside it, then re-enter. The full delay repeats every time.
Product review remains pending.

## Approved adjustment to one second

The subsequent user request reduces the delay to 1,000 ms. Build and all 30
three-engine tooltip tests passed again, including hidden at 999 ms and visible
at 1,000 ms on repeated entries. The rebuilt bundle is deployed to the isolated
Trilium instance. [Updated results](one-second-results.json). Appearance is unchanged.
