export type NodeId = string;
export type RootSide = 'left' | 'right';
export interface MindMapNode { id: NodeId; text: string; children: MindMapNode[]; collapsed?: boolean; checked?: boolean }
export interface RootChild extends MindMapNode { side: RootSide }
export interface MindMapDocument { root: Omit<MindMapNode, 'children'> & { children: RootChild[] } }
export interface MindMapEditorOptions { document: MindMapDocument; createNodeId?: () => NodeId; historyLimit?: number; contextMenu?: boolean; readonly?: boolean }
export interface Selection { ids: NodeId[]; activeId?: NodeId }
export interface Viewport { x: number; y: number; zoom: number }
export type MoveDestination = { targetId: NodeId; position: 'before' | 'after' | 'child'; side?: RootSide };
export type MindMapCommand =
  | { type: 'insertChild' | 'insertBefore' | 'insertAfter' | 'insertParent'; targetId?: NodeId; text?: string }
  | { type: 'setText'; targetId?: NodeId; text: string }
  | { type: 'delete' | 'toggleChecked' | 'addCheckbox' | 'removeCheckbox' | 'copy' | 'cut'; ids?: NodeId[] }
  | { type: 'toggleCollapse' | 'expand' | 'collapse' | 'edit' | 'paste' | 'openLink'; targetId?: NodeId }
  | { type: 'move'; ids?: NodeId[]; destination: MoveDestination }
  | { type: 'undo' | 'redo' | 'selectAll' | 'clearSelection' | 'zoomIn' | 'zoomOut' | 'resetZoom' | 'fit' }
  | { type: 'navigate'; direction: 'left' | 'right' | 'up' | 'down'; extend?: boolean };
export type ErrorCode = 'INVALID_DOCUMENT' | 'INVALID_TARGET' | 'INVALID_ID' | 'READ_ONLY' | 'CLIPBOARD_INDENTATION' | 'CLIPBOARD_UNAVAILABLE' | 'CLIPBOARD_DENIED' | 'CLIPBOARD_BUSY' | 'CLIPBOARD_STALE' | 'HOST_CALLBACK' | 'DESTROYED';
export class MindMapError extends Error { constructor(public readonly code: ErrorCode, message: string) { super(message); this.name = 'MindMapError'; } }
export type Origin = 'user' | 'api' | 'undo' | 'redo';
export interface MindMapEditorEvents {
  documentchange: { document: MindMapDocument; origin: Origin; reason: 'command' | 'replacement'; command?: MindMapCommand['type'] };
  selectionchange: Selection & { origin: Origin };
  viewportchange: Viewport;
  error: { code: ErrorCode; message: string };
  editstart: { id: NodeId; provisional: boolean };
  editcommit: { id: NodeId; provisional: boolean };
  editcancel: { id: NodeId; provisional: boolean };
  commandcomplete: { command: MindMapCommand['type']; origin: Origin; ids: NodeId[] };
  linkopen: { id: NodeId; url: string; preventDefault(): void };
}
