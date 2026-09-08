import type { Layout, NodeGeometry } from '../layout/layout';
import type { Model } from '../model/document';
import type { Selection } from '../types';
export type Direction = 'left' | 'right' | 'up' | 'down';
const center = (g: NodeGeometry): number => g.box.y + g.box.height / 2;
export function navigate(model: Model, layout: Layout, active: string | undefined, direction: Direction): { id?: string | undefined; expand?: string } {
    const g = active ? layout.nodes.get(active) : undefined;
    if (!g) return {};
    const n = model.nodes.get(g.id)!;
    if (direction === 'left' || direction === 'right') {
        if (g.side && direction !== g.side) return { id: n.parent! };
        const children = n.children.filter(id => g.side || model.nodes.get(id)!.side === direction);
        if (!children.length) return {};
        if (n.collapsed) return { expand: n.id };
        return { id: children.filter(id => layout.nodes.has(id)).sort((a, b) =>
            Math.abs(center(layout.nodes.get(a)!) - center(g)) - Math.abs(center(layout.nodes.get(b)!) - center(g)))[0] };
    }
    if (g.side === null) return {};
    const sign = direction === 'up' ? -1 : 1;
    const candidates = [...layout.nodes.values()].filter(c => c.id !== g.id &&
        c.side === g.side && c.depth === g.depth && sign * (center(c) - center(g)) > 0)
        .sort((a, b) => {
            // Visit siblings before continuing at the same depth in another branch.
            const siblingPriority = Number(b.parent === g.parent) - Number(a.parent === g.parent);
            return siblingPriority || sign * (center(a) - center(b)) || a.order - b.order;
        });
    if (candidates.length) return { id: candidates[0]!.id };
    // Only after exhausting peers may navigation enter a shallower branch.
    // Exclude every ancestor, including root, rather than just the parent.
    const ancestors = new Set<string>();
    for (let id = n.parent; id; id = model.nodes.get(id)!.parent) ancestors.add(id);
    const fallback = [...layout.nodes.values()].filter(c => c.side === g.side &&
        c.depth < g.depth && !ancestors.has(c.id) && sign * (center(c) - center(g)) > 0)
        .sort((a, b) => sign * (center(a) - center(b)) || a.order - b.order);
    return fallback.length ? { id: fallback[0]!.id } : {};
}
export class SelectionPath {
    anchor: string | undefined;
    private path: string[] = [];
    reset(selection: Selection): void { this.anchor = selection.activeId; this.path = this.anchor ? [this.anchor] : []; }
    arrow(id: string, extend: boolean, current: Selection): Selection {
        if (!extend) { const next = { ids: [id], activeId: id }; this.reset(next); return next; }
        if (!this.anchor || !current.ids.includes(this.anchor)) this.reset(current);
        const index = this.path.indexOf(id);
        if (index >= 0) this.path = this.path.slice(0, index + 1); else this.path.push(id);
        return { ids: [...this.path], activeId: id };
    }
    range(model: Model, layout: Layout, id: string, current: Selection): Selection {
        if (!this.anchor || !layout.nodes.has(this.anchor)) this.reset(current);
        if (!this.anchor) return this.arrow(id, false, current);
        const a = model.nodes.get(this.anchor)!, b = model.nodes.get(id)!;
        const order = a.parent && a.parent === b.parent ? model.nodes.get(a.parent)!.children : layout.visualOrder;
        const from = order.indexOf(a.id), to = order.indexOf(id);
        this.path = order.slice(Math.min(from, to), Math.max(from, to) + 1);
        if (from > to) this.path.reverse();
        return { ids: [...this.path], activeId: id };
    }
}
