import { describe, expect, test } from 'vitest';
import { navigationExamples } from '../fixtures/navigation';
import { Store } from '../../src/model/store';
import { node, referenceMap } from '../fixtures/maps';
import { layout } from '../../src/layout/layout';
import { navigate, SelectionPath } from '../../src/interaction/navigation';
import { fitBounds, reveal, zoomAt } from '../../src/interaction/viewport';
import type { MindMapDocument } from '../../src/types';
const interleaved = (): MindMapDocument => ({ root: { ...node('root'), children: [
    { ...node('a', 'A', [node('a1'), node('a2')]), side: 'right' }, { ...node('l'), side: 'left' },
    { ...node('b'), side: 'right' }, { ...node('m'), side: 'left' }, { ...node('c'), side: 'right' }, { ...node('d'), side: 'right' },
] } });
const children = (s: Store, id = 'root') => s.model.nodes.get(id)!.children;
describe('keyboard block movement', () => {
    test('interleaved side adjacency, both wraps, order, active node and one-step undo', () => {
        const s = new Store({ document: interleaved() }); s.setSelection(['b', 'a'], 'b');
        const before = s.getDocument();
        expect(s.execute({ type: 'moveSelection', direction: 'up' })).toBe(true);
        expect(children(s)).toEqual(['l', 'm', 'c', 'd', 'a', 'b']);
        expect(s.selection).toEqual({ ids: ['b', 'a'], activeId: 'b' });
        s.execute({ type: 'undo' }); expect(s.getDocument()).toEqual(before); expect(s.history.canUndo).toBe(false);
        s.execute({ type: 'redo' }); s.execute({ type: 'moveSelection', direction: 'down' });
        expect(children(s)).toEqual(['l', 'm', 'a', 'b', 'c', 'd']);
        s.execute({ type: 'moveSelection', direction: 'down' }); expect(children(s)).toEqual(['l', 'm', 'c', 'a', 'b', 'd']);
        s.execute({ type: 'moveSelection', direction: 'up' }); expect(children(s)).toEqual(['l', 'm', 'a', 'b', 'c', 'd']);
    });
    test('promotion adopts parent side, flipping appends and direction follows new side', () => {
        const s = new Store({ document: interleaved() }); s.setSelection(['a1', 'a2'], 'a2');
        s.execute({ type: 'moveSelection', direction: 'left' });
        expect(children(s)).toEqual(['a', 'a1', 'a2', 'l', 'b', 'm', 'c', 'd']);
        expect(s.model.nodes.get('a1')!.side).toBe('right');
        s.execute({ type: 'moveSelection', direction: 'left' });
        expect(children(s)).toEqual(['a', 'l', 'b', 'm', 'a1', 'a2', 'c', 'd']);
        expect(s.model.nodes.get('a1')!.side).toBe('left');
        expect(s.execute({ type: 'moveSelection', direction: 'left' })).toBe(false);
        s.execute({ type: 'moveSelection', direction: 'right' });
        expect(children(s)).toEqual(['a', 'l', 'b', 'm', 'c', 'd', 'a1', 'a2']);
    });
    test('left descendants promote immediately after parent and empty side appends', () => {
        const doc = interleaved(); doc.root.children[0]!.side = 'left';
        const s = new Store({ document: doc }); s.setSelection(['a1', 'a2'], 'a1');
        s.execute({ type: 'moveSelection', direction: 'right' }); expect(children(s).slice(0, 3)).toEqual(['a', 'a1', 'a2']);
        expect(s.model.nodes.get('a1')!.side).toBe('left');
        const only = new Store({ document: { root: { ...node('root'), children: [{ ...node('a', 'a', [node('sub')]), side: 'right' }] } } });
        only.setSelection(['a']); only.execute({ type: 'moveSelection', direction: 'left' });
        expect(only.model.nodes.get('a')!.side).toBe('left'); expect(children(only, 'a')).toEqual(['sub']);
    });
    test.each([['a', 'c'], ['a', 'l'], ['root'], ['a', 'a1'], ['a1', 'b'], [], ['a', 'b', 'c', 'd']])('ineligible/full block %j is unchanged by Up', (...ids: string[]) => {
        const s = new Store({ document: interleaved() }); s.setSelection(ids); const before = s.getDocument(), selection = s.selection;
        expect(s.canExecute({ type: 'moveSelection', direction: 'up' })).toBe(false);
        expect(s.execute({ type: 'moveSelection', direction: 'up' })).toBe(false);
        expect(s.getDocument()).toEqual(before); expect(s.selection).toEqual(selection); expect(s.history.canUndo).toBe(false);
    });
    test('read-only blocks all movement', () => { const s = new Store({ document: interleaved(), readonly: true }); s.setSelection(['a']); expect(s.canExecute({ type: 'moveSelection', direction: 'left' })).toBe(false); expect(() => s.execute({ type: 'moveSelection', direction: 'left' })).toThrow(); });
});
const geometry = (s: Store) => layout(s.model, new Map([...s.model.nodes.keys()].map(id => [id, { width: 60, height: id === 'a' ? 50 : 20 }])), { siblingGap: 3, rootSiblingGap: 4.5, branchGap: 20, rootGap: 20, markerRadius: 2.5, chainRise: 1.5 });
test('geometry navigation: central child, same-row exclusion, group crossing, both sides and collapsed expansion', () => {
    const s = new Store({ document: referenceMap() }), g = geometry(s);
    expect(navigate(s.model, g, 'one', 'right')).toEqual({ id: 'b' });
    expect(navigate(s.model, g, 'child2', 'left')).toEqual({ id: 'c22' });
    expect(navigate(s.model, g, 'child2', 'right')).toEqual({ id: 'root' });
    expect(navigate(s.model, g, 'one', 'left')).toEqual({ id: 'root' });
    expect(navigate(s.model, g, 'c', 'down').id).not.toBe('a');
    expect(navigate(s.model, g, 'collapsed', 'right')).toEqual({ expand: 'collapsed' });
    expect(navigate(s.model, g, undefined, 'up')).toEqual({});
    expect(navigate(s.model, g, 'a', 'up')).toEqual({});
});
test('Shift arrow path contracts and root-side sibling ranges use shared child order', () => {
    const s = new Store({ document: interleaved() }), path = new SelectionPath();
    let selection = { ids: ['a'], activeId: 'a' }; path.reset(selection);
    selection = path.arrow('a1', true, selection) as typeof selection;
    selection = path.arrow('a2', true, selection) as typeof selection;
    expect(selection.ids).toEqual(['a', 'a1', 'a2']);
    selection = path.arrow('a1', true, selection) as typeof selection; expect(selection.ids).toEqual(['a', 'a1']);
    expect(path.range(s.model, geometry(s), 'b', selection).ids).toEqual(['a', 'l', 'b']);
});
test('pointer zoom clamps around the same world point; fit and reveal preserve document-independent coordinates', () => {
    const view = { x: 100, y: 200, zoom: 1 };
    expect(zoomAt(view, 2, 150, 250)).toEqual({ x: 50, y: 150, zoom: 2 });
    expect(zoomAt(view, 100, 100, 200).zoom).toBe(4);
    expect(zoomAt(view, .001, 100, 200).zoom).toBe(.25);
    expect(fitBounds({ x: -50, y: -50, width: 100, height: 100 }, 248, 248)).toEqual({ x: 124, y: 124, zoom: 2 });
    expect(reveal(view, { x: 0, y: 0, width: 20, height: 20 }, 500, 500)).toEqual(view);
    expect(reveal(view, { x: 500, y: 0, width: 20, height: 20 }, 500, 500)).toEqual({ x: -36, y: 200, zoom: 1 });
});
test('vertical navigation stays at the same depth across groups; root keeps its entry behavior', () => {
    const s = new Store({ document: referenceMap() }), g = geometry(s);
    const centers: Record<string, number> = { root: 0, one: -40, a: -60, b: -40, c: -20, two: 10, single: 10, chain: 8, three: 50, n1: 30, n2: 40, n3: 60, n4: 80, c1: 55, c2: 65, collapsed: 54, child1: -30, child2: 20, c21: -5, c22: 20, c23: 40 };
    for (const [id, n] of g.nodes) n.box.y = centers[id]! - n.box.height / 2;
    expect(navigate(s.model, g, 'c', 'down')).toEqual({ id: 'single' });
    expect(navigate(s.model, g, 'two', 'up')).toEqual({ id: 'one' });
    expect(navigate(s.model, g, 'a', 'up')).toEqual({});
    expect(navigate(s.model, g, 'c21', 'up')).toEqual({});
    expect(navigate(s.model, g, 'root', 'up')).toEqual({ id: 'c21' });
    expect(navigate(s.model, g, 'root', 'down')).toEqual({ id: 'chain' });
    for (const n of g.nodes.values()) if (n.side === 'left') n.box.y -= 100;
    expect(navigate(s.model, g, 'c23', 'down')).toEqual({});
});

test.each(navigationExamples)('review navigation: $from + $direction → $to on either side', ({ from, direction, to }) => {
    for (const mirrored of [false, true]) {
        const document = referenceMap();
        if (mirrored) for (const child of document.root.children) child.side = child.side === 'right' ? 'left' : 'right';
        const s = new Store({ document });
        expect(navigate(s.model, geometry(s), from, direction)).toEqual({ id: to });
    }
});
test('siblings take priority over closer same-depth nodes in another group; cross-group ties are stable', () => {
    const s = new Store({ document: referenceMap() }), g = geometry(s);
    const at = (id: string, y: number) => { const n = g.nodes.get(id)!; n.box.y = y - n.box.height / 2; };
    at('a', -100); at('b', -40); at('c', -20); at('single', -70);
    expect(navigate(s.model, g, 'a', 'down')).toEqual({ id: 'b' });
    at('single', 0); at('n1', 0);
    expect(navigate(s.model, g, 'c', 'down')).toEqual({ id: 'single' });
});
test('collapsed descendants are excluded and non-root edges never fall back to ancestors or the opposite side', () => {
    const s = new Store({ document: referenceMap() });
    expect(navigate(s.model, geometry(s), 'single', 'up')).toEqual({ id: 'c' });
    s.execute({ type: 'collapse', targetId: 'one' });
    expect(navigate(s.model, geometry(s), 'single', 'up')).toEqual({});
    expect(navigate(s.model, geometry(s), 'collapsed', 'up')).toEqual({});
    expect(navigate(s.model, geometry(s), 'c23', 'down')).toEqual({});
    expect(navigate(s.model, geometry(s), 'three', 'down')).toEqual({});
});
