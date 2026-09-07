# Milestone A API checkpoint

This is the stages 1–3 foundation, not the completed editor. The complete contract
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
  `setText`, `delete`, `move`, `toggleCollapse`, `expand`, `collapse`,
  `addCheckbox`, `removeCheckbox`, and `toggleChecked`.
- Optional target IDs use the active node by default; optional ID groups use
  selection. `move` takes `destination: { targetId, position, side? }`, with
  `position` of `before`, `after`, or `child`; side applies to root child drops.
- `focus`, `refreshLayout`, event subscription/unsubscription, idempotent `destroy`.
- Events currently emitted: `documentchange`, `selectionchange`, `error`.
  Mutation events follow installation/rendering, document before selection.
  Listener exceptions are isolated; listener-triggered commands queue after the
  current event batch. Every document listener receives its own detached snapshot.
- Read-only rejects every implemented content command, including history and
  collapse. Host replacement and selection remain available. No-op commands return
  false and create no history. Invalid document construction throws `MindMapError`;
  invalid replacement/commands emit `error` and leave state intact.

For this checkpoint, insertion reducers commit the supplied `text` (default empty)
immediately. Stage 5 will coordinate these prepared patches with provisional
creation and the textarea so creation plus its initial edit becomes one commit.
The stage-5 editing experience is not claimed by the current API.

The command union and event types reserve the remaining full-product contract.
Unsupported commands currently return false. Clipboard/link/menu/edit events are
not emitted yet. `contextMenu` is reserved; no menu exists at this checkpoint.
`editNode`, `panToNode`, `fit`, `setZoom`, and `getViewport` arrive in later stages.
No node mouse/keyboard editing, checkbox gesture, navigation, pan, zoom, clipboard,
link opening, or drag behavior is implemented yet. Demo buttons exercise the same
model command facade that future gestures will use.

## Theme and layout

Set custom properties on `.your-host .mindmap`, then call `refreshLayout()` after
changing font, measurement, or spacing properties. Font-loading completion also
invalidates measurements. Colors update directly through CSS. All distances below
are unzoomed CSS pixels; spacing custom properties expect nonnegative pixel values.
Labels preserve whitespace and explicit newlines and never wrap automatically.

| Properties (all prefixed `--mindmap-`) | Defaults |
|---|---|
| `font-family`, `font-size`, `line-height` | Arial/Helvetica/sans-serif, 12px, 15px |
| `text-color`, `background`, `line-color`, `line-width` | #111, #fff, #888, 1px |
| `selection-color`, `focus-color` | #d2d2d2, #777 |
| `label-padding-x`, `label-padding-y` | 6px, 2.5px |
| `label-offset-y` | 2px downward, clamped to `label-padding-y` |
| `root-padding-x`, `root-padding-y` | 11px, 12px |
| `sibling-gap`, `branch-gap`, `root-gap` | 3px, 20px, 20px |
| `marker-radius`, `chain-rise` | 2.5px, 1.5px |
| `checkbox-size`, `checkbox-gap` | 11px, 3px |
| `checkbox-color` | #339933 |
| `checkbox-raise` | 1px above the label block center |

Measurement uses hidden, inert DOM labels with the same CSS as visible labels,
caches unique text/checkbox/root combinations until invalidation, and batches reads
before scene writes. Only visible nodes get geometry or DOM elements. Layout uses
subtree envelopes that include multiline heights, single-child rise, and markers.
The SVG and HTML share one translated scene. Normal mounting centers the root at
100%; resizing recenters the stage-A scene without recomputing world layout.

Non-root content uses 4.5px top and 0.5px bottom padding by default. This moves
text closer to its branch without changing row height or subtree spacing. Root
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
