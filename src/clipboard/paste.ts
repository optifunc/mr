import { MindMapError } from '../types';
import type { Selection } from '../types';
import type { Model, NodeRecord } from '../model/document';
import { normalizeSelection, visibleIds } from '../model/document';
import type { ClipboardNode } from './codec';
import { patchesBetween } from '../history/history';
import type { Prepared } from '../commands/reducer';

/** Allocate the complete forest before installing any records or history. */
export function preparePaste(model: Model, selection: Selection, targetId: string, roots: ClipboardNode[], createId: () => string): Prepared | undefined {
    const target = model.nodes.get(targetId);
    if (!target) throw new MindMapError('INVALID_TARGET', 'Unknown paste target');
    if (!roots.length) return;
    const nodes = new Map(model.nodes), inserted: string[] = [];
    const work = roots.slice().reverse().map(node => ({ node, parent: targetId, top: true }));
    while (work.length) {
        const { node, parent, top } = work.pop()!;
        let id: string;
        try { id = createId(); } catch { throw new MindMapError('HOST_CALLBACK', 'createNodeId threw'); }
        if (typeof id !== 'string' || !id || nodes.has(id)) throw new MindMapError('INVALID_ID', 'createNodeId must return a new nonempty ID');
        const record: NodeRecord = { id, parent, text: node.text, children: [], ...(node.checked !== undefined ? { checked: node.checked } : {}), ...(parent === model.rootId ? { side: 'right' as const } : {}) };
        nodes.set(id, record);
        const p = nodes.get(parent)!;
        nodes.set(parent, { ...p, children: [...p.children, id], ...(parent === targetId && p.collapsed ? { collapsed: false } : {}) });
        if (top) inserted.push(id);
        for (let i = node.children.length - 1; i >= 0; i--) work.push({ node: node.children[i]!, parent: id, top: false });
    }
    const candidate = { rootId: model.rootId, nodes };
    let after = normalizeSelection(candidate, { ids: inserted, activeId: inserted[0]! });
    if (!after.ids.length) {
        const visible = new Set(visibleIds(candidate));
        let fallback = targetId;
        while (!visible.has(fallback)) fallback = nodes.get(fallback)!.parent!;
        after = { ids: [fallback], activeId: fallback };
    }
    return { model: candidate, transaction: { patches: patchesBetween(model, candidate), before: { ...selection, ids: [...selection.ids] }, after, geometry: true } };
}
