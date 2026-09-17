import { formatShortcut, getActionDefinitions, isMacPlatform } from '../commands/registry';
/** Per-entry hover hint, independent of the browser's native tooltip timer. */
export class LinkTooltip {
    private readonly abort = new AbortController();
    private readonly tip: HTMLDivElement;
    private node: HTMLElement | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor(private readonly widget: HTMLElement) {
        const doc = widget.ownerDocument;
        this.tip = doc.createElement('div');
        this.tip.className = 'mindmap-link-tooltip';
        this.tip.id = `mindmap-link-tooltip-${crypto.randomUUID()}`;
        this.tip.setAttribute('role', 'tooltip');
        const binding = getActionDefinitions().find(action => action.id === 'openLink')!.bindings[0]!;
        this.tip.textContent = `${formatShortcut(binding, isMacPlatform(doc.defaultView!.navigator.platform)).replace('⌘', 'Cmd+')} to open`;
        this.tip.hidden = true;
        widget.append(this.tip);
        const signal = this.abort.signal;
        widget.addEventListener('pointerover', event => {
            if (event.pointerType === 'touch' || event.buttons) return;
            const node = this.linkNode(event.target);
            if (!node || node === this.node || widget.querySelector('textarea, [role="menu"]')) return;
            this.hide();
            this.node = node;
            this.timer = setTimeout(() => this.show(), 1000);
        }, { signal });
        widget.addEventListener('pointerout', event => {
            if (this.node && this.linkNode(event.relatedTarget) !== this.node) this.hide();
        }, { signal });
        for (const type of ['pointerdown', 'pointercancel', 'keydown', 'wheel', 'contextmenu'])
            widget.addEventListener(type, () => this.hide(), { signal, capture: true });
        doc.defaultView!.addEventListener('blur', () => this.hide(), { signal });
        doc.addEventListener('visibilitychange', () => this.hide(), { signal });
    }

    private linkNode(target: EventTarget | null): HTMLElement | undefined {
        const node = target instanceof Element ? target.closest<HTMLElement>('.mindmap-node') : null;
        return node && this.widget.contains(node) && node.querySelector('.mindmap-link') ? node : undefined;
    }

    private show(): void {
        this.timer = undefined;
        const node = this.node;
        if (!node?.isConnected || !this.widget.checkVisibility() || !node.querySelector('.mindmap-link')) { this.hide(); return; }
        this.tip.hidden = false;
        // The hint lives outside the scaled scene and stays within this editor.
        const bounds = this.widget.getBoundingClientRect(), anchor = node.getBoundingClientRect();
        const scaleX = bounds.width / this.widget.offsetWidth, scaleY = bounds.height / this.widget.offsetHeight;
        const x = (anchor.left - bounds.left) / scaleX;
        const bottom = (anchor.bottom - bounds.top) / scaleY + 6;
        const y = bottom + this.tip.offsetHeight <= this.widget.clientHeight - 4
            ? bottom : (anchor.top - bounds.top) / scaleY - this.tip.offsetHeight - 6;
        this.tip.style.left = `${Math.max(4, Math.min(x, this.widget.clientWidth - this.tip.offsetWidth - 4))}px`;
        this.tip.style.top = `${Math.max(4, Math.min(y, this.widget.clientHeight - this.tip.offsetHeight - 4))}px`;
        node.setAttribute('aria-describedby', [node.getAttribute('aria-describedby'), this.tip.id].filter(Boolean).join(' '));
    }

    hide(): void {
        clearTimeout(this.timer); this.timer = undefined;
        if (this.node) {
            const ids = (this.node.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== this.tip.id);
            if (ids.length) this.node.setAttribute('aria-describedby', ids.join(' '));
            else this.node.removeAttribute('aria-describedby');
        }
        this.node = undefined;
        this.tip.hidden = true;
    }

    destroy(): void { this.hide(); this.abort.abort(); this.tip.remove(); }
}
