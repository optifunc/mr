# Mind Map Editor Implementation Plan

Status: Draft implementation plan

Date: 2026-09-05

Appearance defaults/focus revised after product review: 2026-09-07

Keyboard movement requirements added: 2026-09-07

Plain Up/Down navigation corrected after product review: 2026-09-07

Scope: First implementation of [requirements.md](requirements.md)

## 1. Outcome and agreed decisions

Build a framework-independent TypeScript mind-map widget, mounted into a host
element, with the complete editing behavior and visual appearance specified in
the requirements. Deliver an ES module package, declarations, default stylesheet,
integration documentation, and an HTML/TypeScript demo. Persistence and application
chrome remain outside the widget.

The following choices were agreed during planning:

| Area | Decision |
|---|---|
| Package management | pnpm |
| Language and rendering | TypeScript; HTML labels and controls over SVG connectors |
| Inline editing | Native textarea positioned over the label |
| Build and demo | Vite |
| Verification | Vitest for logic; Playwright for browser behavior |
| Clipboard parsing | One node per physical line; escaped `\n` creates a label newline |
| Command API | Synchronous boolean return; clipboard completion reported through events |
| Read-only | Also disables expand/collapse; selection, copy, links, and viewport remain available |

No additional product decisions block implementation. Defaults below resolve
details left open by the requirements and should be covered by tests. Dependency
versions will be selected and pinned when the package is scaffolded; this plan
does not depend on unverified version numbers.

## 2. Architecture and package structure

Use a single package with no framework or initial runtime dependency. Keep tree
operations, clipboard parsing, navigation, and layout independently testable
without a browser. The browser adapter owns measurements, DOM, input, clipboard
access, and scheduling.

```text
src/
  index.ts                   Public exports
  types.ts                   Documents, commands, options, events, errors
  editor.ts                  Mounting, public facade, coordination, teardown
  model/                     Validation, node index, snapshots, tree operations
  commands/                  Command registry, applicability, transaction dispatch
  history/                   Forward/inverse patches and selection restoration
  layout/                    Measurements interface, geometry, navigation indexes
  render/                    HTML/SVG scene, reconciliation, measurement cache
  interaction/               Selection, keyboard, editing, drag, viewport, menu
  clipboard/                 Text codec and browser clipboard adapter
  styles.css                 Scoped default theme and CSS custom properties
tests/
  unit/                      Model, commands, history, layout, navigation, codec
  browser/                   Interaction, accessibility, integration, screenshots
  fixtures/                  Reference map and deterministic generated maps
examples/basic/              Minimal HTML/TypeScript integration and demo fixtures
docs/
  requirements.md
  impl-plan.md
  api.md                     To be written during implementation
  testing.md                 To be written during implementation
```

Vite builds the ES module and serves the demo. TypeScript emits declarations and
runs strict type checks. Export the stylesheet explicitly and retain it in package
side-effect metadata. Use a committed pnpm lockfile and scripts for development,
build, type checking, unit tests, browser tests, and performance measurements.

### State ownership

Keep five kinds of state separate:

1. **Document:** IDs, labels, ordered children, root sides, collapse and checkbox
   state. This is the only state serialized through document snapshots.
2. **Selection:** selected IDs, active ID, anchor, and current range-navigation
   path. Selection changes do not create document history.
3. **Viewport:** translation, zoom, and host dimensions. These never enter
   document snapshots or history.
4. **Interaction:** current editor buffer, provisional creation transaction,
   pointer gesture, drag preview, context menu, and pending clipboard operation.
5. **Derived state:** node/parent indexes, text measurements, visible geometry,
   URL classification, and navigation indexes.

The command registry is shared by keyboard bindings, context menu, and the public
API. It defines applicability and mutation behavior once, including read-only and
root protection rules.

## 3. Document model, validation, and transactions

Keep the public nested model from the requirements. Internally
index nodes by ID and store parent relationships, ordered child IDs, and root-side
assignments. Only root children store a side; descendants derive theirs.

Validate and copy input before installing it. Check node/object shapes, string
labels, nonempty unique IDs, child arrays, optional boolean fields, valid root
sides, cycles, and shared node objects that violate tree structure. Use iterative
traversals so deeply nested valid trees do not depend on JavaScript call-stack
depth. Copy only schema fields; unspecified application fields are not retained.

`getDocument()` returns detached node objects and child arrays. Callers cannot
mutate internal state through an input document, a returned snapshot, or an event
payload. Do not expose the node index or mutable selection sets.

Each content command prepares a complete set of forward and inverse changes
before applying them. Validate runtime command fields, destination enums, and
required text; optional insertion text still defaults to empty. Applicability and
execution share these checks. Validate destinations and obtain all new IDs before
any commit. A host ID callback that throws, returns an invalid ID, or produces a
collision rejects the whole command. Use a cryptographically backed UUID generator
by default, with a compatible browser fallback where needed.

History stores transaction patches and before/after selection, with the configured
capacity of 100 by default. It does not store viewport state. Effective commands
create one entry; no-ops and cancellations create none. New committed mutations
clear redo. Undo/redo applies the transaction atomically and normalizes restored
selection to surviving visible nodes.

`setDocument()` first validates a detached candidate. Success cancels active
interactions, invalidates pending clipboard mutations, replaces the document,
clears history, selects the root, and relayouts. Keep the current viewport after
replacement; the host can call `fit()`. Failure leaves the existing document,
selection, history, and interactions intact. Invalid constructor input throws a
typed initialization error; invalid replacement emits `error` and keeps the map.

### Provisional creation and editing

Creation and its initial label edit form one transaction. Render a provisional
node and lay out its initial empty label before opening the textarea. Preserve the
pre-command document changes and selection so Escape can discard the whole
operation, including insert-parent wrapping or expansion needed to reveal a child.

While editing, keep the textarea buffer separate from the node's stored text and
freeze scene geometry. `getDocument()` reflects the current working tree, including
a provisional node, but excludes uncommitted textarea text. Mark creation edits as
provisional in edit events and document this distinction for hosts; committed
persistence should follow `documentchange`.

Enter or an outside click commits creation and the final label in one history
entry and one `documentchange`. Even an empty new label commits the creation.
Escape removes the provisional structure, restores selection and geometry, and
emits `editcancel` without document history. Cancelling an existing label edit
simply discards its buffer. Committing an unchanged existing label is a no-op for
document history.

## 4. Layout and rendering

Create one clipped, positioned widget root. Inside it, place an SVG connector
layer and an HTML node layer under the same pan/zoom transform. Place the menu and
other viewport overlays inside the widget root. Keep SVG connectors decorative
for accessibility; the HTML tree supplies node semantics and pointer targets.

Measure text with a hidden DOM measurement element using exactly the label font,
line height, whitespace handling, padding, and checkbox dimensions. Preserve
multiline, empty, and whitespace-only labels. Do not introduce automatic label
wrapping in the first version; explicit newlines determine lines, including the
final empty row after a trailing newline. Use the same line-box mechanism for
measurement and visible labels without inserting text into the document. Cache by text
and geometry-affecting style values. Measure fractional local CSS dimensions
(including root content), never transformed screen bounds; ancestor scaling must
not enter world geometry. Batch measurement reads before scene writes.
Default non-root content sits 0.5px below the row center, redistributing the existing
vertical padding without changing node height; root text stays centered. Raise
checkboxes 1px relative to the label block for optical alignment. The native-DPI
reference anchors these spacings; expose both offsets as theme properties. Reserve
visible clearance below descenders including their faint antialiased edges. Root
subtree spacing is 4.5px, independently configurable from the 3px inner sibling
gap, so text clearance and spacing between major branches can be tuned separately.

Use a deterministic layout in unzoomed world coordinates:

1. Filter root children into left and right sequences, preserving document order.
2. Traverse visible nodes and calculate each subtree's vertical extent from the
   node's measured height, child extents, and configured sibling gap.
3. Place each side around the root independently using the root sibling gap.
   Within other parents use the inner sibling gap. Stack sibling subtree extents
   without overlap and center the parent against its visible child extent.
4. Place outward child branches after the parent's line endpoint and connector
   gap; mirror horizontal geometry on the left. Align a single child close to
   the parent's branch baseline when label sizes permit.
5. Produce label boxes, branch baselines, connector anchors and curves, root
   ellipse, collapse-marker bounds, interaction bounds, and total visible bounds.
6. Build visual navigation indexes from the resulting node centers and stable
   traversal order.

Collapsed descendants participate in the document index but have no geometry or
rendered node elements. Use cubic SVG curves joining horizontal branch lines,
with reference-compatible shared bends at sibling groups. Place labels immediately
above their branch lines. Size the root ellipse around its label and optional
checkbox. Include selection fills and gradient drop zones without changing
measured geometry.

Reconcile visible elements by ID. Selection updates touch only affected node
styles and accessible attributes. Checked-state changes update the checkbox without
relayout. Structural mutations, collapse, checkbox presence, final text changes,
and font/spacing changes invalidate the necessary measurement/layout work.

Expose documented `--mindmap-*` properties for font, colors, line width, and gaps.
Provide a `refreshLayout()` facade method as an implementation extension so hosts
can apply runtime theme changes explicitly. Font-load notifications also invalidate
measurements. Defer geometry refresh until an active text edit ends. Host resize
updates viewport dimensions without changing layout inputs or document data.

Use the Windows 100% DPI image as the default proportions/root-selection anchor;
retain the earlier appearance, editing, and dragging references in
[free-mind-references](free-mind-references/). Use them for visual review and create browser-specific screenshot baselines from the actual
demo; do not require pixel equality to raster references with different fonts.

## 5. Selection and navigation defaults

Maintain the invariant that the active node is selected whenever selection is
nonempty. Mouse toggling that removes the active node chooses the first remaining
node in visual order. An empty selection has no active node or anchor. Commands
requiring a target are disabled until a target is supplied or selected.

Define stable layout order as root, then left branches in preorder, then right
branches in preorder. Define global visible order by vertical center, breaking ties
with that stable order. Use the same global order for cross-parent range selection
and ordering normalized moving/copied subtree roots. Serialize each subtree in
its own child order, including collapsed descendants.

For sibling Shift+click, use the contiguous child-array range. Root children on
opposite sides still share the root parent, so this rule includes the intervening
root children in document order. Cross-parent Shift+click uses the global visible
order. Shift+Arrow tracks the navigation path from the anchor; reversing along that
path contracts the range. Plain navigation establishes a new anchor.

For a non-root node, Up/Down first considers visible siblings on the same root
side with strictly higher/lower vertical centers. If none exists in that direction,
continue to a visible node at the same depth in an adjacent branch on that side.
If both groups are empty, consider visible shallower nodes in the requested
direction on that side, excluding the selected node's entire ancestor chain.
Choose that fallback by vertical distance, not by depth difference.
Within each candidate group, choose the nearest vertical center, with stable layout
order breaking ties. Ancestors and deeper nodes are ineligible; at an edge,
stay put instead of falling back to root or the opposite side. When root is active,
return no destination for Up/Down, including Shift+Up/Down, preserving all state.
Shift+Up/Down otherwise uses the same rule and its existing path contraction.

Keep all ten confirmed examples in requirements §8.1 as permanent pure and
actual-browser regressions, including Single child + Down → N1. Also cover mirrored
branches, sibling priority over closer cross-group nodes, stable ties, collapsed
peers, shallower fallback distance/ties, exclusion of all ancestors/deeper nodes,
edge no-ops, root vertical no-ops (single/multiple selection, API and keys,
editable/read-only), and Shift selection through fallback destinations and range reversal.
This correction does not change the global visible order used by Shift+click, or primary-modifier structural movement.

Inward navigation selects the parent. Outward navigation selects the nearest child
by vertical center, expands a collapsed node on its first invocation, and is a
no-op on a collapsed node in read-only mode. At the root, horizontal arrows choose
the corresponding side. Automatically pan just enough to reveal the destination
without changing zoom.

Root selection disables delete, cut, and moving the selected group whenever the
group contains the root. Copy may serialize the root and its descendants. Collapse
removes hidden descendants from selection and activates the collapsed node.

### Keyboard movement

Implement requirements section 9.1 in stage 4 through shared typed commands and
the structural transaction path, with the same applicability for API and gestures.
Use Command+Arrow on macOS and Ctrl+Arrow elsewhere. Validate the entire selected
set before subtree normalization: it must be a nonempty contiguous block of one
parent's children, excluding the root. Root children must share one side; filter
the root array to that side for adjacency and Up/Down positions. Reject holes,
mixed parents, ancestor/descendant selections, and mixed root sides as no-ops.

Resolve Up/Down against sibling order, not geometry or global visual order. Swap
the block past the immediately preceding/following sibling; wrap the entire block
at an edge while retaining internal order. Up/Down with the whole applicable sibling
collection selected is a no-op. Preserve the relative order of all other nodes, including
opposite-side root children when reinserting into the shared root array.

Inward (Left on right branches, Right on left branches) promotes the block into
the grandparent immediately after its parent. Newly promoted root children adopt
the former parent's side. Existing root children instead adopt the opposite side
and append after its last child; append to the root array if that side is empty.
Outward does nothing. Resolve direction from the current side on every command.

Prepare and validate the complete move before installation. Keep IDs, subtrees,
selected IDs, and active ID; relayout once and reveal the moved selection without
changing zoom. Each effective move produces one history entry and one document
event, with normal origin/event ordering. Undo/redo includes parent, order, and
side changes. Ineligible/outward/no-op commands leave state and viewport intact
and do not fall through to plain navigation. Disable movement in read-only mode;
inside the textarea leave these shortcuts to platform text editing.

Test pure eligibility/destination/transaction rules and actual browser key input,
including block order, both edge wraps, interleaved root sides, promotion on both
sides, destination-side append, repeated flips, unchanged active selection,
viewport reveal, undo/redo, and no-op/read-only/editor routing. Keyboard movement
does not require drag-and-drop interaction to be implemented first.

## 6. Editing commands and input coordination

Implement the complete shortcut table in requirements section 9 and the viewport
bindings in section 14 through typed commands. Allow explicit target IDs where
meaningful, with selection/active-node defaults for gestures. Include programmatic
move destinations so API, drag-and-drop, and tests exercise the same reducer.

Use these insertion defaults:

| Context | Placement |
|---|---|
| Root Tab or Enter | Append after the last right-side root child |
| Root Shift+Enter | Insert before the first right-side root child |
| Root Shift+Tab | Append after the last left-side root child |
| Non-root Tab | Append a child |
| Non-root Enter / Shift+Enter | Insert immediately after / before active sibling |
| Non-root Shift+Tab | Replace active node's sibling slot with a new parent containing it |
| Paste or child drop | Append consecutive children; root paste uses the right side |

If a root side is empty, append its new branch to the root child array. Inserting
around a root child transfers that child's side to the new parent. Creating a child
under a collapsed parent expands it within the creation transaction so the editor
is visible. A child drop or paste into a collapsed parent keeps it collapsed;
selection then remains on the visible target.

New children/siblings inherit checkbox presence from the active node and start
unchecked; inserted parents have no checkbox. Mixed checkbox-presence selection
offers Add checkbox to nodes missing one and Remove checkbox to nodes having one.
Existing checkbox states are preserved when adding presence to other selected
nodes. Checked-state commands follow the requirements' mixed-state rule.

For deletion, prefer the active removed subtree's surviving parent; otherwise use
the nearest surviving node in the pre-command visual order. Normalize overlapping
selected subtrees before every delete, cut, copy, or move.

Use Ctrl+Space for checkbox toggling on all platforms, including macOS. Handle
Space independently from the platform primary-modifier branch: bare Space remains
collapse, and Cmd+Space is left unhandled. Textarea/composition input keeps native
routing. Existing selection, mixed-checkbox, history and read-only rules apply.

Resolve collapsed-circle clicks from layout geometry in local/world coordinates,
including zoom, host scaling and the circle stroke. Keep SVG strokes decorative
and pointer-transparent. A circle press preserves selection; release over that
same circle without dragging dispatches the shared expand command. Cancellation,
release elsewhere, non-left mouse buttons and read-only mode do not expand. Match
root/left/right marker geometry and re-hit after any outside-editor commit.

Use an explicit interaction state machine for idle, pressed node/marker, editing, panning,
dragging, and menu. Defer click-to-edit until pointer release confirms a click.
A press on an unselected node selects it; exceeding a small screen-pixel threshold
starts dragging. A press on an already selected group preserves the group for a
possible drag; a completed plain click narrows it as required. Empty-canvas clicks
clear selection; empty-canvas drags pan.

Printable key input outside the textarea starts the shared edit command with a
replacement buffer containing the original character, then places the caret after
it. Keep the document's old text until commit so Escape and undo use the existing
transaction. Preserve case; do not reinterpret Space, modifier shortcuts, or
composition keys. Use the active node for multiple selection and the existing
read-only/visible-target guards.

Measure `MMMMMMMM` using the editor's inherited font in local CSS coordinates,
round up to a whole local pixel and add 6px for padding/borders (86px with default
12px Arial). Use this for every new node, including inserted parents, and for
existing nodes without visible children. Existing expanded parents use the full
selection-box width and horizontal bounds. Cap every editor by viewport bounds.

Keep the textarea text origin at the measured label origin. Derive local label
insets from node padding, checkbox prefix, root centering and label dimensions
rather than rounded offsets or transformed screen coordinates. Compact left-side
editors expand outward; for existing labels, adjust left padding to preserve their
text-block position, retaining left alignment within multiline labels. As the buffer
grows, release this extra padding before native scrolling takes over. New empty
editors start at their normal left padding. Expanded-parent frames include checkbox
space, whose background remains transparent so the existing control stays visible.

Center the lower 1px border on the branch baseline while retaining the existing
3px top border-plus-padding inset. Derive height and bottom padding from this
constraint (20.5px high with default single-line styling). Root uses its existing
label-height frame because it has no bottom branch line. Freeze the frame during
typing and scroll overflow internally; hide horizontal scrollbars. Oversized labels
remain bounded to the viewport. Verify font-derived width, expanded/collapsed rules,
no text movement and border alignment at 100%/150%/200%, root/checkbox insets,
all insertion bindings, cancellation restoration and exact accepted-default images.

The textarea owns platform text shortcuts. Respect composition events so Enter
used by an IME does not prematurely commit. Shift+Enter inserts a newline and
Escape cancels. Commit on an outside pointer action before processing that action,
then re-resolve its target after relayout. Commit on focus leaving the editor as
well. Public content commands finish the active edit before proceeding; valid
document replacement and destruction discard unfinished edits.

Checkbox targets toggle without editing. URL labels dispatch cancellable
`linkopen` before opening an absolute HTTP(S) URL with `noopener,noreferrer`.
Keep label and branch-line hit regions distinct so modifier-click selection remains
available on URL nodes. URL checks also run for paste, undo/redo, and inserted or
replaced text. Render every label through text nodes, never HTML interpretation.

## 7. Clipboard codec and synchronous command contract

Implement and test the text codec separately from browser access. Serialize
normalized subtrees with tab indentation, checkbox prefixes, and the specified
backslash/newline/tab/bracket escapes. Clipboard text does not preserve IDs, root
sides, or collapse state; pasted IDs are new, sides follow the destination, and
pasted nodes start expanded.

Use tabs for indentation in this version. Four-space indentation is optional in
the requirements and will not be inferred, preserving leading label spaces.
Require the first node at depth zero and reject depth increases greater than one.
Accept LF and CRLF separators, retaining internal blank lines as empty-label nodes.
Emit a final LF when serializing and consume at most one final line terminator
when parsing. This preserves empty final nodes on round-trip: `A\n\n` represents
`A` and an empty sibling. Empty clipboard text is a no-op. Preserve unknown escape
sequences literally rather than silently losing backslashes.

`execute(command): boolean` stays synchronous. For immediate commands, true means
the command ran or started an interaction. For clipboard commands, true means a
request was accepted. It does not promise clipboard access or a later mutation.
`canExecute()` has no clipboard side effects and cannot predict permission.

Use browser copy/cut/paste events when they supply synchronous `clipboardData`.
For public/context-menu requests, start the asynchronous Clipboard API operation
inside the initiating gesture when possible. Coordinate handlers so one shortcut
does not run through both paths. If the browser cannot grant access, emit a stable
clipboard error and leave the document intact; do not add a hidden clipboard UI.

Capture target IDs, serialized source text where applicable, and the document and
interaction generation at acceptance. Allow one pending clipboard request per
instance; additional clipboard requests return false with a busy error. Selection
and viewport may change while it is pending without retargeting the operation.

For cut/paste, reject a stale completion if the document changed or a new editing
interaction began. Do not delete changed subtrees or paste into a replacement map.
Copy can finish using its captured text after subsequent edits. A completed cut
write may have changed the system clipboard even if stale-state validation prevents
deletion; report that failure without mutating the map. Destroy suppresses all
late completions and mutations.

Read and parse an entire paste, generate and validate all IDs, then commit once.
Write cut text successfully before preparing deletion. Successful clipboard commands
emit `commandcomplete` with command, source, and affected IDs; failures emit `error`.
Cut/paste also emit their single `documentchange` before completion. Copy never
creates history or a document event.

## 8. Drag-and-drop and viewport

Implement mouse dragging with Pointer Events and pointer capture, ignoring touch
and pen input. Use a widget-owned compact overlay of selected labels as the drag
image. Convert screen coordinates through the inverse viewport transform for
geometry hit tests.

Partition non-root targets into top, bottom, and middle outward zones. Top/bottom
take precedence at corners; the middle inward area is invalid. The root uses left
and right halves only. Keep the valid zone and gray gradient aligned, with distinct
before/after/child feedback at all zoom levels.

Preview a move through the same destination resolver used for commit. Validate
self/descendant cycles, root protection, and destination indexes after removing
the moving group from its original parents. Compare the resulting parent, side,
and sibling ordering to detect effective no-ops. Keep IDs and subtree content
unchanged. One completed drag commits one transaction; Escape, pointer cancellation,
or capture loss cancels it.

Drive edge autopan through requestAnimationFrame while dragging. Recompute target
zones after each viewport move and stop immediately on completion or cancellation.
Do not relayout the tree while previewing a move.

Apply pan and zoom as one shared scene transform. Normalize wheel delta units;
plain wheel pans vertically, Shift wheel horizontally, and primary-modifier wheel
zooms about the pointer. Clamp zoom to 0.25–4.0. Keyboard zoom uses multiplicative
steps, reset sets 1.0, and fit centers visible bounds with padding within that range.
Initial mounting centers the root at 100%. ResizeObserver updates viewport size;
zero-size containers defer fitting until measurable. Coalesce viewport events to
one per rendered frame and never emit document events for these operations.

## 9. Accessibility, public events, and lifecycle

Use one focusable tree entry point with `aria-activedescendant`. Represent visible
nodes as treeitems with hierarchy/group semantics, explicit accessible labels,
selection, expansion, and checkbox states. Keep node controls out of the normal
Tab order; keyboard commands provide equivalent actions. Do not draw an additional
active-node focus outline, per the 2026-09-07 product review. Preserve
active-descendant semantics and keyboard focus without a widget focus frame.

Build the menu from command applicability. Keep a consistent menu order and show
unavailable commands disabled. Support Shift+F10, Context Menu key, arrows,
Home/End, Enter, Escape, and focus return. Right-clicking a selected node preserves
the selection; an unselected node becomes the sole selection. Position the menu
within the widget's bounds and allow it to scroll in a small viewport.

Centralize event payloads with an origin (`user`, `api`, `undo`, or `redo`), command
identity where applicable, and change reason. Settle document, history, selection,
and derived layout before dispatching mutation events. Emit `documentchange`, then
any selection change, then edit/clipboard completion as applicable. Viewport events
follow the rendering scheduler. `setDocument` emits a replacement change reason
without creating history.

Queue commands invoked reentrantly by event listeners until the current event
batch completes, preserving FIFO order across nested enqueues. Drain one queue
iteratively so newly appended work cannot overtake existing work or grow the call
stack. Destroy discards pending work. Isolate listener exceptions so they cannot
interrupt transaction installation or prevent remaining listeners from running.
Report callback failures through a guarded error path that cannot recurse if an
error listener itself throws. A failed link-policy callback prevents opening.

Define stable error codes for invalid documents, invalid targets, invalid IDs,
read-only rejection, invalid clipboard indentation, clipboard denial/unavailability,
busy/stale clipboard operations, host callback failure, and destroyed instances.
Ordinary inapplicable gestures remain silent no-ops. All command entry points
enforce the same read-only rules; host `setDocument()` remains available.

Scope CSS to the widget, namespace DOM IDs per instance, and bind keyboard events
locally. Install document-level pointer or outside-click listeners only for the
duration of an interaction. `destroy()` is idempotent: cancel interactions, invalidate
async requests, disconnect observers, stop timers/animation frames, unsubscribe
listeners, and remove owned DOM. Preserve caller-owned host content and restore any
host attributes the widget changed. No operation contacts the network except an
explicit URL open.

## 10. Implementation stages and completion gates

Complete these stages in order. Add relevant tests with each behavior so later
interaction work builds on verified model and geometry rules.

| Stage | Deliverables | Completion gate |
|---|---|---|
| 1. Package and contracts | pnpm/Vite/TypeScript setup; public types; mount/destroy skeleton; minimal demo; test harness | Build emits ESM, declarations, and CSS; demo mounts two isolated instances |
| 2. Model and transactions | Validation, snapshots, indexes, IDs, command registry, history, structural/checkbox/collapse reducers | Atomic failures, root protections, normalization, no-ops, undo/redo, and read-only pass unit tests |
| 3. Rendering and layout | Measurement cache, visible layout, SVG/HTML scene, theme variables, root/checkbox/collapse visuals | Reference fixture renders correctly; non-overlap, mirroring, determinism, hidden-node exclusion verified |
| 4. Selection and viewport | Mouse selection, geometry navigation, range selection, keyboard block movement, pan/zoom/fit, resize | Navigation prefers siblings, then same-depth nodes, then shallower non-ancestors; central-child selection, block movement/wrapping/promotion/side flips, and pointer-anchored zoom pass model and browser tests |
| 5. Inline editing | Textarea, creation transactions, insertion commands, IME/focus handling | Frozen edit layout, one-entry creation commit, cancellation restoration, and checkbox inheritance pass |
| 6. Clipboard and links | Codec, browser adapter, pending request guards, completion events, URL opening | Round-trip/invalid-input tests and success/failure/stale clipboard browser scenarios pass |
| 7. Drag-and-drop | Drag state, normalized group preview, gradients, move reducer integration, autopan | Every drop mode, cycle rejection, same-position no-op, cancellation, and one-step undo pass |
| 8. Menu and host integration | Accessible menu, finalized API/events, callback handling, lifecycle hardening, API docs | Keyboard menu and focus checks pass; two-instance, read-only, replacement, and teardown coverage pass |
| 9. Release validation | Visual refinement, workload profiling, packaged integration check, browser/manual verification | All acceptance criteria below demonstrated; reproducible measurements and remaining limits documented |

The early stages establish the core design but are not a reduced first-version
scope. Completion requires all nine stages. Do not add persistence, application
toolbars, rich text, touch support, or framework wrappers during this work.

## 11. Verification and acceptance mapping

Vitest covers pure rules using small adversarial fixtures and generated trees.
Use browser measurements and real input in Playwright for layout, focus, editing,
clipboard routing, pointer behavior, and screenshots. Stub clipboard failures and
deferred completions deterministically; also exercise available real clipboard
paths in secure browser contexts.

| Requirement acceptance criterion | Evidence |
|---|---|
| 1. Reference appearance | Two-sided reference fixture; default, edit, and drag screenshots plus visual review |
| 2–3. Keyboard structure changes | Each insertion binding at root/non-root; contiguous-block movement, wrapping, promotion, root-side append, eligibility/no-ops, selection retention, exact position/side, and one-step history |
| 4–5. Editing and creation cancellation | Typing replacement/first character, eight-M/selection-box widths, stable text origin and aligned lower border, hidden horizontal scrollbar with caret reveal, frozen positions, multiline commit, old-label restoration, provisional rollback |
| 6. Geometry navigation | Confirmed ten movements, sibling/same-depth priority, shallower fallback, full ancestor exclusion, mirrored branches, stable ties, collapsed peers, edge/root vertical no-ops, Shift extension/contraction, central child and collapsed outward behavior |
| 7. Selection | Click/toggle/ranges, root-side sibling ranges, Shift+Arrow contraction, select-all, hidden selection cleanup |
| 8–9. Checkboxes | Independent state, mixed selections, presence add/remove, inheritance, no unnecessary relayout |
| 10. URLs | Whole-label detection, partial-text rejection, modifier hit regions, cancellable/protected opening |
| 11. Clipboard | Escapes, empty/multiline labels, checkbox markers, collapsed subtrees, IDs, atomic parse/access failure |
| 12. Drag-and-drop | All zones and sides, multi-parent selection, selected ancestors, cycles, effective no-ops, autopan, undo |
| 13. History | Every mutation category, redo invalidation, capacity, no-op/cancel exclusions, useful restored selection |
| 14. Viewport | Wheel variants, shortcuts, pointer anchoring, clamping, resize, fit, no history/document events |
| 15. Context menu | Applicability, right-click selection, keyboard opening/traversal, focus restoration |
| 16. API | Detached snapshots, valid/invalid replacement, event order/origin, callback failure, async command completion |
| 17. Multiple instances | Isolated CSS, IDs, keyboard/pointer handling, independent histories, teardown with pending work |
| 18. Performance | Deterministic 1,000-total/500-visible fixture, timings, frame traces, recorded hardware/browser versions |

Additional regression coverage includes every mutation entry point in read-only
mode, deep trees, duplicate IDs, cycles, stale clipboard operations, event-handler
reentrancy, empty/whitespace labels, and focus changes during composition/editing.

Run browser automation on Chromium, Firefox, and WebKit. Verify actual current
stable Chrome, Edge, Firefox, and Safari before release; WebKit automation alone is
not evidence of Safari compatibility. Manually inspect screen-reader behavior with
VoiceOver/Safari and NVDA with a supported Windows browser, including active-node,
selection, expansion, checkbox announcements, textarea, and menu focus.

Record the reference development machine and browser versions. On the target
fixture, measure selection/navigation input-to-paint against one display frame,
pan/zoom frame behavior, and full relayout including measurement and DOM application
against the 100 ms target. Report warmed median and p95, plus cold/font-load
measurements separately. Verify render counts equal visible counts. Full document
snapshots necessarily traverse the map for document events; ensure simple selection
and viewport changes do not create snapshots or relayouts.

Keep performance reports reproducible rather than enforcing hardware-specific
timing assertions on arbitrary CI workers. Investigate measured failures before
adding complexity such as virtualization or a different layout algorithm.

## 12. Final deliverables

- A built, typed package with scoped CSS and documented custom properties.
- A minimal integration example and demo fixtures covering editing, drag feedback,
  URLs, checkboxes, read-only mode, two instances, and the target workload.
- API documentation for mounting, snapshots, command acceptance/completion,
  provisional editing, events, errors, read-only behavior, and cleanup.
- Automated tests mapped to all 18 acceptance criteria.
- Recorded visual, browser, accessibility, and performance verification results.

This planning change creates no implementation code. The next development step is
stage 1, using this plan and the updated requirements as the agreed baseline.
