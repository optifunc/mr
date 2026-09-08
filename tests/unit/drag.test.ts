import { it, expect } from 'vitest';
import { dropZone, edgeVelocity } from '../../src/interaction/drop';
import { layout } from '../../src/layout/layout';
import { Store } from '../../src/model/store';
import { referenceMap } from '../fixtures/maps';
import type { MoveDestination } from '../../src/types';
const make = () => new Store({ document: referenceMap() });
const geometry = () => { const s = make(); return layout(s.model, new Map([...s.model.nodes.keys()].map(id => [id, { width: 80, height: 20 }])), { siblingGap: 3, rootSiblingGap: 4.5, branchGap: 20, rootGap: 20, markerRadius: 2.5, chainRise: 1.5 }); };
it('mirrors middle outward zones, gives top/bottom corners precedence and splits root halves', () => {
    const g = geometry();
    for (const id of ['a', 'c21', 'root']) {
        const n = g.nodes.get(id)!, b = n.interaction;
        const at = (x: number, y: number) => dropZone(g, b.x + x * b.width, b.y + y * b.height);
        if (id === 'root') { expect(at(.1, .1)!.destination).toEqual({ targetId: id, position: 'child', side: 'left' }); expect(at(.9, .9)!.edge).toBe('right'); }
        else {
            expect(at(.1, .1)!.destination.position).toBe('before'); expect(at(.9, .9)!.destination.position).toBe('after');
            expect(at(n.side === 'left' ? .1 : .9, .5)!.destination.position).toBe('child'); expect(at(n.side === 'left' ? .9 : .1, .5)).toBeUndefined();
        }
    }
    expect(dropZone(g, 9999, 9999)).toBeUndefined();
});
it('autopan velocity scales near each edge and is zero in the middle and zero-sized viewport', () => {
    expect([0, 16, 32, 250, 468, 484, 500].map(x => edgeVelocity(x, 500))).toEqual([480, 240, 0, 0, 0, -240, -480]);
    expect(edgeVelocity(0, 0)).toBe(0); expect(edgeVelocity(-50, 500)).toBe(480);
});
it.each(['before', 'after', 'child'] as const)('normalizes overlapping multi-parent selection in visual order for %s, preserving IDs/content and undo', position => {
    const s = make(), before = s.getDocument(); s.setSelection(['c', 'single', 'chain', 'b'], 'chain'); s.visualOrder = ['b', 'c', 'single', 'chain'];
    const command = { type: 'move' as const, destination: { targetId: 'n1', position } };
    expect(s.canExecute(command)).toBe(true); expect(s.execute(command)).toBe(true);
    const after = s.getDocument(), parent = position === 'child' ? 'n1' : 'three';
    expect(s.model.nodes.get(parent)!.children.slice(position === 'after' ? 1 : 0, position === 'after' ? 4 : 3)).toEqual(['b', 'c', 'single']);
    expect(s.model.nodes.get('chain')!.parent).toBe('single');
    s.execute({ type: 'undo' }); expect(s.getDocument()).toEqual(before); expect(s.history.canUndo).toBe(false);
    s.execute({ type: 'redo' }); expect(s.getDocument()).toEqual(after);
});
it('collapsed child targets retain collapse and select target until expanded', () => {
    const s = make(); s.setSelection(['b', 'c'], 'c');
    s.execute({ type: 'move', destination: { targetId: 'collapsed', position: 'child' } });
    expect(s.model.nodes.get('collapsed')!.collapsed).toBe(true); expect(s.model.nodes.get('collapsed')!.children).toEqual(['hidden', 'b', 'c']); expect(s.selection.ids).toEqual(['collapsed']);
});
it('all cycles, root moves, selected targets, and effective same-position drops preserve state and history', () => {
    for (const [ids, destination] of [
        [['one'], { targetId: 'a', position: 'child' }], [['one'], { targetId: 'a', position: 'before' }],
        [['root', 'a'], { targetId: 'n1', position: 'child' }], [['b', 'c'], { targetId: 'c', position: 'after' }],
        [['b', 'c'], { targetId: 'a', position: 'after' }], [['b', 'c'], { targetId: 'one', position: 'child' }],
        [['a', 'b'], { targetId: 'c', position: 'before' }],
    ] as [string[], MoveDestination][]) {
        const s = make(); s.setSelection(ids); const before = s.getDocument(), selection = s.selection;
        expect(s.canExecute({ type: 'move', destination })).toBe(false);
        try { expect(s.execute({ type: 'move', destination })).toBe(false); } catch { /* invalid targets reject */ }
        expect(s.getDocument()).toEqual(before); expect(s.selection).toEqual(selection); expect(s.history.canUndo).toBe(false);
    }
});
it('root-side append uses destination side adjacency in interleaved arrays', () => {
    const doc = referenceMap(), [l1, l2, r1, r2, r3] = doc.root.children; doc.root.children = [r1!, l1!, r2!, r3!, l2!];
    const s = new Store({ document: doc }); s.setSelection(['three']);
    expect(s.execute({ type: 'move', destination: { targetId: 'root', position: 'child', side: 'right' } })).toBe(false);
    s.setSelection(['one']); expect(s.execute({ type: 'move', destination: { targetId: 'two', position: 'before' } })).toBe(false);
    s.setSelection(['b', 'c']); s.execute({ type: 'move', destination: { targetId: 'root', position: 'child', side: 'left' } });
    expect(s.model.nodes.get('b')!.side).toBe('left'); expect(s.model.nodes.get('root')!.children.slice(-2)).toEqual(['b', 'c']);
    s.execute({ type: 'move', destination: { targetId: 'two', position: 'before' } }); expect(s.model.nodes.get('b')!.side).toBe('right');
});
