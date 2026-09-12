# Checkbox presence shortcut — 2026-09-12

Cmd+1 on macOS and Ctrl+1 on Windows/Linux invoke the same Add/Remove checkbox
action as the active node's context menu. The action applies to the selection:
an active node without a checkbox chooses Add, otherwise Remove. Adding preserves
existing checked states and gives missing checkboxes an unchecked state. Removal
discards checked state. Undo/redo and selection remain on the shared command path.

Both menu variants show a lighter, right-aligned ⌘1 / Ctrl+1 hint and matching
`aria-keyshortcuts`. Ctrl+Space continues to toggle checked state independently.
The shortcut preserves native textarea/composition routing and read-only behavior.

Tested working tree: based on `f843b31`, committed with this report.
[Source/test SHA-256 manifest](tested-files.json). Product review pending;
milestone D remains complete and accepted.

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm typecheck` | Passed | [log](typecheck.txt) |
| `pnpm build` | Passed | [log](build.txt) |
| `pnpm test` | 177 passed | [log](unit.txt) |
| Browser shortcut and menu checks | 54 passed, no failures/skips | [log](browser.txt) |
| Menu visual inspection | Passed; lighter aligned hints, no clipping | Images below |
| `git diff --check` | Passed before commit | Working/staged diff checked |

Browser reproduction command:

```sh
MINDMAP_EVIDENCE=docs/evidence/milestone-d/checkbox-shortcut pnpm test:browser checkbox-shortcut.spec.ts menu.spec.ts --workers=1
```

Eighteen new cases cover actual key input with Mac and simulated Windows modifiers,
mixed selections in both active states, undo/redo, focus, empty selection, root
checkboxes, Ctrl+Space coexistence, editing preservation, read-only, extra Alt,
instance isolation, and both hint variants. The existing 36 menu cases also pass,
including hint alignment, accessibility, disabled items, groups and focus paint.

Compared the [previous Mac menu](../menu-focus/menu-MacIntel-chromium.png) with
the [updated Mac menu](menu-MacIntel-chromium.png): Add checkbox now has ⌘1;
geometry and styling remain consistent. Additional inspected images:
[Windows Add](menu-Win32-chromium.png),
[Firefox Mac Remove](remove-MacIntel-firefox.png),
[Firefox Windows Remove](remove-Win32-firefox.png),
[WebKit Mac Add](menu-MacIntel-webkit.png),
[WebKit Windows Add](menu-Win32-webkit.png),
[WebKit Mac Remove](remove-MacIntel-webkit.png),
[WebKit Windows Remove](remove-Win32-webkit.png).
Images use macOS, Playwright 1.58.2 bundled engines, 1400×1000 viewport, DPR 1,
zoom 1 and the Arial/Helvetica/sans-serif font stack. Prior baselines are preserved;
these are review images, not newly approved baselines.

Run `pnpm dev` and open http://127.0.0.1:5173/. Select One and press Cmd+1/Ctrl+1
to add its checkbox; press again to remove. Open its menu before and after to
review both hints. Undo/redo should restore each presence change in one step.
The demo's evidence section links this report.

No known defect remains in the exercised scope. Full milestone, packaged-consumer,
performance and installed-browser/manual accessibility gates were not rerun for
this focused shortcut change. Simulated Windows routing is not an actual Windows
run. Existing release gaps in [acceptance](../../../acceptance.md) remain unchanged.
