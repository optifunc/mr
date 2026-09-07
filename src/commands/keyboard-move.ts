import type { Model } from '../model/document';
import type { MindMapCommand, Selection } from '../types';
import type { Direction } from '../interaction/navigation';
/** Check the full selection before subtree normalization. */
export function keyboardMove(model: Model, selection: Selection, direction: Direction): Extract<MindMapCommand, { type: 'move' }> | undefined {
    const selected = new Set(selection.ids);
    if (!selected.size || selected.has(model.rootId)) return;
    const first = model.nodes.get(selection.ids[0]!);
    if (!first?.parent) return;
    const parent = model.nodes.get(first.parent)!;
    if ([...selected].some(id => { const n = model.nodes.get(id); return !n || n.parent !== parent.id || parent.id === model.rootId && n.side !== first.side; })) return;
    const siblings = parent.children.filter(id => parent.id !== model.rootId || model.nodes.get(id)!.side === first.side);
    const start = siblings.findIndex(id => selected.has(id));
    const block = siblings.slice(start, start + selected.size);
    if (block.some(id => !selected.has(id))) return;
    if (direction === 'up' || direction === 'down') {
        if (selected.size === siblings.length) return;
        const up = direction === 'up', end = start + block.length;
        const targetId = up ? start ? siblings[start - 1]! : siblings.at(-1)! : end < siblings.length ? siblings[end]! : siblings[0]!;
        const position = up ? start ? 'before' : 'after' : end < siblings.length ? 'after' : 'before';
        return { type: 'move', ids: block, destination: { targetId, position } };
    }
    let branch = first;
    while (branch.parent !== model.rootId) branch = model.nodes.get(branch.parent!)!;
    if (direction === branch.side) return;
    if (parent.id !== model.rootId) return { type: 'move', ids: block, destination: { targetId: parent.id, position: 'after' } };
    const side = first.side === 'left' ? 'right' : 'left';
    const last = parent.children.filter(id => model.nodes.get(id)!.side === side).at(-1);
    return { type: 'move', ids: block, destination: last ? { targetId: last, position: 'after' } : { targetId: parent.id, position: 'child', side } };
}
