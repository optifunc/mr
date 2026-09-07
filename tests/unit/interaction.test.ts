import { describe, expect, test } from 'vitest';
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
