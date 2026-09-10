# C review — fit shortcut, editor resize and viewport event queue

Approved on 2026-09-10, based on clean `0161591`. The commit containing this report
records the tested changes. Stage-7 product review remains the checkpoint; stages
8–9 are not started.

1. Fit accepts Primary-modifier+Shift+physical Digit0 even when `key` is `)`.
   Unshifted zero still resets zoom. The earlier test now asserts actual fit;
   new physical-key cases verify both Command and Ctrl routing and visible bounds.
2. Host resize reapplies active-editor caps and pans to reveal the same textarea.
   Frozen initial geometry and preferred size retain normal alignment; the buffer,
   caret, native undo and focus survive shrink/grow and a zero-size interval.
   Tall root alignment padding is reduced when it would exceed the frame cap.
   The tree does not relayout and resize creates no document/history entry.
3. Animation-frame viewport notifications now dispatch through the FIFO queue.
   Public panTo/setZoom/fit/panToNode calls made by listeners also queue. All
   listeners see the same settled state before queued mutations run. Internal
   viewport operations remain immediate so command return/no-op checks stay valid.
   Frame coalescing, exception isolation and destroy cancellation remain.

## Try it

Start `pnpm dev` and open its printed URL, or use the review demo at
http://127.0.0.1:5175/. Pan/zoom away and press Command+Shift+0 (Ctrl on other
platforms); the whole reference map should fit. Command/Ctrl+0 resets zoom.

Select Child of a single child, press F2 and type. In browser devtools resize the
host while editing, without clicking back on the page (which would commit):

```js
Object.assign(document.querySelector('#primary').style, { width: '320px', height: '240px' });
```

The editor should remain inside the host with its buffer intact. Grow the host,
continue typing, and cancel; repeat on a left node and at 200% zoom. The native
browser regression cases also exercise multiline roots, zero size and native undo.
For event ordering, the retained queue JSON and browser test show listener start/end,
second-listener notification, then the queued document change and next viewport batch.

## Checks and corrections

Passed: strict typecheck, ESM/CSS/declaration build, **163 unit tests** and
**267 browser cases**, with no failures or skips in the final run. This includes
45 new review-fix cases and all three exact accepted-A default PNG comparisons.
Whitespace and local evidence-link checks passed. No known defect remains in
these three fixes. Reproduce with the commands in
[testing](../../../testing.md#stage-7-interaction-review-fixes-2026-09-10).

- [Typecheck/build/unit log](checks.txt).
- [Browser regression log](browser.txt).
- [Pre-change log](before-browser.txt): all three targeted Chromium regressions
  failed. Independent triage had reproduced each issue in all three engines.
- [Initial regression](initial-browser.txt): 264 passed, 3 failed. At 200% the
  tall root ellipse's alignment padding exceeded the width cap and CSS expanded
  the frame to about 592 screen pixels inside a 320px host. The fix reduces
  excessive padding; no tolerance was relaxed. [Intermediate capture](intermediate-root-padding-chromium.png)
  and [measurement](intermediate-root-padding-chromium.json) retain that evidence.

## Evidence

- Original resize reproduction: [before](before-resize-chain-1-chromium.png),
  [after](after-resize-chain-1-chromium.png), [bounded geometry](after-resize-chain-1-chromium.json).
- Zoomed/multiline: [left Firefox](after-resize-c21-2-firefox.png),
  [root Chromium](after-resize-root-2-chromium.png), [root WebKit](after-resize-root-2-webkit.png).
- Fit: [before](before-fit-MacIntel-chromium.json), [after](after-fit-MacIntel-chromium.json),
  [Ctrl routing](after-fit-Win32-firefox.json).
- Listener ordering/state: [before](before-queue-panTo-chromium.json),
  [after pan](after-queue-panTo-chromium.json), [zoom](after-queue-setZoom-firefox.json),
  [fit](after-queue-fit-webkit.json), [reveal](after-queue-panToNode-chromium.json).
- [Editing reference comparison](editing-comparison-chromium.png),
  [accepted-default capture](regression-reference-chromium.png).

Environment: pinned Playwright 1.58.2 engines on macOS, default 1400×1000 viewport
(reference comparison 1440×1200), DPR 1, 12px Arial/15px line height, 100% and 200%
zoom. Ctrl tests override navigator.platform; real Windows/stable-browser behavior
is not claimed. The supplied editing reference and representative resized editor
screenshots were inspected. New images are review candidates; accepted baselines
and previous evidence are preserved.

Full milestone/workload, actual-stable-browser, manual IME/screen-reader,
packaged-consumer and release performance gates were not rerun. Existing gaps
remain in the [C checkpoint report](../report.md); no release gate is waived.
