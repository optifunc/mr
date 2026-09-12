import { expect, test } from 'vitest';
import { Store } from '../../src/model/store';
import { referenceMap } from '../fixtures/maps';

test.each([
    { name: 'first sibling', ids: ['a'], active: 'a', next: 'b' },
    { name: 'middle sibling', ids: ['b'], active: 'b', next: 'c' },
    { name: 'last sibling', ids: ['c'], active: 'c', next: 'b' },
    { name: 'only child', ids: ['single'], active: 'single', next: 'two' },
    { name: 'following deleted siblings', ids: ['a', 'b'], active: 'a', next: 'c' },
    { name: 'preceding deleted siblings', ids: ['b', 'c'], active: 'c', next: 'a' },
    { name: 'noncontiguous deletion', ids: ['a', 'c'], active: 'a', next: 'b' },
    { name: 'all siblings', ids: ['a', 'b', 'c'], active: 'b', next: 'one' },
    { name: 'active descendant of removed ancestor', ids: ['one', 'a', 'two'], active: 'a', next: 'three' },
    { name: 'multiple parents use active subtree', ids: ['a', 'c22'], active: 'c22', next: 'c23' },
    { name: 'surviving active node', ids: ['one'], active: 'child1', next: 'child1' },
    { name: 'root siblings across sides', ids: ['child2'], active: 'child2', next: 'one' },
    { name: 'all root siblings', ids: ['child1', 'child2', 'one', 'two', 'three'], active: 'one', next: 'root' },
    { name: 'empty selection with explicit targets', ids: ['b'], active: undefined, next: 'c' },
])('$name selects $next and undo/redo restores both states', ({ ids, active, next }) => {
    const s = new Store({ document: referenceMap() });
    s.setSelection(active ? [...new Set([...ids, active])] : [], active);
    const before = s.getDocument(), selection = s.selection;
    expect(s.execute({ type: 'delete', ids })).toBe(true);
    const after = s.getDocument();
    expect(s.selection).toEqual({ ids: [next], activeId: next });
    for (const id of ids) expect(s.model.nodes.has(id)).toBe(false);
    expect(s.execute({ type: 'undo' })).toBe(true);
    expect(s.getDocument()).toEqual(before);
    expect(s.selection).toEqual(selection);
    expect(s.history.canUndo).toBe(false);
    expect(s.execute({ type: 'redo' })).toBe(true);
    expect(s.getDocument()).toEqual(after);
    expect(s.selection).toEqual({ ids: [next], activeId: next });
});
