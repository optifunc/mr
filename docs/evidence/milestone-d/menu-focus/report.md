# Menu focus and shortcut contrast — 2026-09-10

User-approved follow-up to `64d273a`: hide the focused item's background and
outline until Up or Down is pressed, and lighten the right-aligned shortcut hints.
Tested state is `64d273a` plus the task changes in the commit containing this report.
Visual acceptance remains pending at the stage-9 checkpoint.

The first item still receives DOM focus on opening, so keyboard activation,
Escape and accessibility semantics remain available. Only Up/Down reveals the
focus highlight; Home/End retains its navigation behavior. Hover feedback remains
independent. Every reopening starts with the focus highlight hidden again.
Enabled hints now use #666 against #111 labels; disabled hints use #888 against
#757575 disabled labels. Grouping, 4px corners and shortcut bindings remain intact.

## Review images

[Previous appearance and evidence](../menu-review/report.md) is preserved.
Previously the first item was highlighted immediately and shortcut hints matched
label colors. The new initial and arrow-navigation states below show the changes.

| Engine | Initial right-click | Initial keyboard opening | After arrow navigation |
|---|---|---|---|
| Chromium | [Pointer](menu-initial-pointer-chromium.png) | [Keyboard](menu-initial-keyboard-chromium.png) | [Navigated](menu-navigated-pointer-chromium.png) |
| Firefox | [Pointer](menu-initial-pointer-firefox.png) | [Keyboard](menu-initial-keyboard-firefox.png) | [Navigated](menu-navigated-keyboard-firefox.png) |
| WebKit | [Pointer](menu-initial-pointer-webkit.png) | [Keyboard](menu-initial-keyboard-webkit.png) | [Navigated](menu-navigated-pointer-webkit.png) |

Inspected initial and navigated screenshots across Chromium/Firefox/WebKit and
the small-host wrapping capture. No initial focus paint remains; arrow navigation
reveals the rounded highlight, and hints are visibly lighter. Supplied references
and accepted screenshots remain unchanged.

Demo: [http://127.0.0.1:5173/](http://127.0.0.1:5173/), or `pnpm build` then `pnpm dev`.
Right-click a node or focus the tree and press Shift+F10. Move the pointer away
from the menu to distinguish hover from focus. Press Up/Down, then Escape and
reopen to verify the reset. The demo links this report.

## Checks

| Command | Result | Evidence |
|---|---|---|
| `pnpm typecheck`, `pnpm build`, `pnpm test` | Passed; 163 unit tests | [Log](checks.txt) |
| `MINDMAP_EVIDENCE=docs/evidence/milestone-d/menu-focus pnpm test:browser menu.spec.ts integration.spec.ts --workers=1` | Passed; 48 cases in three engines | [Log](browser.txt) |
| Same evidence environment, `pnpm test:browser checkpoint-b.spec.ts --grep accepted-A --workers=1` | Passed; three exact accepted-default images | [Log](accepted-default.txt) |
| `git diff --check` | Passed before commit | No whitespace errors |

New actual-input checks cover pointer and keyboard opening without focus paint,
hover feedback, Home/End before arrows, both first-arrow directions, disabled-item
focus, reopening reset, Enter activation without visible focus and focus return.
Existing platform hints, disabled state, menu actions, lifecycle and label contrast
tests pass. The disabled-hint color assertion was updated to the requested lighter
color; no screenshot tolerance or unrelated assertion was relaxed.

No known defect remains in this follow-up. Unrelated full release/package/performance
suites were not rerun for these menu-only changes. Earlier milestone evidence and
the [actual-browser/manual release gaps](../installed-browsers/report.md) retain
their recorded scope. Next: user's stage-9 product review.
