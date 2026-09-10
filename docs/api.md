# Mind map widget API

Stages 1–8 are implemented; stage-9 release evidence and remaining environment checks are recorded in acceptance. The complete contract
remains in [requirements](requirements.md). See [acceptance](acceptance.md) for
verified behavior and pending interaction stages.

```ts
import { MindMapEditor } from '@mindmap/widget';
import '@mindmap/widget/styles.css';

// The host must have a measurable width and height.
const editor = new MindMapEditor(host, {
  document: {
    root: {
      id: 'root', text: 'Plan', children: [
        { id: 'first', text: 'First branch', side: 'right', children: [] },
      ],
    },
  },
  historyLimit: 100,
  readonly: false,
  // createNodeId: () => crypto.randomUUID(),
});
const unsubscribe = editor.on('documentchange', ({ document }) => {
  // Detached snapshot, safe for the host to retain or modify.
  console.log(document);
});
editor.setSelection(['first']);
editor.execute({ type: 'setText', targetId: 'first', text: 'Two\nlines' });
editor.undo();
// When the host is removed:
unsubscribe();
editor.destroy();
```

## Available now

- `getDocument`, validated atomic `setDocument`, detached `getSelection`, and
  `setSelection(ids, activeId?)`. Hidden IDs are omitted from selection; an explicit
  active ID must belong to the requested IDs. Replacement clears history/selects root.
- `execute`, `canExecute`, `undo`, `redo`, `canUndo`, `canRedo`.
- Content reducers: `insertChild`, `insertBefore`, `insertAfter`, `insertParent`,
  `setText`, `delete`, `move`, `moveSelection`, `toggleCollapse`, `expand`, `collapse`,
  `addCheckbox`, `removeCheckbox`, and `toggleChecked`.
- Optional target IDs use the active node by default; optional ID groups use
  selection. `move` takes `destination: { targetId, position, side? }`, with
  `position` of `before`, `after`, or `child`; side applies to root child drops.
- `navigate` with `direction` and optional `extend`: Up/Down prefers visible
  siblings, then same-depth nodes in adjacent branches on the same root side.
  If those are absent in the requested direction, it falls back to the nearest
  shallower node on that side, excluding ancestors. Deeper nodes are ineligible;
  exhausted edges stay selected. When root is active, Up/Down is a no-op even
  with `extend`: `canExecute` and `execute` return false. Left/Right retains its behavior.
  `extend` follows the same destinations and contracts on reversal.
  Also available: `selectAll`, `clearSelection`,
  `edit`, `zoomIn`, `zoomOut`, `resetZoom`, and `fit`.
- `moveSelection` takes a `direction` arrow; it requires the entire selection to
  be a contiguous sibling block on one root side. It wraps, promotes, or flips
  as specified in requirements §9.1 and preserves selection/active IDs.
- `focus`, `editNode(id)`, `refreshLayout`, event subscription/unsubscription,
  and idempotent `destroy`.
- `getViewport`, `setZoom(scale)`, `fit`, `panToNode(id)` (minimal reveal of a visible
  node), and `panTo(x, y)` (absolute scene translation in local CSS pixels). Zoom
  clamps to .25–4; keyboard steps multiply/divide by 1.2. Viewport never enters history.
  Primary-modifier+Shift+physical Digit0 fits even when its character is `)`;
  unshifted zero resets zoom.
- Events currently emitted: `documentchange`, `selectionchange`, `viewportchange`,
  `editstart`, `editcommit`, `editcancel`, `commandcomplete`, `linkopen`, and `error`.
  Mutation events follow installation/rendering, document before selection.
  Listener exceptions are isolated; listener-triggered commands queue after the
  current event batch in FIFO order, including work enqueued by queued commands.
  Viewport notifications retain animation-frame coalescing while using this queue;
  reentrant `panTo`, `setZoom`, `fit` and `panToNode` also wait for the batch to finish.
  Calls outside a notification still apply synchronously. Destroy discards pending
  work and remaining notifications. Every document listener receives its own detached snapshot.
- Read-only rejects every implemented content command, including history and
  collapse. Host replacement and selection remain available. No-op commands return
  false and create no history. Invalid document construction throws `MindMapError`;
  invalid replacement/commands emit `error` and leave state intact.

JavaScript command input is validated before transaction installation. `setText`
requires a string (including the empty string); insertion text may be omitted.
Move destinations require a known target and `before`, `after`, or `child`, with
an optional `left`/`right` side. Malformed input returns false and emits
`INVALID_DOCUMENT` for shape/text errors or `INVALID_TARGET` for target/destination
errors. It leaves document, selection, rendered geometry, and undo/redo intact;
`canExecute` returns false without emitting an event.

## Editing and provisional creation

Typing a printable character while the map has an active node starts a user edit,
replacing the buffer with that character and placing the caret after it. Multiple
selection narrows to the active node. The original document text stays unchanged
until commit; Escape restores it and preserves redo. Space remains collapse;
modifier shortcuts, composition keys and read-only mounts do not start replacement.
F2, click-to-edit and `editNode` still open and select the existing text.

Every insertion command opens the new node's textarea, including API insertions
with a supplied initial `text`. It is selected for editing. Creation and its initial
label commit form one transaction. `getDocument()` includes the provisional
structure and its initial text, but excludes the textarea buffer. Hosts should
persist committed `documentchange` snapshots, not edit-time snapshots.

Enter commits; Shift+Enter inserts a native newline; Escape cancels. Outside
pointer actions commit before hit testing the new layout. Focus leaving the textarea
also commits; it does not steal focus back from the destination. IME composition
Enter is guarded. Normal text shortcuts, including Command/Ctrl+arrows, stay inside
the textarea. Host resize re-bounds and reveals the same editor, retaining its
buffer, caret, focus and native undo; the tree layout stays frozen. Zero-size hosts
defer this adjustment until measurable. The editor is bounded to the available viewport and scrolls long text
without a horizontal scrollbar. New nodes, including wrapped parents, use the
eight-M default plus padding/borders.
For nodes without visible children, use the larger of this default and their
rendered node width; expanded existing parents
match the selection-box width. Sizing uses the current font and is capped by the
viewport. Compact left editors expand outward while preserving the existing text
position on entry. Bottom border centers meet the branch baseline without moving
the text; root retains its label-aligned vertical frame. Editor and scene geometry
stay frozen while typing; multiline overflow scrolls inside the textarea. Explicit refresh/font invalidation is
deferred until the edit finishes.

Creation selection is observable immediately (`selectionchange`, then `editstart`).
No document event or history entry exists until commit. Commit emits one
`documentchange`, any resulting selection change, then `editcommit`. Edit events
contain `{ id, provisional, origin }`, with the origin of the initiating edit.
Unchanged existing-label commits emit `editcommit` without document history.
Cancelling creation restores structure, collapse state, selection, and its prior
viewport; emits any selection change followed by `editcancel`; and preserves redo.
Cancelling an existing edit discards only the buffer.

Public content commands finish the current edit before running. Valid replacement
and destruction discard unfinished edits; replacement keeps the current viewport
and resets selection/history. Invalid replacement preserves the editor and buffer.
`canUndo`/`canRedo` describe committed history, so an uncommitted creation alone
has no undo entry. Calling public `undo()` first commits that edit and then undoes
it. Inside the textarea, the keyboard undo shortcut remains native text undo.

`contextMenu` defaults to true; set false to retain the native browser context menu and use host UI commands. Read-only allows
selection, visible navigation and viewport changes; user mutation gestures are
silent no-ops, while API mutation attempts report `READ_ONLY`.

## Theme and layout

Set custom properties on `.your-host .mindmap`, then call `refreshLayout()` after
changing font, measurement, or spacing properties. Font-loading completion also
invalidates measurements. Colors update directly through CSS. All distances below
are unzoomed CSS pixels; spacing custom properties expect nonnegative pixel values.
Labels preserve whitespace and every explicit newline, including the final empty
row of a trailing newline, and never wrap automatically. Empty text occupies one
row. Measurement and rendering use the same line-box behavior without adding text.

| Properties (all prefixed `--mindmap-`) | Defaults |
|---|---|
| `font-family`, `font-size`, `line-height` | Arial/Helvetica/sans-serif, 12px, 15px |
| `text-color`, `background`, `line-color`, `line-width` | #111, #fff, #888, 1px |
| `selection-color`, `focus-color` | #d2d2d2, #777 |
| `label-padding-x`, `label-padding-y` | 6px, 2.5px |
| `label-offset-y` | 0.5px downward, clamped to `label-padding-y` |
| `root-padding-x`, `root-padding-y` | 11px, 12px |
| `sibling-gap`, `branch-gap`, `root-gap` | 3px, 20px, 20px |
| `root-sibling-gap` | 4.5px between root-level subtree extents |
| `marker-radius`, `chain-rise` | 2.5px, 1.5px |
| `checkbox-size`, `checkbox-gap` | 13px, 4px |
| `checkbox-color` | #339933 |
| `checkbox-raise` | 1px above the label block center |

Measurement uses hidden, inert DOM labels with the same CSS as visible labels,
caches unique text/checkbox/root combinations until invalidation, and batches reads
before scene writes. Sizes are fractional local CSS dimensions, independent of
ancestor transforms; host scaling is applied once by the browser, including when
mounting or refreshing a scaled host. Only visible nodes get geometry or DOM elements. Layout uses
subtree envelopes that include multiline heights, single-child rise, and markers.
The SVG, HTML and textarea share one translated/scaled scene. Normal mounting
centers the root at 100%. Resize preserves the view without relayout; initially
zero-size hosts center when measurable, and a pending fit runs at that point.

Non-root content uses 3px top and 2px bottom padding by default. This moves
text toward its branch while reserving room for descenders, without changing row
height. Root-level subtree spacing is independent of the 3px inner sibling gap. Root
text remains centered. Checkboxes sit 1px above the label block center for optical
alignment, including beside multiline labels.

The Windows 100% DPI reference calibrates the default size. A selected root fills
its entire ellipse; non-root selections remain rectangular. SVG strokes render
above selection fills. Neither the active node nor the focused widget draws an
additional focus outline. Keyboard focus and active-descendant semantics remain. Checkboxes retain
native input semantics with an explicit green fill and white tick, avoiding native
WebKit tinting; forced-color mode uses native appearance.

Selection only updates affected highlights/ARIA state and does not relayout.
Checked-state changes reconcile controls without measuring or relayout; presence
changes do relayout. DOM IDs are instance-specific and labels are always text.
The tree entry point exposes multiselection/read-only state, active descendant, levels,
group ownership, selection, expansion and checkbox states. Keyboard accessibility is
automated; actual screen-reader validation is recorded separately in release evidence.

## Focus and direct controls

Ctrl+Space toggles selected checkbox nodes on every platform, including macOS.
Cmd+Space is not handled by the widget; bare Space still expands/collapses the
active node. Inside the textarea, native text input owns these shortcuts.

Clicking a collapsed circle expands its node through the shared `expand` command,
without selecting that node or opening its editor. Expansion occurs on release
over the same marker after a click; dragging away or cancellation does nothing.
Read-only mode preserves document and selection. Effective expansion produces one
user-origin document change and one undo entry. Existing SVG accessibility and
keyboard equivalents remain unchanged. The historical `focus-color` theme variable
is retained but no longer paints a widget focus frame.

## Clipboard and links

`copy` and `cut` accept optional `ids`; `paste` accepts optional `targetId`. Missing
targets use the current selection/active node. A true return means the clipboard
request was accepted, not that access or mutation succeeded. `canExecute` does not
access the clipboard. Native keyboard shortcuts use copy/cut/paste events; public
requests use the Clipboard API. Textarea shortcuts keep native text behavior.

One request may be pending per instance. Additional requests report `CLIPBOARD_BUSY`.
Selection and viewport changes never retarget pending work. Cut/paste reject with
`CLIPBOARD_STALE` after a document mutation/replacement or a new edit (even when
cancelled); copy still writes its captured text. Destroy suppresses late events.
A stale cut may have written the clipboard but never deletes the changed map.
Denial/unavailability reports `CLIPBOARD_DENIED`/`CLIPBOARD_UNAVAILABLE`. No hidden
clipboard UI or fallback document mutation is used.

The entire paste parses and allocates IDs before one transaction. Pasting expands
the destination to reveal the inserted children; pasted subtrees start expanded.
An explicit target hidden by an ancestor remains hidden; selection stays on its
nearest visible ancestor and completion still reports the newly inserted roots.
Root pastes use the right side. Copy includes collapsed descendants, normalizes
selected ancestors, and preserves visual order. Copy uses four spaces per level.
Paste counts spaces in each leading space/tab prefix across the whole input: all divisible by four selects width four; otherwise
all even selects width two; odd counts reject. Tabs always add one level and can
mix with spaces. Ambiguous input prefers four, with no fallback. The first node
must be unindented and depth may increase by at most one. A literal leading label
space is escaped as `\ `, including on whitespace-only labels.
LF/CRLF, checkbox prefixes, backslash/newline/tab/bracket/leading-space
escapes, unknown escapes and empty physical lines follow the plan. One terminal LF
is consumed; empty clipboard text is a successful no-op with no history.

Successful clipboard requests emit `commandcomplete` with `{command, origin, ids}`.
For paste these IDs are the new top-level nodes; copy/cut report normalized source
roots. Cut/paste emit their one `documentchange` and any selection change before
completion. Errors emit no completion. Public clipboard requests finish an active
edit before capture; native textarea clipboard events never enter this path.

`openLink` accepts an optional target ID. Whole trimmed HTTP(S) labels use
standard blue (#0000EE) without a text underline; their branch lines stay unchanged.
Embedded URLs and labels containing internal whitespace are plain
text. Primary-modifier label clicks and the API emit cancellable `linkopen` before
opening `_blank` with `noopener,noreferrer`. Branch/padding clicks still toggle
selection. A policy listener exception prevents opening and emits `HOST_CALLBACK`.
Copy and links are available in read-only mode and create no document history.

## Mouse restructuring

Drag a selected non-root node by more than four screen pixels to move the normalized
selection in rendered visual order. An unselected press selects one source first.
A compact label overlay follows the pointer. Top/bottom quarters insert before/after
and take precedence at corners. The outward half of the middle makes children;
the inward half nearest the parent inserts before above the vertical midpoint,
or after at/below it (mirrored on left branches). The horizontal midpoint belongs
to the outward child zone. Root halves append on that side. Valid drops use the
regular arrow cursor. The darkest gradient edge marks the receiving edge. No-op/cyclic targets have no gradient and use a
prohibited cursor. Gradient colors do not change document or layout.

Preview and commit share `move` applicability. Every effective release creates one
transaction, retaining IDs and subtrees. Root-side interleaving alone is not an
effective move. Child drops preserve a collapsed target; hidden moved nodes select
the visible target until expansion. Root moves and read-only dragging are disabled.

Escape, pointer cancellation, capture loss, document replacement/mutation, a new
edit and destruction cancel the gesture and remove feedback. Edge autopan runs on
animation frames and re-tests the stationary pointer after each viewport change;
it stops immediately on completion/cancellation. Pan is view state, so cancelling
a drag retains the resulting viewport and never adds history.

## Context menu and lifecycle

Right-click a node, Shift+F10 or the Context Menu key opens the built-in menu.
Right-click on an unselected node selects it; a selected node preserves the group
and its active node. Target commands use that active node and group commands use
the selection. All 13 entries retain their order; unavailable commands are disabled,
including link and checkbox actions. Labels switch Expand/Collapse and Add/Remove
checkbox according to the active node. Root insertion entries retain the documented
root keyboard insertion behavior.

Up/Down wraps through every item, including disabled items for discoverability;
Home/End moves to the endpoints. Enter/Space activates an enabled item. Escape/Tab
closes and returns focus to the canvas. The menu scrolls within small hosts, stays
unscaled by map zoom, and accounts for host CSS scale. Outside pointer/focus closes
it without stealing host input focus. Textareas retain their native context menu.
Document changes, selection replacement, viewport moves, resize, a new edit and
destruction close the menu. Invalid replacement leaves it intact. Menu commands
use the shared command/clipboard path and emit user origins.

`viewportchange` carries `{x, y, zoom, origin}`; coalesced events report the origin
of the last effective viewport update in that frame. `getViewport()` remains
`{x, y, zoom}`. `linkopen` also carries `origin`, along with id/url/preventDefault.
Public methods and host layout/resize adjustments use api; gestures use user.

Destroy is idempotent and removes owned DOM, the menu's temporary outside listeners,
input/clipboard handlers, font/resize observers and scheduled frames. It cancels
unfinished edits and drags and suppresses late clipboard results. Caller-owned
host content and attributes are preserved. Queries retain the final detached state;
mutating calls after destruction return false or do nothing, and new subscriptions
return inert unsubscribe functions.
