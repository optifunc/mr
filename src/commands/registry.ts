import type { MindMapCommand } from '../types';

export type ActionId = MindMapCommand['type'] | 'toggleCheckbox' | 'extendSelection' | 'contextMenu' | 'finishEditing' | 'cancelEditing' | 'newLine' | 'cancelDrag';
export type InputContext = 'canvas' | 'label' | 'drag';
export type ShortcutGroup = 'Create & edit' | 'While editing a label' | 'Selection & structure' | 'Tasks & history' | 'View & navigation';
export interface Shortcut {
    /** Arrow matches the four direction keys. Click is reference/pointer metadata. */
    readonly key: string;
    readonly primary?: boolean;
    readonly control?: boolean;
    readonly shift?: boolean;
    readonly code?: string;
    readonly aliases?: readonly string[];
    /** Preserve established modifier handling, without advertising extra chords. */
    readonly allowExtra?: readonly ('shift' | 'control' | 'meta' | 'alt')[];
    readonly native?: boolean;
}
export interface ActionDefinition {
    readonly id: ActionId;
    readonly label: string;
    readonly toolbarLabel?: string;
    readonly context: InputContext;
    readonly group?: ShortcutGroup;
    readonly bindings: readonly Shortcut[];
    readonly menuGroup?: number;
    readonly stopPropagation?: boolean;
}
const key = (key: string, rest: Omit<Shortcut, 'key'> = {}): Shortcut => ({ key, ...rest });
const primary = (value: string, rest: Omit<Shortcut, 'key' | 'primary'> = {}): Shortcut =>
    key(value, { primary: true, allowExtra: ['shift', 'control', 'meta'], ...rest });
const canvas = (id: ActionId, label: string, bindings: readonly Shortcut[], group?: ShortcutGroup,
    extra: Partial<ActionDefinition> = {}): ActionDefinition => ({ id, label, context: 'canvas', bindings, ...(group ? { group } : {}), ...extra });
const plain = (value: string, shift = false): Shortcut => key(value, { shift, allowExtra: ['control', 'meta'] });
const arrows = key('Arrow', { allowExtra: ['control', 'meta'] });

// Definition order is also the stable context-menu order for entries with menuGroup.
const definitions: ActionDefinition[] = [
    canvas('edit', 'Edit', [key('F2', { allowExtra: ['shift', 'control', 'meta'] })], 'Create & edit', { menuGroup: 0 }),
    canvas('insertChild', 'Add child', [plain('Tab')], 'Create & edit', { menuGroup: 1 }),
    canvas('insertBefore', 'Add sibling before', [plain('Enter', true)], 'Create & edit', { menuGroup: 1 }),
    canvas('insertAfter', 'Add sibling after', [plain('Enter')], 'Create & edit', { menuGroup: 1, toolbarLabel: 'Add sibling' }),
    canvas('insertParent', 'Insert parent', [plain('Tab', true)], 'Create & edit', { menuGroup: 1 }),
    canvas('delete', 'Delete', [key('Delete', { allowExtra: ['shift', 'control', 'meta'] })], 'Create & edit', { menuGroup: 1 }),
    canvas('cut', 'Cut', [primary('X', { native: true })], 'Tasks & history', { menuGroup: 2 }),
    canvas('copy', 'Copy', [primary('C', { native: true })], 'Tasks & history', { menuGroup: 2 }),
    canvas('paste', 'Paste', [primary('V', { native: true })], 'Tasks & history', { menuGroup: 2 }),
    canvas('toggleCollapse', 'Expand / collapse', [key('Space', { allowExtra: ['shift'] })], 'Selection & structure', { menuGroup: 3 }),
    canvas('toggleCheckbox', 'Add / remove checkbox', [primary('1', { allowExtra: [] })], 'Tasks & history', { menuGroup: 4, stopPropagation: true }),
    canvas('toggleChecked', 'Toggle checked state', [key('Space', { control: true, allowExtra: ['shift'] })], 'Tasks & history', { menuGroup: 4 }),
    canvas('openLink', 'Open link', [key('Click', { primary: true, allowExtra: ['shift', 'control', 'meta', 'alt'] })], 'View & navigation', { menuGroup: 5 }),
    canvas('undo', 'Undo', [primary('Z', { shift: false, allowExtra: ['control', 'meta'] })], 'Tasks & history'),
    canvas('redo', 'Redo', [primary('Z', { shift: true }), primary('Y')], 'Tasks & history'),
    canvas('navigate', 'Navigate', [arrows], 'Selection & structure'),
    canvas('extendSelection', 'Extend selection', [{ ...arrows, shift: true }], 'Selection & structure'),
    canvas('moveSelection', 'Move selection', [primary('Arrow')], 'Selection & structure'),
    canvas('selectAll', 'Select all', [primary('A')], 'Selection & structure'),
    canvas('clearSelection', 'Clear selection', [key('Escape', { allowExtra: ['shift', 'control', 'meta', 'alt'] })], 'Selection & structure'),
    canvas('zoomIn', 'Zoom in', [primary('+', { aliases: ['='] })], 'View & navigation', { stopPropagation: true }),
    canvas('zoomOut', 'Zoom out', [primary('-')], 'View & navigation', { stopPropagation: true }),
    canvas('resetZoom', 'Reset zoom', [primary('0', { shift: false, allowExtra: ['control', 'meta'] })], 'View & navigation', { stopPropagation: true }),
    canvas('fit', 'Fit map', [primary('0', { shift: true, code: 'Digit0' })], 'View & navigation', { stopPropagation: true }),
    canvas('contextMenu', 'Open node menu', [key('F10', { shift: true, allowExtra: ['control', 'meta', 'alt'] }), key('ContextMenu', { allowExtra: ['shift', 'control', 'meta', 'alt'] })], 'View & navigation'),
    { id: 'cancelDrag', label: 'Cancel drag', context: 'drag', bindings: [key('Escape', { allowExtra: ['shift', 'control', 'meta', 'alt'] })] },
    ...([
        ['finishEditing', 'Finish editing', key('Enter', { allowExtra: ['control', 'meta', 'alt'] })],
        ['newLine', 'Add a line', key('Enter', { shift: true, native: true })],
        ['cancelEditing', 'Cancel editing', key('Escape', { allowExtra: ['shift', 'control', 'meta', 'alt'] })],
    ] as const).map(([id, label, binding]): ActionDefinition => ({ id, label, context: 'label', group: 'While editing a label', bindings: [binding] })),
    ...([
        ['setText', 'Set text'], ['expand', 'Expand'], ['collapse', 'Collapse'],
        ['addCheckbox', 'Add checkbox'], ['removeCheckbox', 'Remove checkbox'], ['move', 'Move'],
    ] as const).map(([id, label]) => canvas(id, label, [])),
];
function freeze(value: object): void {
    for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
    Object.freeze(value);
}
freeze(definitions);

/** Detached metadata: consumers cannot change the running widget's keymap. */
export function getActionDefinitions(): readonly ActionDefinition[] { return structuredClone(definitions); }
export const shortcutGroups: readonly ShortcutGroup[] = Object.freeze([
    'Create & edit', 'While editing a label', 'Selection & structure', 'Tasks & history', 'View & navigation',
]);
export function getKeymapReference(registry: readonly ActionDefinition[] = definitions): readonly ActionDefinition[] {
    return structuredClone(registry.filter(action => action.group && action.bindings.length));
}
export function isMacPlatform(platform: string): boolean { return /Mac|iPhone|iPad/.test(platform); }
export interface KeyInput {
    key: string; code?: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean;
    isComposing?: boolean; keyCode?: number;
}
export function matchesShortcut(binding: Shortcut, input: KeyInput, mac: boolean): boolean {
    if (input.isComposing || input.keyCode === 229) return false;
    const pressed = input.key.toLowerCase();
    const name = binding.key === 'Space' ? ' ' : binding.key.toLowerCase();
    if (!(binding.key === 'Arrow' ? /^arrow(left|right|up|down)$/.test(pressed) : pressed === name)
        && !binding.aliases?.some(alias => alias.toLowerCase() === pressed)
        && !(binding.code && input.code === binding.code)) return false;
    const expected = { control: !!binding.control || !!binding.primary && !mac, meta: !!binding.primary && mac, shift: !!binding.shift, alt: false };
    const actual = { control: input.ctrlKey, meta: input.metaKey, shift: input.shiftKey, alt: input.altKey };
    return (Object.keys(expected) as (keyof typeof expected)[]).every(modifier =>
        expected[modifier] ? actual[modifier] : !actual[modifier] || !!binding.allowExtra?.includes(modifier));
}
export function resolveShortcut(input: KeyInput, context: InputContext, mac: boolean,
    registry: readonly ActionDefinition[] = definitions): ActionDefinition | undefined {
    const isPrimary = mac ? input.metaKey : input.ctrlKey;
    return registry.find(action => action.context === context && action.bindings.some(binding => {
        // Canvas primary chords take precedence over plain keys and arrows.
        if (context === 'canvas' && action.id !== 'contextMenu' && binding.key !== 'Click'
            && !binding.control && !!binding.primary !== isPrimary) return false;
        return matchesShortcut(binding, input, mac);
    }));
}
export function formatShortcut(binding: Shortcut, mac: boolean, aria = false): string {
    if (aria && binding.key === 'Arrow') return ['Left', 'Right', 'Up', 'Down']
        .map(direction => formatShortcut({ ...binding, key: `Arrow${direction}` }, mac, true)).join(' ');
    const modifiers: string[] = [];
    if (binding.primary) modifiers.push(aria ? mac ? 'Meta' : 'Control' : mac ? '⌘' : 'Ctrl');
    if (binding.control && !(binding.primary && !mac)) modifiers.push(aria ? 'Control' : 'Ctrl');
    if (binding.shift) modifiers.push('Shift');
    const name = binding.key === 'Click' ? 'click' : binding.key === 'Arrow' ? 'Arrow keys' : aria && binding.key === '+' ? 'plus' : binding.key;
    const text = [...modifiers, name].join('+');
    return aria ? text : text.replace('⌘+', '⌘');
}

export interface ActionState { collapsed?: boolean; checkboxPresent?: boolean; }
export interface CommandDescriptor {
    id: ActionId; label: string; toolbarLabel: string; command: MindMapCommand;
    bindings: readonly Shortcut[]; separatorBefore: boolean;
}
export function actionCommand(id: ActionId, state: ActionState = {}, input?: KeyInput): MindMapCommand | undefined {
    if (id === 'toggleCheckbox') return { type: state.checkboxPresent ? 'removeCheckbox' : 'addCheckbox' };
    if (id === 'navigate' || id === 'extendSelection' || id === 'moveSelection') {
        const direction = input?.key.toLowerCase().slice(5);
        if (!['left', 'right', 'up', 'down'].includes(direction ?? '')) return;
        return id === 'moveSelection' ? { type: id, direction: direction as 'left' | 'right' | 'up' | 'down' }
            : { type: 'navigate', direction: direction as 'left' | 'right' | 'up' | 'down', extend: id === 'extendSelection' };
    }
    if (['contextMenu', 'finishEditing', 'cancelEditing', 'newLine', 'cancelDrag', 'setText', 'move'].includes(id)) return;
    return { type: id } as MindMapCommand;
}
export function getCommandDescriptors(state: ActionState = {}, registry: readonly ActionDefinition[] = definitions): CommandDescriptor[] {
    let previousGroup: number | undefined;
    return registry.flatMap(action => {
        const command = actionCommand(action.id, state);
        if (!command) return [];
        const label = action.id === 'toggleCollapse' ? state.collapsed ? 'Expand' : 'Collapse'
            : action.id === 'toggleCheckbox' ? state.checkboxPresent ? 'Remove checkbox' : 'Add checkbox' : action.label;
        const separatorBefore = action.menuGroup !== undefined && previousGroup !== undefined && action.menuGroup !== previousGroup;
        if (action.menuGroup !== undefined) previousGroup = action.menuGroup;
        return [{ id: action.id, label, toolbarLabel: action.toolbarLabel ?? label, command,
            bindings: structuredClone(action.bindings), separatorBefore }];
    });
}
export function getNodeMenuDescriptors(state: ActionState = {}, registry: readonly ActionDefinition[] = definitions): CommandDescriptor[] {
    return getCommandDescriptors(state, registry.filter(action => action.menuGroup !== undefined));
}
