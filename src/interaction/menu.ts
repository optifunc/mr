import type { MindMapCommand } from '../types';

import { formatShortcut, getNodeMenuDescriptors, isMacPlatform } from '../commands/registry';
import type { CommandDescriptor, Shortcut } from '../commands/registry';

export interface MenuItem {
    label: string; command: MindMapCommand; separatorBefore?: boolean;
    bindings?: readonly Shortcut[];
}
export interface HostMenuItem {
    label: string; action(): void; canExecute(): boolean; separatorBefore?: boolean;
}
export type MenuEntry = MenuItem | HostMenuItem;
export interface MenuOpenOptions {
    returnFocus?: HTMLElement | (() => void);
    label?: string;
    onClose?: () => void;
}
/** Stable order and dynamic labels come from the same registry as keyboard input. */
export function menuItems(collapsed: boolean, checked: boolean): CommandDescriptor[] {
    return getNodeMenuDescriptors({ collapsed, checkboxPresent: checked });
}

export class ContextMenu {
    private menu: HTMLDivElement | undefined;
    private abort: AbortController | undefined;
    private options: MenuOpenOptions = {};
    private resize: ResizeObserver | undefined;
    constructor(private readonly host: HTMLElement, private readonly can: (command: MindMapCommand) => boolean,
        private readonly execute: (command: MindMapCommand) => void) {}
    open(items: readonly MenuEntry[], x: number, y: number, settings: MenuOpenOptions = {}): void {
        this.close(false);
        if (!items.length) return;
        this.options = settings;
        const doc = this.host.ownerDocument, menu = doc.createElement('div');
        this.menu = menu; this.abort = new AbortController();
        const options = { signal: this.abort.signal };
        menu.className = 'mindmap-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', settings.label ?? 'Node commands');
        const mac = isMacPlatform(doc.defaultView!.navigator.platform);
        const can = (item: MenuEntry): boolean => 'command' in item ? this.can(item.command) : item.canExecute();
        const buttons = items.map((item, index) => {
            if (index && item.separatorBefore) {
                const separator = doc.createElement('div');
                separator.className = 'mindmap-menu-separator'; separator.setAttribute('role', 'separator');
                menu.append(separator);
            }
            const button = doc.createElement('button');
            button.type = 'button'; button.tabIndex = -1; button.setAttribute('role', 'menuitem');
            const label = doc.createElement('span');
            label.className = 'mindmap-menu-label'; label.textContent = item.label; button.append(label);
            const binding = 'command' in item ? item.bindings?.find(binding => binding.key !== 'Click') : undefined;
            if (binding) {
                const hint = doc.createElement('span');
                hint.className = 'mindmap-menu-shortcut'; hint.setAttribute('aria-hidden', 'true');
                hint.textContent = formatShortcut(binding, mac);
                button.setAttribute('aria-keyshortcuts', formatShortcut(binding, mac, true));
                button.append(hint);
            }
            button.setAttribute('aria-disabled', String(!can(item)));
            button.addEventListener('click', () => {
                if (!can(item)) return;
                this.close(true);
                if ('command' in item) this.execute(item.command); else item.action();
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
        doc.addEventListener('pointerdown', e => { if (!menu.contains(e.target as Node)) this.close(false); }, { ...options, capture: true });
        doc.addEventListener('focusin', e => { if (!menu.contains(e.target as Node)) this.close(false); }, options);
        const width = this.host.clientWidth, height = this.host.clientHeight;
        this.resize = new ResizeObserver(() => {
            if (this.host.clientWidth !== width || this.host.clientHeight !== height) this.close(false);
        });
        this.resize.observe(this.host);
        buttons[0]!.focus({ preventScroll: true });
    }
    close(focus = false): void {
        const existed = !!this.menu;
        this.abort?.abort(); this.abort = undefined;
        this.resize?.disconnect(); this.resize = undefined;
        this.menu?.remove(); this.menu = undefined;
        const settings = this.options; this.options = {};
        if (existed && focus) {
            const target = settings.returnFocus ?? this.host;
            if (typeof target === 'function') target();
            else if (target.isConnected) target.focus({ preventScroll: true });
        }
        if (existed) settings.onClose?.();
    }
}
