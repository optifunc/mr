# FreeMind-like Mind Map Editor Widget

Status: Draft requirements specification  
Target: First implementation  
Language: TypeScript  
Last updated: 2026-09-07

## 1. Purpose

The product is a framework-independent TypeScript widget that provides the core
editing surface for a mind-map application inside an HTML page.

The widget owns the interactive editing state while it is mounted. The host
application supplies and retrieves map data, invokes commands, and subscribes
to events. Persistence, file formats, application toolbars, authentication,
collaboration, and other application-level concerns are outside this widget.

The visual design and interaction model shall closely reproduce the reference
images in the "free-mind-references" directory:

- "FreeMind-reference-100dpi.png" (primary reference for default proportions and root selection)
- "FreeMind-reference1.png"
- "FreeMind-reference-editing.png"
- "FreeMind-reference-DnD.png"

## 2. Scope

### 2.1 Included

- A single editable mind map with one central root.
- Ordered branches on the left and right of the root.
- Arbitrarily nested ordered descendants.
- Automatic layout.
- Selection and multiple selection.
- Comprehensive keyboard editing and navigation.
- Mouse selection, editing, panning, zooming, and drag-and-drop.
- Plain-text labels, including multiline labels.
- URL nodes whose complete label is a URL.
- Optional independent checkboxes.
- Collapse and expand.
- Cut, copy, and paste using an indented plain-text format.
- Undo and redo of content changes.
- A built-in context menu.
- A public TypeScript API and emitted events.

### 2.2 Excluded from the first version

- Saving, loading, autosave, and a proprietary document format.
- Cloud services, collaboration, history synchronization, and merge handling.
- Touch and pen input.
- Rich text, per-node formatting, icons, embedded images, and attachments.
- Free-positioned nodes or manual connector routing.
- Application chrome such as a toolbar, menu bar, file picker, or status bar.

## 3. Terminology

- Root: the one central node.
- Root child: a direct child of the root. It has a side, either "left" or
  "right".
- Branch: a root child and all of its descendants.
- Parent, child, and sibling: structural relationships in the map.
- Visible node: a node not hidden by a collapsed ancestor.
- Active node: the node used as the origin for navigation and commands. It is
  part of the selection.
- Selection anchor: the node from which range selection is extended.
- Primary modifier: Ctrl on Windows/Linux and Command on macOS.
- Inward: horizontally toward the root.
- Outward: horizontally away from the root.

## 4. Data model

The public data model shall express the following information:

~~~ts
type NodeId = string;
type RootSide = "left" | "right";

interface MindMapNode {
  id: NodeId;
  text: string;
  children: MindMapNode[];
  collapsed?: boolean;
  checked?: boolean;
}

interface RootChild extends MindMapNode {
  side: RootSide;
}

interface MindMapDocument {
  root: Omit<MindMapNode, "children"> & {
    children: RootChild[];
  };
}
~~~

Requirements:

- Exactly one root shall exist.
- IDs shall be unique, nonempty, and stable across edits that do not replace
  the node.
- Child array order shall define sibling order.
- A root child shall explicitly store its side. Descendants inherit the side of
  their containing root branch.
- The public API shall return snapshots that callers may safely inspect without
  mutating internal state.
- When the widget creates nodes, it shall obtain IDs from a configurable host
  callback, with a collision-resistant default generator.
- Checkbox state is data, not label text. An absent "checked" property means
  that the node has no checkbox; "false" means unchecked and "true" means
  checked.
- Collapse state is included in document snapshots and change events so the
  host can preserve it. Each effective collapse or expand command creates an
  undo/redo entry.

## 5. Visual design

### 5.1 General appearance

- The default theme shall mimic the reference images closely, using the Windows
  100% DPI reference at native size to calibrate default proportions.
- The canvas background shall be white.
- Labels and connectors shall use a compact sans-serif font and neutral
  black/gray colors comparable to the references.
- Non-root nodes shall appear as text resting immediately above a thin
  horizontal branch line, with text-to-line and neighboring-label clearances
  comparable to the native-DPI reference. Descenders, including their visible
  antialiased edges, shall remain clearly separated from the line.
- Parent-child connectors shall be thin, smooth gray curves that merge into
  each node's horizontal branch line.
- The root shall be centered in an outlined horizontal ellipse containing its
  label.
- Children shall fan vertically around their parent, preserving order.
- Left branches shall mirror right branches.
- A collapsed node that has children shall show a small outlined circle at the
  outward end of its branch line, as in the reference. Clicking this circle shall
  expand that node without changing the current selection or opening an editor.
  Expand on release over the same circle after a click, not a drag/cancellation.
  Read-only mode leaves the node and selection unchanged.
- Checkbox nodes shall show a native-looking square checkbox immediately
  before the label, optically aligned with the text (with the text block for
  multiline labels). Checked labels shall remain readable; no strike-through is
  required. The checked background shall be #339933 with a white checkmark.
- A selected non-root node shall use the light-gray rectangular highlight seen
  in the references. A selected root shall fill its entire ellipse with #d2d2d2,
  preserving the outline and readable label. Multiple selected nodes shall each
  be visibly highlighted. Branch lines and the ellipse outline shall render over
  selection backgrounds so their strokes remain unobstructed.
- The active node shall not have a dotted or other additional node focus outline.
  Keyboard focus and active-node accessibility semantics shall remain intact;
  the widget shall not draw a frame/outline when focused.
- Rendering shall remain legible at all supported zoom levels.

### 5.2 Inline editor

- The inline editor shall occupy the label's location. Existing nodes with visible
  children use the gray selection rectangle's width and horizontal bounds. New
  nodes use a default width that fits eight `M` letters in the current font, plus
  padding and borders. For nodes with no visible children (leaves/collapsed),
  use the larger of this default and the rendered node width.
  Width is capped by the viewport and scales with zoom. New parents wrapping a
  visible child retain the eight-M creation default.
- Compact editors on left branches grow outward from the label's right edge;
  preserve the existing text position when opening F2. Root/right compact editors
  anchor at the label's left edge. Long text may require internal scrolling.
- It shall be a rectangular text-editing control with a thin border.
- It shall contain the node's current plain text and select it when editing
  starts, unless editing starts from a direct text-placement gesture supported
  by the browser, or by typing to replace the label.
- Typing a printable character with an active node shall start editing with that
  character replacing the old label, with the caret after it. Shift-produced
  characters retain their case. For multiple selection, edit only the active node.
  Space retains its collapse binding; Control/Command/Alt shortcuts and composition
  keys do not trigger replacement. Empty selection and read-only mode do not edit.
- Shift+Enter shall insert a newline.
- Enter shall commit.
- Escape shall cancel.
- Clicking outside the editor shall commit before processing the click.
- The map layout shall not change while text is being edited.
- The editor frame shall remain fixed during typing, with text scrolling internally.
  Surrounding nodes and connectors retain their pre-edit positions. Never show a
  horizontal scrollbar; horizontal scrolling shall still reveal the caret.
- The editor's bottom border shall align with the node's bottom branch line, with
  no step. Preserve the text position when F2 opens by adjusting height and padding,
  not moving the text. The root has an ellipse rather than a bottom branch line;
  its editor stays vertically aligned to its text. Viewport bounds take priority
  for labels too tall to fit on screen.
- On commit, the widget shall measure the final label and perform one automatic
  relayout.
- On cancellation, the old text and layout shall be restored.
- If editing was started for a newly created node, Escape shall undo that node's
  creation and restore the previous selection.

### 5.3 Drag-and-drop feedback

- Dragging shall show the selected node labels as a compact drag image.
- A valid drop target shall show a gray gradient highlight matching the
  reference image.
- The gradient shall be aligned with the edge or zone that will receive the
  drop:
  - top zone: insert before the target;
  - bottom zone: insert after the target;
  - outward-facing zone: make children of the target;
  - left or right half of the root: place on that root side.
- Before/after and child outcomes shall be visually distinguishable before the
  mouse button is released.
- Invalid targets shall show no valid-drop gradient and shall use a prohibited
  cursor.

## 6. Automatic layout

- Layout shall be derived entirely from tree structure, root-child side, label
  measurements, checkbox width, collapse state, and configured spacing.
- The user shall not assign arbitrary coordinates.
- Root children on each side shall keep their document order from top to
  bottom.
- Descendants shall remain on the side of their root branch.
- Visible sibling subtrees shall not overlap.
- Parent nodes shall be vertically centered relative to the visible extent of
  their children where space permits.
- A single child may share approximately the parent's horizontal baseline, as
  shown in the references.
- Collapsed descendants shall consume no layout space.
- Structural changes, checkbox-presence changes, collapse/expand, document
  replacement, and committed label edits shall trigger layout.
- Selection, checkbox checked-state changes, and editing keystrokes shall not
  trigger layout unless their measured geometry changes.
- Layout shall be deterministic for the same document, viewport-independent
  style settings, and font measurements.

## 7. Selection

### 7.1 Mouse selection

- Clicking an unselected node shall select only that node and make it active.
- Clicking an already selected node without dragging shall start inline
  editing. For a multiple selection, editing starts only if the clicked node is
  the sole selected node; otherwise the click first makes it the sole
  selection.
- Primary-modifier+click shall toggle a node in the selection and make an added
  node active.
- Shift+click shall select a contiguous range when the anchor and target are
  siblings. The range includes both endpoints.
- If Shift+click nodes are not siblings, it shall extend selection along the
  visible navigation order between anchor and target.
- Nodes from different parents may be selected together.
- The root may be selected and edited, but structural operations that would
  remove or move it are disabled.
- Clicking empty canvas shall clear selection unless a command requires an
  active node. The next node click establishes a new anchor.

### 7.2 Keyboard selection

- Plain arrow navigation shall replace the selection with the destination.
- Shift+Arrow shall extend the selection from the anchor through every node
  traversed by the same visual navigation rule.
- Primary-modifier+A shall select all visible non-root nodes. The active node
  shall remain active if it is in that set; otherwise the first node in visual
  order becomes active.
- Escape outside an editor shall reduce a multiple selection to the active node.
- When a collapse hides selected descendants, those descendants shall be
  removed from selection and the collapsed node shall become active.

### 7.3 Selection normalization for structural commands

When a command acts on selected subtrees and both an ancestor and its
descendant are selected, it shall act only on the selected ancestor. This
prevents duplicate copies, deletes, and moves.

Keyboard movement in section 9.1 first checks the entire selection for a
contiguous sibling block. Ancestor/descendant selections are ineligible; they
shall not become eligible through normalization.

## 8. Visual keyboard navigation

Plain arrow navigation shall follow the sibling/depth rules below using rendered
geometry to order eligible destinations. Primary-modifier+arrow movement follows
sibling order as specified in section 9.1.

### 8.1 Up and Down

- Up selects the visible sibling immediately above the active node; Down selects
  the visible sibling immediately below it. Root children consider only siblings
  on their own side.
- If there is no sibling in the requested direction, continue to the nearest
  visible node at the **same depth** in an adjacent branch on the same root side.
- If neither a sibling nor a same-depth candidate exists in that direction,
  choose the nearest visible **shallower node** on the same root side, excluding
  every ancestor of the selected node. Vertical distance decides among shallower
  nodes, not how many levels shallower they are.
- Ancestors and deeper nodes are never eligible for non-root Up/Down navigation.
- Eligible candidates must have a strictly higher/lower rendered vertical center.
  Within each priority group (siblings, same depth, then shallower), vertical
  distance orders candidates; stable layout order breaks ties.
- At a non-root edge with no eligible destination, selection remains unchanged.
  Do not fall back to an ancestor/root or cross to the opposite root side.
- When the root is active, Up/Down and Shift+Up/Down do nothing: preserve the
  selection, viewport, document, and history.
- Shift+Up/Down follows the same destinations, extending/contracting the selection
  path. Left/Right navigation and primary-modifier structural movement are unchanged.

Confirmed reference-map examples (product review, 2026-09-07):

| Selected node | Arrow | Next selected node |
|---|---|---|
| One | Down | Two |
| C | Up | B |
| A | Down | B |
| Single child | Up | C |
| Single child | Down | N1 |
| N2 | Down | N3 |
| N3 | Up | N2 |
| C2 | Down | N4 |
| Child of a single child | Up | C |
| C2.1 | Up | Child 1 |

### 8.2 Left and Right

- On the right side:
  - Left moves inward to the parent.
  - Right moves outward to a visible child.
- On the left side:
  - Right moves inward to the parent.
  - Left moves outward to a visible child.
- At the root, Left selects a child on the left side and Right selects a child
  on the right side.
- When several children are available in the outward direction, the destination
  shall be the child whose rendered vertical center is nearest to the active
  node's vertical center. Stable sibling order breaks a tie. This is the
  visually central child, not automatically the first child.
- If an outward command is issued on a collapsed node with children, the first
  command shall expand it and keep it selected. A subsequent outward command
  shall enter its visually central child.
- An inward command always selects the parent and does not change collapse
  state.
- At an edge where no navigation result exists, selection shall remain
  unchanged.

## 9. Editing commands

Commands apply to the active node or normalized selected subtrees. Node-creation
commands immediately open the new node's inline editor.

| Input | Action outside inline editing |
|---|---|
| Printable character (except Space) | Replace the active label in the inline editor; no Control/Command/Alt modifier |
| F2 | Edit active node label |
| Click sole selected node | Edit its label |
| Enter | Insert sibling immediately after active node |
| Shift+Enter | Insert sibling immediately before active node |
| Tab | Insert a child; on root, insert a right-side root child |
| Shift+Tab | Insert a new parent around the active node; on root, insert a left-side root child |
| Delete | Delete selected subtrees |
| Space | Expand or collapse the active node |
| Ctrl+Space | Toggle checked state of selected checkbox nodes on every platform, including macOS |
| Primary modifier+Up / Down | Move the selected sibling block up / down one position, wrapping at the edge |
| Primary modifier+inward arrow | Move the selected block immediately after its parent; root children flip sides |
| Primary modifier+outward arrow | No action |
| Primary modifier+X | Cut selected subtrees |
| Primary modifier+C | Copy selected subtrees |
| Primary modifier+V | Paste as children of active node |
| Primary modifier+Z | Undo |
| Primary modifier+Y | Redo |
| Primary modifier+Shift+Z | Redo |
| Primary modifier+A | Select all visible non-root nodes |
| Escape | Reduce multiple selection to active node |

Additional requirements:

- The root cannot be deleted, cut, dragged, pasted over, or wrapped in a new
  parent.
- Enter and Shift+Enter on the root shall create a right-side root child after
  or before the appropriate position; the exact placement shall be consistent
  with Tab-created right branches.
- A new child or sibling shall inherit checkbox presence from the active node.
  It shall start unchecked.
- A new parent created by Shift+Tab shall not have a checkbox.
- Deleting all non-root nodes is allowed.
- When deleting, the next active node shall be the nearest surviving node in
  visual order, preferring the deleted block's parent.
- Space on a leaf shall have no effect.
- Ctrl+Space shall affect every selected node that already has a
  checkbox and shall not add a checkbox to nodes without one. If selected
  checkbox nodes have mixed states, the command checks all of them; otherwise
  it toggles all of them.
- A context-menu command shall add or remove checkbox presence. Adding creates
  an unchecked checkbox; removing discards checked state.
- All primary-modifier shortcuts shall use Command on macOS.
- While the inline editor is open, normal platform text-editing shortcuts take
  precedence. Enter, Shift+Enter, and Escape retain the behavior in section
  5.2.

### 9.1 Keyboard movement of selected nodes

- These shortcuts use Command on macOS and Ctrl elsewhere, outside inline
  editing. They move complete subtrees and shall be disabled in read-only mode.
- Movement is eligible only when the nonempty selection consists entirely of
  children of one parent, selected contiguously in sibling order without holes.
  A single non-root node is eligible. A selection containing the root, different
  parents, or both an ancestor and a descendant is ineligible.
- For root children, all selected nodes must also be on the same side.
  Contiguity, Up/Down movement, and wrapping use the root's child array filtered
  to that side, preserving its order. Opposite-side children do not count as
  holes; a selection spanning both sides is ineligible.
- Up and Down move the selected block one sibling position in the requested
  direction, preserving the block's internal order. Up at the first position
  wraps the entire block to the end; Down at the last position wraps it to the
  beginning. Selecting all siblings in the applicable collection makes Up/Down
  a no-op.
- For example, brackets denote the selected block: `[B C] A D` + Up becomes
  `A D [B C]`; `A D [B C]` + Down becomes `[B C] A D`.
- The inward arrow is Left on right branches and Right on left branches. For
  nodes below root-child level, it moves the block into the grandparent's child
  array immediately after the parent (parent index + 1), preserving block order
  and subtree contents. If this creates root children, they inherit the former
  parent's root side.
- For existing root children, the inward arrow flips the block to the opposite
  root side and appends it after that side's last child, preserving block order.
  If the destination side is empty, append the block to the root child array.
  Descendants inherit the new side. Other nodes retain their relative order.
- The outward arrow does nothing. Ineligible selections and other no-ops shall
  leave document, selection, viewport, and history unchanged; these shortcuts
  shall not fall through to ordinary arrow navigation.
- Each effective movement is one undoable transaction and emits one document
  change through the shared command path. It preserves node IDs, the selected
  block, and the active node, and pans as needed to reveal the moved selection
  without changing zoom. Undo/redo restores the structural change, including
  any side change; viewport adjustments remain outside history.
- Inside the textarea, these key combinations retain normal platform text-editing
  behavior and shall not move nodes.

## 10. URL nodes

- A node is a URL node only when its entire trimmed label parses as an absolute
  "http:" or "https:" URL.
- Partial URLs embedded in other text shall remain plain text.
- URL detection shall occur after edit commit and document replacement.
- The URL label shall use standard link blue (#0000EE) without a text underline.
  Its normal branch line remains unchanged.
- Primary-modifier+click on the URL label shall open it in a new browser tab or
  window using the platform's default browser behavior.
- The widget shall use "noopener,noreferrer" protections.
- The same gesture on the branch line or non-label portion of the node shall
  retain the multiple-selection behavior.
- Opening a URL shall not mutate document state or enter undo history.

## 11. Checkboxes

- Checkbox presence is optional per node, including the root.
- Each checkbox is independent. Checking a parent shall not affect descendants,
  and child state shall not derive parent state.
- Mouse click directly on a checkbox shall toggle it without starting label
  editing.
- Ctrl+Space shall provide the equivalent keyboard operation.
- Toggling checked state shall be one undoable transaction for all affected
  selected checkbox nodes.
- Checkbox presence and checked state shall be represented in clipboard text as
  described below.

## 12. Clipboard format

### 12.1 Serialization

- Clipboard exchange shall use "text/plain".
- Each node occupies one physical clipboard line.
- Leading tab characters express depth relative to the copied selection.
- Sibling order and root-side visual order shall be preserved.
- A multiline label shall encode a newline as the two characters "\n".
- A literal backslash shall encode as "\\".
- A literal tab inside a label shall encode as "\t".
- Nodes with a checkbox shall prefix the encoded label with "[ ] " or "[x] ".
- A label on a node without a checkbox beginning with the exact text "[ ] " or
  "[x] " shall escape the opening bracket as "\[".
- If multiple selected roots are copied, each begins at indentation depth zero.
- If a selected node has a selected ancestor, only the ancestor subtree is
  serialized.

Example:

~~~text
[ ] Release
	[x] Code complete
	Notes\nSecond line
Ordinary sibling
~~~

### 12.2 Parsing and paste

- The parser shall accept tabs as indentation. A run of four leading spaces may
  also be accepted as one indentation level for interoperability.
- Increases in indentation may be at most one level per line. Invalid indentation
  shall reject the paste atomically and emit an error event.
- Recognized checkbox prefixes shall create checkbox nodes and preserve checked
  state.
- Escape sequences shall be decoded after checkbox-prefix recognition.
- Pasted top-level nodes shall be inserted as consecutive children of the
  active node.
- Pasting onto the root shall place the new top-level nodes on the right side.
- All pasted nodes shall receive new IDs.
- Paste shall be one undoable transaction.
- Each physical clipboard line shall create one node, including when all lines
  are unindented. Unindented lines become sibling children of the active node.
- A newline within one node's label shall be represented by the escaped "\n"
  sequence and decoded after parsing the physical lines.

### 12.3 Copy and cut

- Copy shall write the selected normalized subtrees without changing the map.
- Cut shall copy first and delete only after clipboard writing succeeds.
- Copying the root is allowed as text; cutting the root is disabled.
- Clipboard API failure shall leave the map unchanged and emit an error.

## 13. Drag-and-drop

- Dragging may begin from any selected node other than the root.
- Starting a drag on an unselected node shall first make it the sole selection.
- All normalized selected subtrees shall move together in visual order.
- Valid operations are:
  - insert before a target;
  - insert after a target;
  - become children of a target;
  - move branches between root sides.
- Dropping onto a collapsed node as children shall keep it collapsed; the moved
  nodes exist but remain hidden until expansion.
- A node cannot be dropped into itself or any of its descendants.
- A before/after drop cannot split the moving group or create duplicate
  ancestry.
- Dropping selected siblings back into their current effective position shall
  be a no-op and shall not add undo history.
- Dropping before/after a root child preserves or adopts that target's root
  side. Dropping on a root half adopts that half's side.
- Dropping a descendant as a root child assigns the chosen root side to its new
  branch; all descendants follow it.
- One completed drag shall be one undoable transaction.
- Escape during a drag shall cancel it.
- Autopan shall occur when dragging near a viewport edge.

## 14. Pan, zoom, and viewport

- Dragging empty canvas shall pan.
- Mouse wheel shall scroll vertically.
- Shift+mouse wheel shall scroll horizontally.
- Primary-modifier+mouse wheel shall zoom around the pointer location.
- Keyboard commands shall include zoom in, zoom out, reset to 100%, and fit the
  complete visible map.
- Default bindings shall be Primary-modifier+Plus,
  Primary-modifier+Minus, Primary-modifier+0, and
  Primary-modifier+Shift+0 respectively.
- Zoom shall be continuous for the wheel and stepped for keyboard commands.
- The default zoom range shall be 25% through 400%.
- Resizing the host element shall resize the viewport without changing document
  data.
- The host API shall expose "panToNode", "fit", "setZoom", and "getViewport".
- Pan and zoom are view state and shall not enter undo history or document
  change events. A separate viewport event shall report them.

## 15. Context menu

Right-clicking a node shall select it if necessary and show a keyboard-accessible
built-in menu containing applicable commands:

- Edit
- Add child
- Add sibling before
- Add sibling after
- Insert parent
- Cut
- Copy
- Paste
- Delete
- Expand/Collapse
- Add checkbox/Remove checkbox
- Toggle checked state, when applicable
- Open link, for URL nodes

Unavailable commands shall be disabled or omitted consistently. The menu shall
also be openable from the keyboard using Shift+F10 and the platform Context Menu
key. The host may disable the built-in menu and invoke the same public commands
from application UI.

## 16. Undo and redo

- Undo history shall include:
  - committed label edits;
  - node creation and deletion;
  - insert-parent;
  - cut and paste mutations;
  - drag-and-drop moves and reordering;
  - keyboard sibling moves, wrapping, promotion, and root-side flips;
  - expand and collapse;
  - checkbox presence changes;
  - checkbox checked-state changes.
- Undo history shall exclude:
  - selection and active-node changes;
  - pan and zoom;
  - URL opening;
  - cancelled edits and drags;
  - no-op commands.
- Each completed command described as a transaction shall produce at most one
  history entry.
- Undo shall restore document data and a useful selection centered on the
  affected nodes.
- Redo history shall clear after a new undoable mutation.
- The default history capacity shall be 100 transactions and shall be
  configurable.
- Replacing the entire document through the host API shall always clear undo
  and redo history.

## 17. Public API

The package shall expose a class or factory with equivalent typed behavior:

~~~ts
interface MindMapEditorOptions {
  document: MindMapDocument;
  createNodeId?: () => NodeId;
  historyLimit?: number;
  contextMenu?: boolean;
  readonly?: boolean;
}

interface MindMapEditor {
  getDocument(): MindMapDocument;
  setDocument(document: MindMapDocument): void;

  getSelection(): { ids: NodeId[]; activeId?: NodeId };
  setSelection(ids: NodeId[], activeId?: NodeId): void;

  execute(command: MindMapCommand): boolean;
  canExecute(command: MindMapCommand): boolean;

  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;

  focus(): void;
  editNode(id: NodeId): void;
  panToNode(id: NodeId): void;
  fit(): void;
  setZoom(scale: number): void;
  getViewport(): { x: number; y: number; zoom: number };

  on<K extends keyof MindMapEditorEvents>(
    type: K,
    listener: (event: MindMapEditorEvents[K]) => void
  ): () => void;

  destroy(): void;
}
~~~

The command union shall cover every built-in context-menu and keyboard command
and allow explicit target IDs where meaningful.

"execute" shall keep a synchronous boolean return contract. It returns true
when a command is accepted and false when it is rejected or is a no-op.
Clipboard commands may finish asynchronously: true reports acceptance, not
successful clipboard access. Successful asynchronous clipboard commands emit
"commandcomplete"; failures emit "error". Cut shall delete only after a
successful clipboard write, and paste shall mutate only after a successful
read and validation. "canExecute" reports current command applicability and
does not guarantee browser clipboard permission.

When "readonly" is true, selection, navigation among visible nodes, copy, link
opening, and viewport changes remain available. All editing commands, cut,
paste, drag-and-drop moves, checkbox changes, undo/redo, and expand/collapse
shall be disabled. Outward navigation on a collapsed node shall leave it
unchanged. The host may still replace the document through "setDocument".

Events shall include:

- "documentchange": emitted once after each committed mutation, carrying the
  resulting snapshot and a change reason.
- "selectionchange": carrying selected IDs and active ID.
- "viewportchange": carrying pan and zoom.
- "editstart", "editcommit", and "editcancel".
- "commandcomplete": emitted when an asynchronous clipboard command succeeds,
  identifying the command and its origin. Copy emits this event even though it
  does not change the document.
- "linkopen": emitted immediately before opening a URL; cancellable so a host
  can enforce application policy.
- "error": carrying a stable error code and human-readable message for invalid
  data, clipboard failure, and rejected commands.

Host event handlers shall be able to distinguish user gestures, undo/redo, and
public API commands. Calling "destroy" shall remove listeners, DOM owned by the
widget, observers, and timers.

## 18. Packaging and integration

- The widget shall have no framework dependency.
- Small, justified runtime dependencies are permitted.
- The package shall provide:
  - an ES module build;
  - TypeScript declarations;
  - a default stylesheet;
  - documented CSS custom properties for colors, font, line width, and spacing;
  - a minimal HTML/TypeScript integration example.
- The widget shall mount into a caller-provided HTML element and stay contained
  within it.
- Multiple independent editor instances shall work on one page.
- Styles shall be scoped to the widget and shall not alter host-page elements.
- The widget shall not install global keyboard or pointer handlers except while
  an interaction requires them, and shall remove such handlers afterward.
- The widget shall not make network requests except when the user explicitly
  opens a URL node.

## 19. Accessibility and focus

- The mount element shall participate in the document tab order.
- There shall be one keyboard focus entry point for the canvas, with the active
  node exposed through accessible semantics.
- Nodes shall expose their label, expanded/collapsed state, selection state, and
  checkbox state to assistive technology.
- Built-in context-menu commands and the inline editor shall be reachable and
  operable by keyboard.
- Focus shall return to the active node/canvas after editing or closing the
  context menu.
- Selection shall not be communicated by color alone.
- Default colors shall meet WCAG AA contrast where doing so does not materially
  conflict with the supplied visual references.
- Browser focus shall remain inside the editor during ordinary arrow-key
  navigation; handled keys shall prevent page scrolling.

## 20. Validation and error handling

- "setDocument" shall validate unique IDs, exactly one root, valid child arrays,
  and valid root sides.
- Invalid replacement documents shall be rejected atomically; the current map
  shall remain intact.
- Public commands with missing or invalid targets shall return false and emit a
  stable error where the condition is exceptional.
- User gestures that cannot apply, such as Space on a leaf, may be silent
  no-ops.
- Exceptions thrown by host callbacks shall not leave a partially mutated map.
- Labels shall be rendered as text and shall never be interpreted as HTML.

## 21. Performance and browser support

- The target workload is 1,000 total nodes and up to 500 visible nodes.
- At the target workload on a current mainstream desktop, selection and arrow
  navigation should respond within one animation frame in ordinary use.
- Pan and zoom should sustain smooth interactive rendering.
- A full structural relayout should normally complete within 100 ms at the
  target visible-node count on reference development hardware.
- Hidden descendants should not create rendered node elements.
- The implementation shall avoid work proportional to all nodes on simple
  selection and checkbox-state updates where practical.
- Supported browsers are the current stable releases of Chrome, Edge, Firefox,
  and Safari at the time of release.

## 22. Acceptance criteria

The first version is acceptable when automated tests and an integration demo
demonstrate all of the following:

1. A supplied two-sided document renders with the root ellipse, underlined
   labels, curved connectors, and collapsed-node marker matching the references.
2. Tab on the root creates and edits a right branch; Shift+Tab on the root
   creates and edits a left branch.
3. Enter, Shift+Enter, Tab, and Shift+Tab perform their context-dependent
   structural operations and produce one history entry each after commit.
   Primary-modifier+arrows move only contiguous sibling selections as specified
   in section 9.1, including block wrapping, promotion, and root-side flipping.
   Each effective move preserves the selection and active node and undoes/redoes
   in one step; ineligible selections and outward arrows do nothing.
4. F2 and clicking the sole selected node show a thin-bordered inline editor.
   Typing replaces the active label, preserving the first character. Empty creation
   editors fit eight Ms; leaf/collapsed editors use at least the rendered node
   width; existing expanded parents match the selection width.
   Bottom borders meet branch lines without text jumping; horizontal scrollbars stay hidden.
   Shift+Enter inserts a newline, Enter commits and relayouts, and Escape
   restores the prior state.
5. Escape while editing a newly created node removes it.
6. Up and Down prefer siblings, then cross group boundaries at the same depth
   and on the same root side. If no peer exists in that direction, use the nearest
   shallower non-ancestor; ancestors and deeper nodes remain ineligible.
   Up/Down and Shift+Up/Down do nothing when the root is active.
   Outward navigation chooses the visually central child. Outward navigation
   first expands a collapsed node.
7. Mouse, modifier-click, sibling range selection, cross-parent range
   selection, Shift+Arrow, and select-all behave as specified.
8. Space collapses/expands; Ctrl+Space toggles only existing
   checkboxes; checkbox state remains independent.
9. New children and siblings of checkbox nodes receive unchecked checkboxes.
10. URL-only labels open on Primary-modifier+click, while partial URLs do not.
11. Copy produces the specified indented text including multiline escapes and
    checkbox markers. Paste reconstructs the hierarchy with new IDs in one
    history transaction.
12. Multi-node drag supports before, after, child, and root-side drops; uses a
    gradient indicator; rejects cycles; and undoes in one step.
13. Undo and redo restore every content mutation, including collapse/expand,
    and exclude selection and viewport changes.
14. Empty-canvas drag, wheel variants, keyboard zoom, reset, and fit work
    without changing document history.
15. The context menu exposes only applicable commands and is fully usable by
    mouse and keyboard.
16. Document replacement and event subscriptions work through the public API;
    invalid documents are rejected atomically.
17. Two instances can coexist without event or style leakage.
18. The 1,000-total/500-visible-node performance target is exercised and
    measured.

## 23. Confirmed design decisions

The following defaults have been confirmed:

- The root label is editable, though the root cannot be structurally removed or
  moved.
- Empty or whitespace-only labels are allowed and preserved for the host to
  validate.
- Primary-modifier+click on a URL label opens the URL; the branch line remains
  available for modifier-based multiple selection.
- Shift+click between different parents uses the global visible navigation
  order.
- New checkbox children and siblings start unchecked even when the source node
  is checked.
- A newly inserted parent does not inherit checkbox presence.
- Pasting top-level clipboard nodes on the root uses the right side.
- Keyboard zoom bindings are Primary-modifier+Plus/Minus/0 and
  Primary-modifier+Shift+0 for fit.
- Each physical clipboard line creates a node; escaped "\n" creates a newline
  within a label.
- The command API keeps a synchronous boolean acceptance contract, with events
  reporting asynchronous clipboard completion or failure.
- Read-only mode also disables expand/collapse, because collapse state is part
  of the document.
- Primary-modifier+arrows move only contiguous sibling blocks, restricted to one
  side for root children. Up/Down wrap the block; inward promotes it immediately
  after its parent or flips root children to the end of the opposite side;
  outward does nothing. Selection and active node are preserved.
- Navigation correction approved on 2026-09-07: plain Up/Down prefers siblings,
  then continues at the same depth in adjacent branches on the same root side.
  The approved follow-up falls back to the nearest shallower node outside the
  ancestor chain when no peer exists. Deeper nodes remain excluded; exhausted edges
  stay selected. The corrected reference example is Single child + Down → N1 (not C).
  Horizontal navigation retains its existing behavior; see section 8.1.
- Root correction requested on 2026-09-08: Up/Down, including Shift extension,
  does nothing when the root is active.

- Editing adjustments approved on 2026-09-08: type-to-replace the active label,
  hide horizontal editor scrollbars while preserving caret scrolling, double empty
  creation editor width to 100px, and anchor left-side editors at their right edge.

- Editor sizing follow-up approved on 2026-09-08: use eight-M width for new nodes
  and existing leaves/collapsed nodes, selection width for expanded parents, and
  align the lower border to the branch stroke while preserving the text origin.
  This supersedes the earlier 100px creation-editor width.

- Focus/control follow-up approved on 2026-09-08: remove the widget focus frame,
  use Ctrl+Space for checkbox toggling on macOS as well as other platforms, and
  expand a collapsed node by clicking its circle while preserving selection.
  Cmd+Space is left unhandled for the system; ordinary Space remains collapse.

- Milestone C review follow-up approved on 2026-09-08: URL labels use #0000EE
  without a text underline; branch lines remain. Editors for nodes without
  visible children use max(eight-M default, rendered node width), preserving
  viewport caps, frozen frames and existing alignment. This supersedes fixed
  eight-M sizing for wider leaves/collapsed nodes.
