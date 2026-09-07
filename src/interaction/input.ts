import type { MindMapCommand, Viewport } from '../types';
export interface InputActions {
    command(command: MindMapCommand): boolean;
    select(id: string | undefined, toggle: boolean, range: boolean, release: boolean): void;
    selected(id: string): boolean;
    viewport(): Viewport;
    pan(x: number, y: number): void;
    zoom(scale: number, x: number, y: number): void;
    hit(x: number, y: number): string | undefined;
}
type Press = { kind: 'node' | 'canvas'; pointerId: number; x: number; y: number; view: Viewport; id?: string; moved: boolean; toggle: boolean; range: boolean };
export class Input {
    private press: Press | undefined;
    private readonly abort = new AbortController();
    private readonly mac: boolean;
    constructor(private readonly element: HTMLElement, private readonly actions: InputActions) {
        this.mac = /Mac|iPhone|iPad/.test(element.ownerDocument.defaultView!.navigator.platform);
        const options = { signal: this.abort.signal };
        element.addEventListener('keydown', this.key, options);
        element.addEventListener('pointerdown', this.down, options);
        element.addEventListener('pointermove', this.move, options);
        element.addEventListener('pointerup', this.up, options);
        element.addEventListener('pointercancel', this.cancel, options);
        element.addEventListener('lostpointercapture', this.cancel, options);
        element.addEventListener('wheel', this.wheel, { ...options, passive: false });
        element.addEventListener('click', e => { if ((e.target as HTMLElement).closest('input')) e.preventDefault(); }, options);
    }
    private primary(e: MouseEvent | KeyboardEvent): boolean { return this.mac ? e.metaKey : e.ctrlKey; }
    private key = (e: KeyboardEvent): void => {
        if ((e.target as HTMLElement).closest('textarea') || e.isComposing) return;
        const primary = this.primary(e), key = e.key.toLowerCase();
        let command: MindMapCommand | undefined;
        if (key.startsWith('arrow')) command = { type: primary ? 'moveSelection' : 'navigate', direction: key.slice(5) as 'left' | 'right' | 'up' | 'down', ...(!primary ? { extend: e.shiftKey } : {}) };
        else if (primary) {
            if (key === 'a') command = { type: 'selectAll' };
            if (key === 'z') command = { type: e.shiftKey ? 'redo' : 'undo' };
            if (key === 'y') command = { type: 'redo' };
            if (key === ' ') command = { type: 'toggleChecked' };
            if (key === '+' || key === '=') command = { type: 'zoomIn' };
            if (key === '-') command = { type: 'zoomOut' };
            if (key === '0') command = { type: e.shiftKey ? 'fit' : 'resetZoom' };
        } else {
            if (key === 'f2') command = { type: 'edit' };
            if (key === 'enter') command = { type: e.shiftKey ? 'insertBefore' : 'insertAfter' };
            if (key === 'tab') command = { type: e.shiftKey ? 'insertParent' : 'insertChild' };
            if (key === 'delete') command = { type: 'delete' };
            if (key === ' ') command = { type: 'toggleCollapse' };
            if (key === 'escape') { this.cancel(); this.actions.select(undefined, false, false, true); e.preventDefault(); return; }
        }
        if (command && !e.altKey) { e.preventDefault(); this.actions.command(command); }
    };
    private down = (e: PointerEvent): void => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as HTMLElement).closest('textarea')) return;
        e.preventDefault(); this.element.focus({ preventScroll: true });
        const id = this.actions.hit(e.clientX, e.clientY), toggle = this.primary(e), range = e.shiftKey;
        if (id && this.element.ownerDocument.elementFromPoint(e.clientX, e.clientY)?.closest('input')) { this.actions.command({ type: 'toggleChecked', ids: [id] }); return; }
        this.press = { kind: id ? 'node' : 'canvas', pointerId: e.pointerId, x: e.clientX, y: e.clientY, view: this.actions.viewport(), ...(id ? { id } : {}), moved: false, toggle, range };
        if (id && (!this.actions.selected(id) || toggle || range)) {
            this.actions.select(id, toggle, range, false);
            // This press established a selection; editing requires a subsequent click.
            this.press.toggle = true;
        }
        this.element.setPointerCapture(e.pointerId);
    };
    private move = (e: PointerEvent): void => {
        const p = this.press; if (!p || p.pointerId !== e.pointerId) return;
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) p.moved = true;
        if (p.kind === 'canvas' && p.moved) {
            const rect = this.element.getBoundingClientRect();
            this.actions.pan(p.view.x + (e.clientX - p.x) * this.element.clientWidth / rect.width, p.view.y + (e.clientY - p.y) * this.element.clientHeight / rect.height);
        }
    };
    private up = (e: PointerEvent): void => {
        const p = this.press; if (!p || p.pointerId !== e.pointerId) return;
        this.cancel();
        if (!p.moved && !p.toggle && !p.range) this.actions.select(p.id, false, false, !!p.id);
    };
    private cancel = (): void => {
        const p = this.press; this.press = undefined;
        if (p && this.element.hasPointerCapture(p.pointerId)) this.element.releasePointerCapture(p.pointerId);
    };
    private wheel = (e: WheelEvent): void => {
        if ((e.target as HTMLElement).closest('textarea')) return;
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.element.clientHeight : 1;
        const x = e.deltaX * unit, y = e.deltaY * unit, view = this.actions.viewport();
        if (this.primary(e)) this.actions.zoom(view.zoom * Math.exp(-y * .002), e.clientX, e.clientY);
        else this.actions.pan(view.x - (e.shiftKey ? y || x : x), view.y - (e.shiftKey ? 0 : y));
    };
    reset(): void { this.cancel(); }
    destroy(): void { this.cancel(); this.abort.abort(); }
}
