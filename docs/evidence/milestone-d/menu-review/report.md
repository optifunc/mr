# Context-menu appearance review — 2026-09-10

Implemented the user-approved follow-up to the stage-9 checkpoint. Tested state:
`a466d16` plus the task changes in the commit containing this report. Product
acceptance of the resulting images is pending; prior accepted baselines remain intact.

## Changes and review

- Five separators form six groups: Edit; creation and Delete; Cut/Copy/Paste;
  Expand/Collapse; checkbox actions; Open link. Delete follows Insert parent.
- Menu and item backgrounds/focus highlights have 4px corners.
- Existing canvas shortcuts appear in a right-aligned column. Primary shortcuts
  display ⌘ on macOS and Ctrl elsewhere; Ctrl+Space stays Control on all platforms.
  Checkbox presence and Open link have no hints because they have no binding.
- Disabled text and hints lighten from #666 to #757575. The existing 4.5:1 contrast
  assertion against the white menu background still passes without modification.
- Width increases from 190px to 250px to accommodate hints. The host still caps
  width/height; labels wrap and the menu scrolls without horizontal overflow in
  the 150×140px host at 0.8 CSS scale. Separators do not take keyboard focus.

Open [the runnable demo](http://127.0.0.1:5173/) (fresh start: `pnpm build` then
`pnpm dev`). Right-click One or the root, or focus the map and press Shift+F10.
Inspect separators, rounded hover/focus highlights, hint alignment and the root's
disabled Delete/Cut items. Traverse with arrows and Home/End; Escape returns focus.
The demo's stage-9 evidence section links this update and the original release gaps.

## Visible comparisons

The prior menu had square corners, no group separators or hints, and Delete after
Paste. Compare the same keyboard-open fixture before and after:

| Engine | Before (retained D checkpoint) | After | Mac hints/root disabled | Windows hints/root disabled | Small host |
|---|---|---|---|---|---|
| Chromium | [Before](../regression/menu-keyboard-chromium.png) | [After](menu-keyboard-chromium.png) | [Mac](menu-MacIntel-chromium.png) | [Windows](menu-Win32-chromium.png) | [Small](menu-small-chromium.png) |
| Firefox | [Before](../regression/menu-keyboard-firefox.png) | [After](menu-keyboard-firefox.png) | [Mac](menu-MacIntel-firefox.png) | [Windows](menu-Win32-firefox.png) | [Small](menu-small-firefox.png) |
| WebKit | [Before](../regression/menu-keyboard-webkit.png) | [After](menu-keyboard-webkit.png) | [Mac](menu-MacIntel-webkit.png) | [Windows](menu-Win32-webkit.png) | [Small](menu-small-webkit.png) |

Inspected the supplied references, prior menu, and new normal/root/hover and
small-host captures across the three engines. Dividers, corners, text, hints and
wrapping match the requested appearance. The taller menu shifts upward to remain
inside the host. No tree geometry or supplied/accepted images changed. Mac/Windows
hint tests override navigator.platform in the same macOS browser environment;
they are not evidence of testing on an actual Windows installation.

## Verification

| Check | Result | Evidence |
|---|---|---|
| `pnpm typecheck`, `pnpm build`, `pnpm test` | Passed; 163 unit tests | [Log](checks.txt) |
| `MINDMAP_EVIDENCE=docs/evidence/milestone-d/menu-review pnpm test:browser menu.spec.ts integration.spec.ts --workers=1` | Passed; 42 cases across Chromium/Firefox/WebKit | [Log](browser.txt) |
| Same evidence environment, `pnpm test:browser checkpoint-b.spec.ts --grep accepted-A --workers=1` | Passed; all three exact accepted-default PNG comparisons | [Log](accepted-default.txt) |
| `MINDMAP_EVIDENCE=docs/evidence/milestone-d/menu-review/demo node scripts/review-demo.mjs` | Passed; demo, evidence URLs and built-package mount/cleanup in all three engines | [Results](demo/smoke.json) |
| `git diff --check` | Passed | Rechecked before commit |

New browser assertions cover exact grouping/order, all shortcut hints and ARIA
bindings, accessible names, separator-skipping traversal, corners, hover styling,
alignment without label overlap, lighter disabled labels/hints and small-host
horizontal containment. Existing actual pointer/keyboard, root protections,
clipboard, read-only, focus, lifecycle and contrast coverage also passes.

Initial typecheck found a possibly undefined array lookup in the new test; corrected
the bounded lookup annotation, then reran typecheck/build/unit checks successfully.
[Initial diagnostic](checks-initial.txt) is retained. No behavior assertion or
screenshot tolerance was relaxed.

Full unrelated clipboard/drag/performance/package suites were not rerun for this
menu presentation change; their earlier results remain historical in the
[D report](../report.md). Required actual-browser, screen-reader, OS IME and
physical-display release checks retain the [recorded gaps](../installed-browsers/report.md).
No known functional or visual defect remains in this follow-up after the focused
checks. Stop remains the stage-9 product checkpoint, awaiting user review.
