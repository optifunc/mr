# Installed browsers and manual release matrix

Machine: macOS Darwin 25.6.0, arm64 Apple M2, 8 logical CPUs, 16 GB RAM.
Inspected [installed application metadata](environment.json) on 2026-09-10. Playwright engine automation
is recorded separately from actual application and human assistive-technology checks.

| Required check | Status | Evidence / next action |
|---|---|---|
| Pinned Chromium, Firefox, WebKit | Automated gate recorded in [full log](../browser.txt) | Versions in [profile JSON](../performance/profile-chromium.json) and package results; these are bundled engines |
| Installed Google Chrome 152.0.7977.83 | 98 browser cases passed, then all 12 final lifecycle/menu cases passed | `MINDMAP_BROWSER_CHANNEL=chrome MINDMAP_EVIDENCE=docs/evidence/milestone-d/installed-browsers pnpm test:browser tests/browser/menu.spec.ts tests/browser/interaction.spec.ts tests/browser/editing.spec.ts tests/browser/clipboard.spec.ts tests/browser/drag.spec.ts tests/browser/api.spec.ts tests/browser/integration.spec.ts --workers=1` |
| Current stable Chrome | Not run | Installed 152 is behind the published 153 rollout. Re-run against current Chrome at release |
| Current stable Edge | Not run | No Microsoft Edge application installed. Install/use stable Edge on the release verification host and run the same gesture checklist (`MINDMAP_BROWSER_CHANNEL=msedge`) |
| Current stable Firefox application | Not run | No Firefox application installed. Bundled Playwright Firefox is separate evidence. Run the product checklist in current Firefox |
| Actual Safari 26.6.2 | Not run: driver refused session | [Raw Safari response](safari.json). Enable Allow Remote Automation in Safari's Developer settings on a verification host, then run `python3 scripts/safari-check.py` for the launch smoke and the full user gesture checklist manually |
| VoiceOver + Safari | Not run | No human screen-reader session/audio verification available. Verify the checklist below on macOS/Safari |
| NVDA + supported Windows browser | Not run | No Windows/NVDA verification environment. Run the checklist on Windows with current Chrome/Edge/Firefox |
| Real OS IME | Not run | Synthetic composition guards pass in automation; use an actual Japanese/Chinese input method for composition, Enter, blur and resize |
| Physical input-to-display / pan-zoom smoothness | Not run | Rendering-opportunity metrics and frame traces do not establish physical screen presentation. Check on reference hardware/display; investigate tails in [performance report](../performance/report.md) |

Google announced Chrome 153.0.8010.36/.37 for Windows/Mac on September 8, 2026,
with rollout over days/weeks. Thus installed 152 coverage cannot be represented as
the current-release gate. [Official Chrome release announcement](https://chromereleases.googleblog.com/2026/09/stable-channel-update-for-desktop_0808145027.html).
Safari's required automation switch is documented by Apple; the driver refusal
matches that configuration requirement. [Apple WebDriver documentation](https://developer.apple.com/documentation/webkit/testing-with-webdriver-in-safari).

The first Chrome run reused the profiler's managed Vite server, which exited when
the profiler completed: 91 cases failed with connection refusal, 5 passed after the
persistent server started. This is harness failure, not widget compatibility evidence.
The [initial log](initial-chrome.txt) and [isolated launch diagnosis](chrome-launch.txt) are retained.
[98-case pass](chrome.txt); [12-case final lifecycle pass](chrome-final.txt). The persistent server command is
`pnpm dev --port 5173 --strictPort`. Rerun results supersede that attempt only for
the explicitly tested installed version.

## Screen-reader and keyboard review script

1. Tab from host UI into the map. Verify a single canvas entry point and active
   node label, tree level, position/set size, selected state and read-only state.
2. Navigate both sides with arrows; Shift+arrows and modifier-click create multiple
   selections. Verify the active node belongs to selection and announcements change.
3. Expand/collapse One with Space; enter children, collapse hiding selected nodes,
   and verify expanded/selected announcements. Hidden nodes must not be exposed.
4. On the geometry fixture verify independent checked/unchecked state, Ctrl+Space,
   and add/remove checkbox through the menu. Check labels containing literal HTML,
   whitespace-only and multiline content without spurious controls in Tab order.
5. F2 opens a named textarea. Type, Shift+Enter, commit and cancel; check focus
   returns to canvas. Exercise actual IME composition without premature commits.
6. Shift+F10 opens the named menu. Verify every item's name and disabled state,
   arrows/Home/End, Enter/Space, Escape/Tab and focus return. Repeat near edges in
   a short/scaled host and with an outside text input.
7. Repeat in read-only mode and a second instance. Destroy/remount the first;
   verify no stale accessible nodes, groups, menus, focus targets or event activity.

[Automated tree snapshot](../stage8/accessibility-chromium.yml) and
[menu/browser tests](../../../../tests/browser/menu.spec.ts) verify accessible
attributes/structure and actual keyboard input; they do not establish what a human
hears through VoiceOver or NVDA. No required gate is waived.
