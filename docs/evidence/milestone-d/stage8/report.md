# Stage 8 — menu and integration

Based on clean `7979ca8`. Tested implementation will be identified by the commit
containing this report. Product acceptance remains pending at stage 9.

The menu has 13 consistently ordered items, shared applicability and transactions,
mouse/keyboard opening, disabled discovery, Home/End/arrows, Enter/Space activation,
Escape/Tab dismissal and focus return. It preserves selected groups, bounds and
scrolls inside scaled/small hosts, allows disabling and native textarea menus,
and removes temporary outside listeners on close/replace/edit/resize/destroy.
Tree hierarchy now uses explicit accessible groups. Viewport and link events
include user/api origins. Removed node ID/group bookkeeping is released.

Initial menu run: 20 passed, 1 failed. The failed assertion expected mouse focus on
a host button in WebKit/macOS, which does not provide it. The final test clicks a
host text input and verifies retained focus across all engines. No tolerance was
relaxed. The sandbox-only initial launch could not bind Vite; the authorized
browser run uses local-server/browser permissions. Logs preserve both attempts.

- [Initial launch](initial-browser.txt), [first menu results](initial-menu-browser.txt)
- [Typecheck](typecheck.txt), [build](build.txt), [163 unit tests](unit.txt)
- [Expanded browser gate](browser.txt)
- [Keyboard menu](menu-keyboard-chromium.png), [small scaled menu](menu-small-webkit.png)

Inspected normal keyboard menu and the scrolled 150×140 host at 0.8 scale. Focus
is visible on menu items, disabled text is readable, and the menu stays clipped
inside the host. Supplied default/edit/drag references were inspected before work.
Existing map appearance is unchanged; exact accepted-default comparisons are in
the expanded gate. Screenshots are candidates for user review, not new baselines.

Final gate passed: typecheck/build, 163 unit tests, **117 browser cases** in
Chromium/Firefox/WebKit with no skips/failures, including the three exact accepted-A
PNG comparisons. Inspected accessibility snapshots with explicit nested groups.
Stage 8 is technically complete. Stage-9 release validation follows.
