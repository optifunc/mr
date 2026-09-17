import { expect, test } from 'vitest';
import { actionCommand, formatShortcut, getActionDefinitions, getCommandDescriptors, getKeymapReference, getNodeMenuDescriptors, resolveShortcut } from '../../src/commands/registry';
import type { KeyInput } from '../../src/commands/registry';

const input = (key: string, modifiers: Partial<KeyInput> = {}): KeyInput =>
    ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers });

for (const mac of [true, false]) test(`default canvas bindings and platform exclusions: ${mac ? 'Mac' : 'Windows/Linux'}`, () => {
    const primary = mac ? { metaKey: true } : { ctrlKey: true };
    const cases = [
        ['F2', {}, 'edit'], ['Tab', {}, 'insertChild'], ['Tab', { shiftKey: true }, 'insertParent'],
        ['Enter', {}, 'insertAfter'], ['Enter', { shiftKey: true }, 'insertBefore'], ['Delete', {}, 'delete'],
        [' ', {}, 'toggleCollapse'], [' ', { ctrlKey: true }, 'toggleChecked'],
        ['1', primary, 'toggleCheckbox'], ['a', primary, 'selectAll'],
        ['z', primary, 'undo'], ['z', { ...primary, shiftKey: true }, 'redo'], ['y', primary, 'redo'],
        ['+', primary, 'zoomIn'], ['=', primary, 'zoomIn'], ['-', primary, 'zoomOut'], ['0', primary, 'resetZoom'],
        [')', { ...primary, shiftKey: true, code: 'Digit0' }, 'fit'],
        ['ArrowUp', {}, 'navigate'], ['ArrowLeft', { shiftKey: true }, 'extendSelection'], ['ArrowDown', primary, 'moveSelection'],
        ['F10', { shiftKey: true }, 'contextMenu'], ['ContextMenu', {}, 'contextMenu'], ['Escape', {}, 'clearSelection'],
    ] as const;
    for (const [key, modifiers, expected] of cases) expect(resolveShortcut(input(key, modifiers), 'canvas', mac)?.id, key).toBe(expected);
    for (const modifiers of [{ ...primary, shiftKey: true }, { ...primary, altKey: true }, { ctrlKey: true, metaKey: true }])
        expect(resolveShortcut(input('1', modifiers), 'canvas', mac)).toBeUndefined();
    expect(resolveShortcut(input(' ', { metaKey: true }), 'canvas', mac)).toBeUndefined();
    expect(resolveShortcut(input('F2', { isComposing: true }), 'canvas', mac)).toBeUndefined();
    expect(resolveShortcut(input('Enter', { keyCode: 229 }), 'label', mac)).toBeUndefined();
    expect(resolveShortcut(input('Tab', { altKey: true }), 'canvas', mac)).toBeUndefined();
    for (const [key, id] of [['x', 'cut'], ['c', 'copy'], ['v', 'paste']] as const) {
        const result = resolveShortcut(input(key, primary), 'canvas', mac)!;
        expect(result.id).toBe(id); expect(result.bindings[0]!.native).toBe(true);
    }
});
test('label context preserves native text handling and isolates canvas bindings', () => {
    expect(resolveShortcut(input('Enter'), 'label', true)?.id).toBe('finishEditing');
    expect(resolveShortcut(input('Escape'), 'label', true)?.id).toBe('cancelEditing');
    expect(resolveShortcut(input('Enter', { shiftKey: true }), 'label', true)?.bindings[0]!.native).toBe(true);
    for (const key of ['z', 'x', 'c', 'v', '1']) expect(resolveShortcut(input(key, { metaKey: true }), 'label', true)).toBeUndefined();
    expect(resolveShortcut(input('F2'), 'label', true)).toBeUndefined();
    expect(resolveShortcut(input('Escape', { altKey: true }), 'canvas', true)?.id).toBe('clearSelection');
    expect(resolveShortcut(input('Escape', { metaKey: true }), 'drag', true)?.id).toBe('cancelDrag');
});
test('dynamic command labels and bindings share active-node semantics', () => {
    const entries = getNodeMenuDescriptors({ collapsed: true, checkboxPresent: true });
    expect(entries.map(item => item.label)).toEqual(['Edit', 'Add child', 'Add sibling before', 'Add sibling after', 'Insert parent', 'Delete', 'Cut', 'Copy', 'Paste', 'Expand', 'Remove checkbox', 'Toggle checked state', 'Open link']);
    expect(entries.filter(item => item.separatorBefore).map(item => item.label)).toEqual(['Add child', 'Cut', 'Expand', 'Remove checkbox', 'Open link']);
    expect(actionCommand('toggleCheckbox', { checkboxPresent: true })).toEqual({ type: 'removeCheckbox' });
    expect(actionCommand('toggleCheckbox')).toEqual({ type: 'addCheckbox' });
    expect(actionCommand('extendSelection', {}, input('ArrowLeft'))).toEqual({ type: 'navigate', direction: 'left', extend: true });
    expect(entries.find(item => item.id === 'insertAfter')!.toolbarLabel).toBe('Add sibling');
});
test('reference exports all contexts and alternate bindings without an editor', () => {
    const reference = getKeymapReference();
    expect(reference.filter(row => row.context === 'label').map(row => row.label)).toEqual(['Finish editing', 'Add a line', 'Cancel editing']);
    expect(reference.find(row => row.id === 'redo')!.bindings.map(b => formatShortcut(b, true))).toEqual(['⌘Shift+Z', '⌘Y']);
    expect(reference.find(row => row.id === 'toggleChecked')!.bindings.map(b => formatShortcut(b, true, true))).toEqual(['Control+Space']);
    expect(reference.find(row => row.id === 'openLink')!.bindings.map(b => formatShortcut(b, false))).toEqual(['Ctrl+click']);
    expect(formatShortcut({ key: 'Arrow', primary: true }, true, true)).toBe('Meta+ArrowLeft Meta+ArrowRight Meta+ArrowUp Meta+ArrowDown');
});
test('one changed registry binding drives resolution, descriptors and keymap hints', () => {
    const fixture = getActionDefinitions().map(action => action.id === 'edit' ? { ...action, bindings: [{ key: 'F3' }] } : action);
    expect(resolveShortcut(input('F3'), 'canvas', false, fixture)?.id).toBe('edit');
    expect(resolveShortcut(input('F2'), 'canvas', false, fixture)).toBeUndefined();
    for (const source of [getNodeMenuDescriptors({}, fixture), getCommandDescriptors({}, fixture), getKeymapReference(fixture)]) {
        expect(formatShortcut(source.find(row => row.id === 'edit')!.bindings[0]!, false)).toBe('F3');
    }
    expect(resolveShortcut(input('F2'), 'canvas', false)?.id).toBe('edit');
    expect(() => { Object.assign(resolveShortcut(input('F2'), 'canvas', false)!, { label: 'Changed' }); }).toThrow();
});
