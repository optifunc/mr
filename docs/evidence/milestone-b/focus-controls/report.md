# B focus frame, checkbox shortcut and collapsed-circle controls

2026-09-08. Tested tree: task-only changes based on `f2fdcfa`, recorded in the
commit containing this report. All three changes were approved before implementation.
Continue product review at stage 5; no later milestone has begun.

## Implemented

- Removed the widget's focus-visible outline. It remains focusable, arrow navigation
  and F2 work, selected nodes remain highlighted, and active-descendant semantics
  and focus return from editing remain intact.
- Ctrl+Space toggles existing selected checkbox nodes on every platform, including
  macOS. Bare Space still expands/collapses the active node. Cmd+Space is left
  unhandled by the widget. The textarea retains native shortcut ownership.
- Clicking a collapsed circle expands its node on pointer release over the same
  marker, without selecting it or opening its editor. Layout geometry supplies
  marker hit testing through the existing coordinate conversion, including zoom
  and root/left/right markers. SVG connectors remain pointer-transparent.
  Dragging away or cancelling does nothing; read-only clicks preserve state.
  Expansion goes through the shared command path and undoes in one step.

Requirements, plan, API notes, demo instructions, testing, progress and acceptance
exercises describe the new behavior. The historical focus-color variable remains
available but no longer paints a widget outline.

## Checks

| Check | Result / evidence |
|---|---|
| Pre-fix new Chromium regressions (`FOCUS_CONTROLS_BEFORE=1`) | 6 failed / 1 passed: [reproduction](before-checks.txt); Windows Ctrl+Space already worked |
| `pnpm typecheck` | Passed: [log](checks.txt) |
| `pnpm test` | 114 passed: [log](checks.txt) |
| `pnpm build` | ESM/CSS/declarations passed: [log](checks.txt) |
| `pnpm test:browser tests/browser/focus-controls.spec.ts tests/browser/interaction.spec.ts tests/browser/editing.spec.ts --workers=1` | 90 passed: [log](browser-checks.txt) |
| `pnpm test:browser tests/browser/checkpoint-b.spec.ts --grep accepted-A --workers=1` | 3 passed, exact accepted-default PNGs: [log](appearance-checks.txt) |
| `git diff --check` | Passed |
| Full suite/workload, actual stable browser and OS-level shortcut checks, real OS IME, screen readers, packaged consumer and final release profiling | Not rerun/not run; prior [B gaps](../report.md) remain |

Actual keyboard tests exercise Ctrl+Space with simulated Mac/Windows platform routing,
mixed checkbox selection, unchanged collapse/viewport/layout/selection, one-step
undo, Cmd+Space leaving the document unchanged, ordinary Space, textarea routing,
and read-only rejection. Native system Spotlight behavior is outside browser automation.

Actual pointer down/up tests expand mirrored left/right markers and a collapsed root
at 200% zoom, preserving selection and avoiding editing. Drag/cancel/read-only tests
preserve document, selection, viewport and history. Existing selection, movement,
viewport, editing lifecycle, provisional creation and history regressions also pass.
No test was disabled or tolerance increased. The earlier Command+Space assertion
was changed to the newly approved Ctrl+Space binding.

## Screenshots and review

- Focused widget: [before Chromium](before-focus-chromium.png),
  [after Chromium](after-focus-chromium.png), [Firefox](after-focus-firefox.png),
  [WebKit](after-focus-webkit.png).
- Circle-click expansion retaining A/B selection: [Chromium](after-expanded-chromium.png),
  [Firefox](after-expanded-firefox.png), [WebKit](after-expanded-webkit.png).
  Pointer interaction ran at 200%; these complete-tree captures use 100%.
- Marker results and restored documents: [right Chromium](after-marker-right-chromium.json),
  [left Firefox](after-marker-left-firefox.json), [root WebKit](after-marker-root-webkit.json).
  Equivalent records exist for every engine and marker position.

Before/after focus and expanded-child images were opened and inspected. The frame
is absent, selections remain legible, the child is revealed, and branch/label
geometry remains consistent. All three accepted A default images match byte-for-byte.
Previous evidence and supplied references remain unchanged. New focused images are
product-review candidates, not replacements for the approved default baselines.

Environment: macOS, Node 24.2.0, pnpm 10.28.1, Playwright 1.58.2 with Chromium
145.0.7632.6, Firefox 146.0.1 and WebKit 26.0; 12px Arial/15px line-height, DPR 1,
1400×1000 normal captures and original accepted geometry for default comparisons.

Refresh <http://127.0.0.1:5174/> or run `pnpm dev` and open the printed URL.
Use Select One, then arrows/F2 to check focus. In the checkbox fixture use
Ctrl+Space. Select other nodes and click the circle beside Collapsed node; verify
Hidden descendant appears and selection stays unchanged, then undo once. Repeat
at `/?readonly` to verify expansion is rejected. The demo links this report.

No known defect remains in the verified scope. Continue user review at stage 5;
manual and later release environments remain unverified as recorded above.
