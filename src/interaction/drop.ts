import type { Layout, NodeGeometry } from '../layout/layout';
import type { MoveDestination } from '../types';
export interface DropZone { destination: MoveDestination; edge: 'top' | 'bottom' | 'left' | 'right'; node: NodeGeometry }

/** Edge quarters win corners; inward halves split before/after, outward makes children. */
export function dropZone(layout: Layout, x: number, y: number): DropZone | undefined {
    const node = [...layout.nodes.values()].reverse().find(g => {
        const b = g.interaction;
        return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
    });
    if (!node) return;
    const b = node.interaction, rx = (x - b.x) / b.width, ry = (y - b.y) / b.height;
    if (!node.side) return { node, edge: rx < .5 ? 'left' : 'right', destination: { targetId: node.id, position: 'child', side: rx < .5 ? 'left' : 'right' } };
    if (ry <= .25) return { node, edge: 'top', destination: { targetId: node.id, position: 'before' } };
    if (ry >= .75) return { node, edge: 'bottom', destination: { targetId: node.id, position: 'after' } };
    if (node.side === 'left' ? rx <= .5 : rx >= .5) return { node, edge: node.side, destination: { targetId: node.id, position: 'child' } };
    return { node, edge: ry < .5 ? 'top' : 'bottom', destination: { targetId: node.id, position: ry < .5 ? 'before' : 'after' } };
}

/** Speed in local CSS pixels per second; no document or layout dependency. */
export function edgeVelocity(point: number, size: number, margin = 32): number {
    const edge = Math.min(margin, size / 2);
    if (edge <= 0) return 0;
    return point < edge ? 480 * Math.min(1, (edge - point) / edge) : point > size - edge ? -480 * Math.min(1, (point - size + edge) / edge) : 0;
}
