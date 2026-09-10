import type { MindMapCommand } from '../types';

export interface MenuItem { label: string; command: MindMapCommand }
/** Stable order; applicability always comes from the shared command path. */
export function menuItems(collapsed: boolean, checked: boolean): MenuItem[] {
    return [
        { label: 'Edit', command: { type: 'edit' } },
        { label: 'Add child', command: { type: 'insertChild' } },
        { label: 'Add sibling before', command: { type: 'insertBefore' } },
        { label: 'Add sibling after', command: { type: 'insertAfter' } },
        { label: 'Insert parent', command: { type: 'insertParent' } },
        { label: 'Cut', command: { type: 'cut' } },
        { label: 'Copy', command: { type: 'copy' } },
        { label: 'Paste', command: { type: 'paste' } },
        { label: 'Delete', command: { type: 'delete' } },
        { label: collapsed ? 'Expand' : 'Collapse', command: { type: 'toggleCollapse' } },
        { label: checked ? 'Remove checkbox' : 'Add checkbox', command: { type: checked ? 'removeCheckbox' : 'addCheckbox' } },
        { label: 'Toggle checked state', command: { type: 'toggleChecked' } },
        { label: 'Open link', command: { type: 'openLink' } },
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
        const buttons = items.map(item => {
            const button = doc.createElement('button');
            button.type = 'button'; button.tabIndex = -1; button.setAttribute('role', 'menuitem');
            button.textContent = item.label; button.setAttribute('aria-disabled', String(!this.can(item.command)));
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
