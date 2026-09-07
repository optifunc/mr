import { expect, test } from 'vitest';
import { Store } from '../../src/model/store';
import { geometryMap, referenceMap } from '../fixtures/maps';
test.each(['insertChild', 'insertBefore', 'insertAfter', 'insertParent'] as const)('%s creation and initial text are one transaction; cancellation preserves redo', type => {
    const s = new Store({ document: referenceMap(), createNodeId: () => 'new' });
    s.execute({ type: 'setText', targetId: 'root', text: 'changed' }); s.execute({ type: 'undo' });
    s.setSelection(['collapsed']); const before = s.getDocument(), selection = s.selection;
    s.beginCreation({ type }); expect(s.model.nodes.has('new')).toBe(true); expect(s.history.canUndo).toBe(false); expect(s.history.canRedo).toBe(true);
    expect(s.model.nodes.get('new')!.text).toBe(''); s.cancelEdit();
    expect(s.getDocument()).toEqual(before); expect(s.selection).toEqual(selection); expect(s.history.canRedo).toBe(true);
    s.beginCreation({ type }); s.commitEdit('new\nlabel'); expect(s.history.canUndo).toBe(true); expect(s.history.canRedo).toBe(false);
    s.execute({ type: 'undo' }); expect(s.getDocument()).toEqual(before); expect(s.selection).toEqual(selection); expect(s.history.canUndo).toBe(false);
    s.execute({ type: 'redo' }); expect(s.model.nodes.get('new')!.text).toBe('new\nlabel');
});
test('cancel expansion/wrapping exactly; checkbox inheritance and root inserted parent exclusion', () => {
    const s = new Store({ document: geometryMap(), createNodeId: () => 'new' });
    s.setSelection(['multi']); s.execute({ type: 'collapse' }); const before = s.getDocument();
    s.beginCreation({ type: 'insertChild' }); expect(s.model.nodes.get('multi')!.collapsed).toBe(false); expect(s.model.nodes.get('new')!.checked).toBe(false);
    s.cancelEdit(); expect(s.getDocument()).toEqual(before);
    s.setSelection(['root']); s.beginCreation({ type: 'insertParent' }); expect(s.model.nodes.get('new')!.side).toBe('left'); expect(s.model.nodes.get('new')!.checked).toBeUndefined();
});
test('unchanged and cancelled existing label edits preserve undo/redo; changed label commits once', () => {
    const s = new Store({ document: referenceMap() }); s.setSelection(['one']); s.beginEdit('one');
    expect(s.commitEdit('One')).toBe(false); expect(s.history.canUndo).toBe(false);
    s.beginEdit('one'); s.cancelEdit(); expect(s.getDocument()).toEqual(referenceMap());
    s.beginEdit('one'); expect(s.commitEdit('First\nSecond')).toBe(true); s.execute({ type: 'undo' }); expect(s.model.nodes.get('one')!.text).toBe('One'); expect(s.history.canUndo).toBe(false);
});
test('ID callback rejection leaves provisional state, selection, document and history intact', () => {
    const s = new Store({ document: referenceMap(), createNodeId: () => 'one' }); const before = s.getDocument();
    expect(() => s.beginCreation({ type: 'insertChild' })).toThrow(); expect(s.edit).toBeUndefined(); expect(s.getDocument()).toEqual(before); expect(s.history.canUndo).toBe(false);
});
