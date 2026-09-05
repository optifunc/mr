import { MindMapError } from '../types';
import type { MindMapDocument, MindMapNode, RootSide, Selection } from '../types';
export interface NodeRecord { readonly id: string; readonly text: string; readonly children: readonly string[]; readonly parent: string | null; readonly side?: RootSide; readonly checked?: boolean; readonly collapsed?: boolean }
export interface Model { readonly rootId: string; readonly nodes: ReadonlyMap<string, NodeRecord> }
const invalid = (message: string): never => { throw new MindMapError('INVALID_DOCUMENT', message); };
/** Iterative validation and schema-only copy; never retains caller-owned objects. */
export function validateDocument(input: unknown): Model {
  if (!input || typeof input !== 'object' || !('root' in input)) return invalid('Expected a document with one root');
  const nodes = new Map<string, NodeRecord>(); const seen = new Set<object>();
  const work: { value: unknown; parent: string | null; rootChild: boolean }[] = [{ value: input.root, parent: null, rootChild: false }];
  let rootId = '';
  while (work.length) {
    const { value, parent, rootChild } = work.pop()!;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Expected a node object');
    if (seen.has(value)) return invalid('Cycles and shared node objects are not trees'); seen.add(value);
    const n = value as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id.length || nodes.has(n.id)) return invalid('IDs must be unique nonempty strings');
    if (typeof n.text !== 'string' || !Array.isArray(n.children)) return invalid('Nodes need string text and a children array');
    for (const key of ['checked', 'collapsed']) if (key in n && typeof n[key] !== 'boolean') return invalid(`${key} must be boolean when present`);
    if (rootChild && n.side !== 'left' && n.side !== 'right') return invalid('Root children need a left or right side');
    const record: NodeRecord = { id: n.id, text: n.text, parent, children: n.children.map(child => {
      if (!child || typeof child !== 'object' || typeof child.id !== 'string') return invalid('Invalid child'); return child.id as string;
    }), ...(rootChild ? { side: n.side as RootSide } : {}), ...('checked' in n ? { checked: n.checked as boolean } : {}), ...('collapsed' in n ? { collapsed: n.collapsed as boolean } : {}) };
    nodes.set(record.id, record); if (parent === null) rootId = record.id;
    for (let i = n.children.length - 1; i >= 0; i--) work.push({ value: n.children[i], parent: record.id, rootChild: parent === null });
  }
  return { rootId, nodes };
}
export function snapshot(model: Model): MindMapDocument {
  const copies = new Map<string, MindMapNode>();
  for (const n of model.nodes.values()) copies.set(n.id, { id: n.id, text: n.text, children: [], ...(n.side ? { side: n.side } : {}), ...(n.checked !== undefined ? { checked: n.checked } : {}), ...(n.collapsed !== undefined ? { collapsed: n.collapsed } : {}) });
  for (const n of model.nodes.values()) copies.get(n.id)!.children = n.children.map(id => copies.get(id)!);
  return { root: copies.get(model.rootId)! } as MindMapDocument;
}
export function visibleIds(model: Model): string[] {
  const out: string[] = []; const stack = [model.rootId];
  while (stack.length) { const id = stack.pop()!; const n = model.nodes.get(id)!; out.push(id); if (!n.collapsed) {
    const children = id === model.rootId ? [...n.children.filter(c => model.nodes.get(c)!.side === 'left'), ...n.children.filter(c => model.nodes.get(c)!.side === 'right')] : n.children;
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
  } } return out;
}
export function normalizeRoots(model: Model, ids: readonly string[], order: readonly string[] = visibleIds(model)): string[] {
  const selected = new Set(ids); const rank = new Map(order.map((id, i) => [id, i]));
  return [...selected].filter(id => { let p = model.nodes.get(id)?.parent; while (p) { if (selected.has(p)) return false; p = model.nodes.get(p)?.parent; } return model.nodes.has(id); }).sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
}
export function normalizeSelection(model: Model, selection: Selection): Selection {
  const visible = new Set(visibleIds(model)); const ids = [...new Set(selection.ids)].filter(id => visible.has(id));
  if (!ids.length) return { ids: [] }; const activeId = selection.activeId && ids.includes(selection.activeId) ? selection.activeId : ids[0]!;
  return { ids, activeId };
}
export function sameRecord(a: NodeRecord | undefined, b: NodeRecord | undefined): boolean {
  return a === b || !!a && !!b && a.id === b.id && a.parent === b.parent && a.side === b.side && a.text === b.text && a.checked === b.checked && !!a.collapsed === !!b.collapsed && a.children.length === b.children.length && a.children.every((id, i) => id === b.children[i]);
}
export function generateId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw new MindMapError('INVALID_ID', 'Secure ID generation is unavailable; supply createNodeId');
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}
