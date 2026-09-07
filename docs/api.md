# Milestone B API checkpoint

Stages 1–5 are implemented; this checkpoint stops before clipboard, links, dragging and menus. The complete contract
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
  exhausted edges stay selected. Root entry and Left/Right retain their behavior.
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
- Events currently emitted: `documentchange`, `selectionchange`, `viewportchange`,
  `editstart`, `editcommit`, `editcancel`, and `error`.
  Mutation events follow installation/rendering, document before selection.
  Listener exceptions are isolated; listener-triggered commands queue after the
  current event batch in FIFO order, including work enqueued by queued commands.
  Every document listener receives its own detached snapshot.
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

Every insertion command opens the new node's textarea, including API insertions
with a supplied initial `text`. It is selected for editing. Creation and its initial
label commit form one transaction. `getDocument()` includes the provisional
structure and its initial text, but excludes the textarea buffer. Hosts should
persist committed `documentchange` snapshots, not edit-time snapshots.

Enter commits; Shift+Enter inserts a native newline; Escape cancels. Outside
pointer actions commit before hit testing the new layout. Focus leaving the textarea
also commits; it does not steal focus back from the destination. IME composition
Enter is guarded. Normal text shortcuts, including Command/Ctrl+arrows, stay inside
the textarea. The editor is bounded to the available viewport and scrolls long text;
scene geometry remains frozen until commit. Explicit refresh/font invalidation is
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

Unsupported clipboard/link commands currently return false. `contextMenu` is
reserved; menus arrive at stage 8. Node dragging remains stage 7. Read-only allows
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
above selection fills. Nodes have no additional focus outline; the canvas retains
its keyboard-focus indication and active-descendant semantics. Checkboxes retain
native input semantics with an explicit green fill and white tick, avoiding native
WebKit tinting; forced-color mode uses native appearance.

Selection only updates affected highlights/ARIA state and does not relayout.
Checked-state changes reconcile controls without measuring or relayout; presence
changes do relayout. DOM IDs are instance-specific and labels are always text.
The tree entry point, active descendant, levels, ownership, selection, expansion,
and checkbox states are preliminary accessibility support; screen-reader validation
and completed keyboard interaction remain milestone D work.
