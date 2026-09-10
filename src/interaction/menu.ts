import type { MindMapCommand } from '../types';

export interface MenuItem { label: string; command: MindMapCommand; separatorBefore?: boolean; shortcut?: string }
/** Stable order; applicability always comes from the shared command path. */
export function menuItems(collapsed: boolean, checked: boolean): MenuItem[] {
    return [
        { label: 'Edit', command: { type: 'edit' }, shortcut: 'F2' },
        { label: 'Add child', command: { type: 'insertChild' }, separatorBefore: true, shortcut: 'Tab' },
        { label: 'Add sibling before', command: { type: 'insertBefore' }, shortcut: 'Shift+Enter' },
        { label: 'Add sibling after', command: { type: 'insertAfter' }, shortcut: 'Enter' },
        { label: 'Insert parent', command: { type: 'insertParent' }, shortcut: 'Shift+Tab' },
        { label: 'Delete', command: { type: 'delete' }, shortcut: 'Delete' },
        { label: 'Cut', command: { type: 'cut' }, separatorBefore: true, shortcut: 'Primary+X' },
        { label: 'Copy', command: { type: 'copy' }, shortcut: 'Primary+C' },
        { label: 'Paste', command: { type: 'paste' }, shortcut: 'Primary+V' },
        { label: collapsed ? 'Expand' : 'Collapse', command: { type: 'toggleCollapse' }, separatorBefore: true, shortcut: 'Space' },
        { label: checked ? 'Remove checkbox' : 'Add checkbox', command: { type: checked ? 'removeCheckbox' : 'addCheckbox' }, separatorBefore: true },
        { label: 'Toggle checked state', command: { type: 'toggleChecked' }, shortcut: 'Ctrl+Space' },
        { label: 'Open link', command: { type: 'openLink' }, separatorBefore: true },
    ];
}

export class ContextMenu {
    private menu: HTMLDivElement | undefined;
    private abort: AbortController | undefined;
    constructor(private readonly host: HTMLElement, private readonly can: (command: MindMapCommand) => boolean,
        private readonly execute: (command: MindMapCommand) => void) {}
    open(items: MenuItem[], x: number, y: number): void {
        this.close(false);
        const doc = this.host.ownerDocument, menu = doc.createElement('div');
        this.menu = menu; this.abort = new AbortController();
        const options = { signal: this.abort.signal };
        menu.className = 'mindmap-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Node commands');
        const mac = /Mac|iPhone|iPad/.test(doc.defaultView!.navigator.platform);
        const buttons = items.map(item => {
            if (item.separatorBefore) {
                const separator = doc.createElement('div');
                separator.className = 'mindmap-menu-separator'; separator.setAttribute('role', 'separator');
                menu.append(separator);
            }
            const button = doc.createElement('button');
            button.type = 'button'; button.tabIndex = -1; button.setAttribute('role', 'menuitem');
            const label = doc.createElement('span');
            label.className = 'mindmap-menu-label'; label.textContent = item.label; button.append(label);
            if (item.shortcut) {
                const hint = doc.createElement('span');
                hint.className = 'mindmap-menu-shortcut'; hint.setAttribute('aria-hidden', 'true');
                hint.textContent = item.shortcut.replace('Primary+', mac ? '⌘' : 'Ctrl+');
                button.setAttribute('aria-keyshortcuts', item.shortcut.replace('Primary', mac ? 'Meta' : 'Control').replace('Ctrl', 'Control'));
                button.append(hint);
            }
            button.setAttribute('aria-disabled', String(!this.can(item.command)));
            button.addEventListener('click', () => {
                if (!this.can(item.command)) return;
                this.close(true); this.execute(item.command);
            }, options);
            menu.append(button); return button;
        });
        this.host.append(menu);
        Object.assign(menu.style, {
            left: `${Math.max(0, Math.min(x, this.host.clientWidth - menu.offsetWidth))}px`,
            top: `${Math.max(0, Math.min(y, this.host.clientHeight - menu.offsetHeight))}px`,
        });
        // Disabled items remain focusable for discovery, but can never execute.
        menu.addEventListener('keydown', e => {
            e.stopPropagation();
            const index = buttons.indexOf(doc.activeElement as HTMLButtonElement);
            let next: number | undefined;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') menu.classList.add('mindmap-menu-navigated');
            if (e.key === 'ArrowDown') next = (index + 1) % buttons.length;
            if (e.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
            if (e.key === 'Home') next = 0;
            if (e.key === 'End') next = buttons.length - 1;
            if (next !== undefined) { e.preventDefault(); buttons[next]!.focus({ preventScroll: true }); buttons[next]!.scrollIntoView({ block: 'nearest' }); }
            if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); this.close(true); }
        }, options);
        menu.addEventListener('pointerdown', e => e.stopPropagation(), options);
        menu.addEventListener('wheel', e => e.stopPropagation(), options);
        doc.addEventListener('pointerdown', e => { if (!menu.contains(e.target as Node)) this.close(this.host.contains(e.target as Node)); }, { ...options, capture: true });
        doc.addEventListener('focusin', e => { if (!menu.contains(e.target as Node)) this.close(false); }, options);
        buttons[0]!.focus({ preventScroll: true });
    }
    close(focus = false): void {
        const existed = !!this.menu;
        this.abort?.abort(); this.abort = undefined;
        this.menu?.remove(); this.menu = undefined;
        if (existed && focus) this.host.focus({ preventScroll: true });
    }
}
