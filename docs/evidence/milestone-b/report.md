# Milestone B — stage-5 product checkpoint

Date: 2026-09-07. Stage 4 commit: `a5f97bc`. Tested stage-5 implementation/evidence: `8e2e3bf`; also recorded in
[progress](../../progress.md). The subsequent handover commit changes documentation
and a live-demo capture only. User acceptance of B is **pending**.
Stages 6–9 have not been started.

## Run and review

The handover demo is running at <http://127.0.0.1:5174/> (5173 was occupied).
[Live demo capture](live-demo.png). For a fresh run, use `pnpm dev` and open the
local URL printed by Vite (normally <http://127.0.0.1:5173>). Use the live reference map.
The demo includes keyboard instructions, selected/active IDs, undo/redo availability,
zoom, recent events, reset, an interleaved-root-side fixture, independent checkbox
geometry, and a live editing/reference comparison. `/?readonly` runs a read-only
primary map; `/?workload` runs 1,000 total / 500 visible nodes.

Repeat all ten [B product exercises](../../acceptance.md#milestone-b-stages-45).
Useful shortcuts through the demo:

1. Select root, Tab → type → Enter creates a right branch; Shift+Tab creates left.
   At a branch, Enter/Shift+Enter creates after/before; Shift+Tab wraps in a parent.
2. “Select B + C”, then Command+Down/Up wraps and reorders the whole block.
   Command+Left promotes into root, then flips left; Command+Right flips it back.
   Use “Interleaved sides fixture” to verify same-side adjacency in a shared array.
3. “Select collapsed node”, Tab → type → Escape restores collapse/selection/history.
   Repeat with Shift+Tab to cancel wrapping. Committing an empty new node is valid.
4. F2 edits the selection. Shift+Enter makes multiline text while connectors stay
   fixed. Enter commits one relayout; Escape restores the old label. Click another
   node or a host control to verify commit, new selection and focus.
5. “Open reference edit” shows the thin-border textarea at the reference label.
   The checkbox fixture can also be edited, including its root and multiline label.

Use Command on macOS and Ctrl elsewhere. The textarea retains native text
shortcuts. Its Tab key can leave the editor; canvas Tab is creation. Clipboard,
links, drag restructuring and menus remain later milestones.

## Gates and coverage

Technical gates passed; final results are linked below and summarized in [progress](../../progress.md).

| Check | Result / reproducible evidence |
|---|---|
| TypeScript strict check | Passed — `pnpm typecheck`, [log](checks.txt) |
| ESM, CSS and declarations | Passed — `pnpm build`, [log](checks.txt) |
| Pure model/layout/interaction/editing tests | Passed — **101 tests**, `pnpm test`, [log](checks.txt) |
| Full Chromium/Firefox/WebKit browser suite | Passed — **150 cases**, `pnpm test:browser --workers=1`, [log](browser-checks.txt) |
| Accepted A default appearance | Passed — exact PNG comparison in the accepted A page shell in every engine |
| Editing screenshot inspection | Passed — default, multiline, committed multiline, root and checkbox captures inspected; user acceptance pending |
| Whitespace check | Passed — `git diff --check` |
| Early target-workload diagnostic | Included in the full browser run; raw per-engine measurements below |
| Actual stable Chrome/Edge/Firefox/Safari | Not run — required stage-9 environments/checks remain |
| VoiceOver/Safari and NVDA/Windows | Not run — manual stage-9 checks remain |
| Real OS IME composition session | Not run — automated composition-event guards are covered; actual input-method review remains explicit |
| Packaged external consumer and final performance profiling | Not run — stage 8–9 work remains |

Requirement mapping for this milestone:

- **2–3 / stages 4–5:** all eight root/non-root insertion key combinations; model
  placement and checkbox defaults; full-selection movement eligibility, both edge
  wraps, one-position moves, interleaved side order, inward promotion on both sides,
  root side inheritance, empty/nonempty destination append, repeated flips, outward
  no-op, stable IDs/subtrees/active selection, reveal, read-only, one-step undo/redo,
  one document event and correct origin. Browser input exercises Command and a
  simulated Win32 platform's Ctrl routing; that simulation is not Windows validation.
- **4–5:** selected initial text, frozen coordinates and layout count while typing,
  native multiline entry, one relayout at commit, unchanged-label no-op, empty
  creation commit, cancellation of collapsed-child insertion and inserted-parent
  wrapping, exact previous structure/selection/redo restoration, long-label scroll.
- **6–7:** central child, mirrored navigation, strict visual-row order and stable
  ties, cross-group navigation, root fallback, collapse-then-enter, pointer toggle,
  root-side sibling and cross-parent ranges, path contraction, select-all, Escape,
  hidden selection cleanup, click versus moved press, empty canvas selection.
- **8–9, 13:** independent checkbox clicks, mixed group toggle, inherited unchecked
  children/siblings, checkbox-free inserted parents, normalized Delete and restored
  selection; geometry-free checked-state updates and one-step transactions.
- **14:** mouse capture panning, wheel axes, pointer-anchored zoom, stepped/reset/fit
  keys, .25–4 clamps, resize preservation, initial zero-size centering/deferred fit,
  no document/history effects and minimal selection reveal without zoom change.
- **16–17, B-relevant subset:** shared API/gesture dispatch, provisional snapshots,
  commit/cancel event ordering, native textarea shortcut ownership, focus/blur,
  re-hit after outside-click relayout, invalid ID/replacement atomicity, reentrant
  callbacks, replacement/destruction with active edits, independent instances.
  Full integration/lifecycle/menu release checks remain D.

## Visual evidence and environment

macOS **26.6.2 (25G83)**, arm64 Apple M2, 16 GiB RAM, Node **24.2.0**, pnpm
**10.28.1**, Playwright **1.58.2**. Bundled browsers: Chromium **145.0.7632.6**,
Firefox **146.0.1**, WebKit **26.0**. Default font: Arial 12px / 15px line-height;
DPR 1, browser zoom 100%, normal widget zoom 100%; checkbox/root editor captures
use widget zoom 150%. Tests normally use 1400×1000; comparison captures use
1440×1200. All four supplied reference images were opened before implementation.

- [Editing side-by-side: Chromium](editing-comparison-chromium.png),
  [Firefox](editing-comparison-firefox.png), [WebKit](editing-comparison-webkit.png).
- [Native editing](editing-chromium.png), [frozen multiline buffer](editing-multiline-chromium.png),
  [committed multiline](committed-multiline-firefox.png).
- [Multiline checkbox editor, 150%](editor-multi-chromium.png),
  [root checkbox editor, 150%](editor-root-webkit.png),
  [checked label editor](editor-checked-firefox.png).
- [Accepted-A regression: Chromium](regression-reference-chromium.png),
  [Firefox](regression-reference-firefox.png), [WebKit](regression-reference-webkit.png).
- [Alignment measurements: Chromium](editing-chromium.json),
  [Firefox](editing-firefox.json), [WebKit](editing-webkit.json).

The original default tree and the separate 100%-DPI label variant are retained.
The older editing reference is displayed at half its supplied 1248×608 raster size
beside a live 605×324 fixture, with roots aligned at approximately (224,156).
The older image has different branch spacing, label widths/spelling and font
rasterization. The new editor follows the accepted 12px A geometry: its border
surrounds the label, checkbox stays separate, SVG strokes remain unchanged, and
only the textarea grows/scrolls while typing. A multiline buffer can cover nearby
nodes temporarily; commit relayouts them. These are visible comparisons, not a
claim of pixel identity to the older supplied editing raster.

The longer B demo shifts fractional page coordinates. Its regular Chromium/Firefox
screenshots consequently had an approximately one-pixel capture/raster phase shift.
The permanent regression fixture restores the **accepted A page shell**, and all
three reference PNGs then match the approved files **byte for byte**. No baseline,
reference image, or screenshot tolerance was changed. Editing images remain new
review candidates and have not been approved as regression baselines.

## Corrections and retained runs

- Stage 4: [initial full run](stage4/browser-checks.txt) passed 69 cases; three old
  focus cases expected Tab to leave the canvas. Tab is now the required insertion
  binding. The test uses actual pointer entry into the second mount instead;
  [all three reruns passed](stage4/mount-checks.txt).
- [First editing/interaction run](editing-initial-checks.txt): 66 passed.
- [Initial B full run](browser-initial-checks.txt): 129 passed; six cases represented
  two API tests in three engines that expected immediately committed insertion.
  Corrected them to verify provisional selection before commit and to explicitly
  finish creation before checking document-event reentrancy. The exact event
  sequence remains asserted. [Follow-up](followup-checks.txt): 36 passed.
- [Contention run](browser-contention-checks.txt): 103 passed, 4 timed out, 3 were
  interrupted and 37 did not run during a host load-average spike above 180. Stopped
  that run and used one worker without changing timeouts or assertions.
- [Single-worker follow-up](deferred-fit-checks.txt): 149 passed; Firefox reproduced
  a deferred-fit race after a zero-width interval returned to the previous width
  before ResizeObserver delivery. Requesting fresh observation fixes the coalescing
  case. The unchanged test and all 150 final cases then passed.
- Fixed destruction from an edit-completion callback so a following content command
  cannot mutate the destroyed instance. Fixed initial zero-size centering.
- Bounded the textarea to the available viewport for very long/multiline labels;
  its scrolling remains native. Provisional Escape also restores the pre-creation
  view. These changes have dedicated browser coverage.

## Workload and known limits

Raw diagnostic data: [Chromium](workload-chromium.json),
[Firefox](workload-firefox.json), [WebKit](workload-webkit.json).
Each verifies 1,000 total / 500 rendered nodes and measures cold/uncached and warm
layout paths plus selection. This is the planned early diagnostic, not the final
input-to-paint/frame-trace performance gate. Host-machine contention affects timing.

No known reproducible functional defect remains in the verified B scope. Product
acceptance of navigation/editing and the new editing appearance is pending. Actual
OS IME and screen-reader behavior are unverified as listed above. Windows/macOS font
rasterization differences remain explicit. Later clipboard, links, drag feedback,
context menu, packaged-consumer, stable-browser, assistive-technology and final
performance checks are not implemented or waived by this checkpoint.

Next action: user stage-5 product review and requested corrections. Proceed to
milestone C only after the user authorizes that work.
