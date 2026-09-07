import type { Model } from '../model/document';
import { visibleIds } from '../model/document';
import type { RootSide } from '../types';
export interface Size {
    width: number;
    height: number;
}
export interface Box extends Size {
    x: number;
    y: number;
}
export interface LayoutStyle {
    siblingGap: number;
    rootSiblingGap: number;
    branchGap: number;
    rootGap: number;
    markerRadius: number;
    chainRise: number;
}
export interface NodeGeometry {
    id: string;
    parent: string | null;
    side: RootSide | null;
    depth: number;
    order: number;
    box: Box;
    baseline: number;
    inward: number;
    outward: number;
    marker?: {
        x: number;
        y: number;
        radius: number;
    };
    interaction: Box;
}
export interface Layout {
    nodes: Map<string, NodeGeometry>;
    paths: Map<string, string>;
    bounds: Box;
    visualOrder: string[];
}
/** Pure deterministic world geometry. No DOM, viewport, or selection input. */
export function layout(model: Model, sizes: ReadonlyMap<string, Size>, style: LayoutStyle): Layout {
    const ids = visibleIds(model);
    const extents = new Map<string, {
        top: number;
        bottom: number;
        height: number;
    }>();
    const size = (id: string): Size => { const s = sizes.get(id); if (!s || !Number.isFinite(s.width) || !Number.isFinite(s.height) || s.width <= 0 || s.height <= 0)
        throw new RangeError(`Missing or invalid size for ${id}`); return s; };
    for (let i = ids.length - 1; i >= 0; i--) {
        const n = model.nodes.get(ids[i]!)!;
        const h = size(n.id).height;
        const children = n.collapsed ? [] : n.children;
        let top = -h / 2, bottom = h / 2 + (n.collapsed && n.children.length ? style.markerRadius : 0);
        if (children.length === 1) {
            const child = children[0]!;
            const extent = extents.get(child)!;
            const center = h / 2 - size(child).height / 2 - style.chainRise;
            top = Math.min(top, center + extent.top);
            bottom = Math.max(bottom, center + extent.bottom);
        }
        else if (children.length) {
            const total = children.reduce((sum, id) => sum + extents.get(id)!.height, 0) + (children.length - 1) * style.siblingGap;
            top = Math.min(top, -total / 2);
            bottom = Math.max(bottom, total / 2);
        }
        extents.set(n.id, { top, bottom, height: bottom - top });
    }
    const nodes = new Map<string, NodeGeometry>();
    const paths = new Map<string, string>();
    const rootSize = size(model.rootId);
    const root: NodeGeometry = { id: model.rootId, parent: null, side: null, depth: 1, order: 0, box: { x: -rootSize.width / 2, y: -rootSize.height / 2, ...rootSize }, baseline: 0, inward: 0, outward: 0, interaction: { x: -rootSize.width / 2, y: -rootSize.height / 2, ...rootSize } };
    nodes.set(root.id, root);
    type Placement = {
        id: string;
        side: RootSide;
        center: number;
        inward: number;
        depth: number;
    };
    const placements: Placement[] = [];
    const schedule = (children: readonly string[], side: RootSide, center: number, inward: number, depth: number): void => { const gap = depth === 2 ? style.rootSiblingGap : style.siblingGap; const total = children.reduce((sum, id) => sum + extents.get(id)!.height, 0) + Math.max(0, children.length - 1) * gap; let y = center - total / 2; const group: Placement[] = []; for (const id of children) {
        const extent = extents.get(id)!;
        group.push({ id, side, center: y - extent.top, inward, depth });
        y += extent.height + gap;
    } for (let i = group.length - 1; i >= 0; i--)
        placements.push(group[i]!); };
    const rootNode = model.nodes.get(model.rootId)!;
    if (!rootNode.collapsed)
        for (const side of ['right', 'left'] as const)
            schedule(rootNode.children.filter(id => model.nodes.get(id)!.side === side), side, 0, (side === 'right' ? 1 : -1) * (rootSize.width / 2 + style.rootGap), 2);
    let order = 1;
    while (placements.length) {
        const p = placements.pop()!;
        const n = model.nodes.get(p.id)!;
        const s = size(n.id);
        const sign = p.side === 'right' ? 1 : -1;
        const box = { x: p.side === 'right' ? p.inward : p.inward - s.width, y: p.center - s.height / 2, ...s };
        const baseline = box.y + box.height;
        const outward = p.inward + sign * s.width;
        const marker = n.collapsed && n.children.length ? { x: outward + sign * style.markerRadius, y: baseline, radius: style.markerRadius } : undefined;
        const interaction = { ...box, x: box.x - (marker && sign < 0 ? 2 * style.markerRadius : 0), width: box.width + (marker ? 2 * style.markerRadius : 0) };
        const g: NodeGeometry = { id: n.id, parent: n.parent, side: p.side, depth: p.depth, order: order++, box, baseline, inward: p.inward, outward, interaction, ...(marker ? { marker } : {}) };
        nodes.set(n.id, g);
        const parent = nodes.get(n.parent!)!;
        let fromX: number, fromY: number;
        if (parent.id === root.id) { // Attach exactly to the ellipse, fanning from its outer quadrant.
            const ry = rootSize.height / 2, rx = rootSize.width / 2;
            fromY = Math.max(-ry * .65, Math.min(ry * .65, baseline * .22));
            fromX = sign * rx * Math.sqrt(1 - (fromY / ry) ** 2);
        }
        else {
            fromX = parent.outward;
            fromY = parent.baseline;
        }
        const delta = p.inward - fromX;
        const rootBranch = parent.id === root.id;
        paths.set(n.id, `M ${fromX} ${fromY} C ${fromX + delta * (rootBranch ? .3 : .5)} ${rootBranch ? fromY + (baseline - fromY) * .7 : fromY}, ${fromX + delta * (rootBranch ? .55 : .35)} ${baseline}, ${p.inward} ${baseline} L ${outward} ${baseline}`);
        if (!n.collapsed) {
            const inward = outward + sign * style.branchGap;
            if (n.children.length === 1) {
                const child = n.children[0]!;
                placements.push({ id: child, side: p.side, center: baseline - size(child).height / 2 - style.chainRise, inward, depth: p.depth + 1 });
            }
            else
                schedule(n.children, p.side, p.center, inward, p.depth + 1);
        }
    }
    if (rootNode.collapsed && rootNode.children.length)
        root.marker = { x: root.box.x + root.box.width + style.markerRadius, y: 0, radius: style.markerRadius };
    let minX = root.box.x, minY = root.box.y, maxX = root.box.x + root.box.width, maxY = root.box.y + root.box.height;
    for (const n of nodes.values()) {
        minX = Math.min(minX, n.interaction.x);
        minY = Math.min(minY, n.interaction.y);
        maxX = Math.max(maxX, n.interaction.x + n.interaction.width);
        maxY = Math.max(maxY, n.interaction.y + n.interaction.height);
        if (n.marker) {
            minX = Math.min(minX, n.marker.x - n.marker.radius);
            maxX = Math.max(maxX, n.marker.x + n.marker.radius);
            maxY = Math.max(maxY, n.marker.y + n.marker.radius);
        }
    }
    const visualOrder = [...nodes.values()].sort((a, b) => (a.box.y + a.box.height / 2) - (b.box.y + b.box.height / 2) || a.order - b.order).map(n => n.id);
    return { nodes, paths, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }, visualOrder };
}
