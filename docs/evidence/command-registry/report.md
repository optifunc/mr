# Command registry and host-menu foundation

2026-09-17. Widget implementation based on `3e0d069`; parent design/plan baseline
`f9cfe78`. This is step 1 of the Willow toolbar/status bar plan, not the complete UI.

## Delivered

- Widget-owned action/shortcut registry with structured bindings, platform
  formatting, alternate redo/context-menu bindings, label-editing and drag
  contexts, native clipboard metadata and link gestures.
- Keyboard handlers, node-menu descriptors, link hints and the public keymap
  reference consume that registry. Pure fixture tests change one binding and
  verify resolution, descriptors and reference output follow it together.
- Public detached metadata and selection-dependent command/applicability queries.
  Actual execution/applicability remains in the existing editor command path.
- Public menu presenter with separate host actions, bounds, disabled-item
  discovery, invoker focus restoration and scoped standalone menu CSS.
- Optional host context-menu handler retaining widget hit testing, group/active
  selection and keyboard anchoring. Blank-canvas/empty-selection requests work;
  editor invalidation closes host menus. Native textarea menus remain native.
- Installed-package consumer demonstrates an anchored menu with a host action
  and a keymap reference generated entirely from widget metadata.

## Verification

Commands run from the parent unless marked widget-directory:

| Check | Result |
|---|---|
| `pnpm build` | Passed: widget and Willow bundles |
| `pnpm --dir mr typecheck` and `pnpm typecheck` | Passed |
| `pnpm --dir mr test` | Passed: 184 tests |
| `pnpm test` | Passed: 46 adapter tests |
| Widget: `pnpm exec playwright test menu.spec.ts integration.spec.ts checkbox-shortcut.spec.ts editing.spec.ts zoom-isolation.spec.ts --workers=4` | Initial run: 160 passed, two WebKit cases interrupted by live reload; both passed in the stable-source rerun below |
| Widget: `MINDMAP_EVIDENCE=docs/evidence/command-registry/menus pnpm exec playwright test host-menu.spec.ts integration.spec.ts menu.spec.ts --workers=3` | Passed: 99 cases across Chromium, Firefox and WebKit |
| Widget: `MINDMAP_EVIDENCE=docs/evidence/command-registry/package pnpm test:package` | Passed in three engines; offline tarball install, declarations, production build, actual asset identity, commands, host action, focus return, keymap and disposal |
| Widget: `pnpm exec playwright test drag.spec.ts clipboard.spec.ts link-tooltip.spec.ts --grep 'Escape clears\|native keyboard clipboard round trip\|URL modifier label clicks\|one-second link hint resets' --workers=3` | Passed: 18 cases across three engines, covering drag cancellation, native clipboard/textarea routing, link activation and repeated platform-correct hints |

Package provenance and browser results: [result.json](package/result.json).
Visual inspection included [the host menu](package/host-menu-chromium.png),
[generated keymap](package/keymap-chromium.png), and
[the Windows-label built-in menu](menus/menu-Win32-chromium.png).
The consumer reference intentionally uses simple HTML; it is not the planned
Willow modal's appearance. Host menus scroll within short panes.

## Failures investigated

- An initial typecheck used old public declarations before rebuilding the widget;
  build then typecheck passed, including the isolated tarball consumer.
- One layout unit case timed out during concurrent browser/build work. The
  isolated rerun passed unchanged, as did the final complete unit run. No timeout
  or assertion was relaxed.
- Two WebKit lifecycle cases failed during source edits. Their traces show
  repeated Vite reconnection/page navigation, replacing the test's custom map.
  The stable-source rerun passed both cases; original traces are retained under
  `initial-failures/`.
- New host-menu pointer tests exposed that existing CSS required a `.mindmap`
  ancestor. The run was stopped, styles were scoped to the menu's own classes,
  and explicit placement/font/bounds assertions were added. All 99 cases then
  passed. Historical stage-8 evidence was restored; new captures live here.

## Scope and remaining work

No Willow toolbar/status bar, responsive More composition, tooltip component or
shortcut modal is implemented yet. The next checkpoint mounts those controls
using these APIs, while retaining save/title/ownership/recovery behavior.

Production Trilium browser/desktop lifecycle and distribution suites were not
run for this widget foundation. Actual Windows/Linux, OS IME, screen-reader and
full release/performance matrices were not run. Platform overrides test mappings,
not actual OS integration. User visual acceptance of the future Willow UI is pending.
