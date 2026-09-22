import type { MindMapCommand, Viewport } from '../types';
import { actionCommand, isMacPlatform, matchesShortcut, resolveShortcut, getActionDefinitions } from '../commands/registry';
export interface InputActions {
    command(command: MindMapCommand, replacementText?: string): boolean;
    select(id: string | undefined, toggle: boolean, range: boolean, release: boolean): void;
    selected(id: string): boolean;
    checkboxPresent(): boolean;
    viewport(): Viewport;
    pan(x: number, y: number): void;
    zoomByWheel(direction: -1 | 1, x: number, y: number): void;
    hit(x: number, y: number): string | undefined;
    marker(x: number, y: number): string | undefined;
    startDrag(id: string, x: number, y: number): boolean;
    drag(x: number, y: number): void;
    drop(x: number, y: number): void;
    cancelDrag(): void;
}
type Press = { kind: 'node' | 'canvas' | 'marker' | 'link'; pointerId: number; x: number; y: number; view: Viewport; id?: string; moved: boolean; dragging?: boolean; toggle: boolean; range: boolean };
export class Input {
    private press: Press | undefined;
    private readonly abort = new AbortController();
    private readonly mac: boolean;
    private readonly linkBinding = getActionDefinitions().find(action => action.id === 'openLink')!.bindings[0]!;
    constructor(private readonly element: HTMLElement, private readonly actions: InputActions) {
        this.mac = isMacPlatform(element.ownerDocument.defaultView!.navigator.platform);
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
        if ((e.target as HTMLElement).closest('textarea, [role="menu"]') || e.isComposing || e.keyCode === 229) return;
        if (this.press?.moved) { if (resolveShortcut(e, 'drag', this.mac)?.id === 'cancelDrag') this.cancel(); e.preventDefault(); return; }
        const action = resolveShortcut(e, 'canvas', this.mac);
        if (action?.id === 'contextMenu' || action?.bindings.some(binding => binding.native)) return;
        const command = action && actionCommand(action.id, { checkboxPresent: this.actions.checkboxPresent() }, e);
        if (action?.id === 'clearSelection') { this.cancel(); this.actions.select(undefined, false, false, true); e.preventDefault(); return; }
        if (!command && !e.ctrlKey && !e.metaKey && !e.altKey && [...e.key].length === 1) {
            // Keep the first printable character in the edit buffer, not the model.
            if (this.actions.command({ type: 'edit' }, e.key)) e.preventDefault();
            return;
        }
        if (command && !e.altKey) {
            e.preventDefault();
            // Hosts may ignore defaultPrevented and act on the same shortcut.
            // Claim zoom and checkbox-presence chords, including no-ops.
            if (action?.stopPropagation) e.stopPropagation();
            this.actions.command(command);
        }
    };
    private down = (e: PointerEvent): void => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as HTMLElement).closest('textarea, [role="menu"]')) return;
        e.preventDefault(); this.element.focus({ preventScroll: true });
        const marker = this.actions.marker(e.clientX, e.clientY);
        const id = marker ?? this.actions.hit(e.clientX, e.clientY), toggle = this.primary(e), range = e.shiftKey;
        const link = !marker && id && matchesShortcut(this.linkBinding, { key: 'Click', ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey }, this.mac)
            && this.element.ownerDocument.elementFromPoint(e.clientX, e.clientY)?.closest('.mindmap-link');
        if (!marker && id && this.element.ownerDocument.elementFromPoint(e.clientX, e.clientY)?.closest('input')) { this.actions.command({ type: 'toggleChecked', ids: [id] }); return; }
        this.press = { kind: marker ? 'marker' : link ? 'link' : id ? 'node' : 'canvas', pointerId: e.pointerId, x: e.clientX, y: e.clientY, view: this.actions.viewport(), ...(id ? { id } : {}), moved: false, toggle, range };
        if (!marker && !link && id && (!this.actions.selected(id) || toggle || range)) {
            this.actions.select(id, toggle, range, false);
            // This press established a selection; editing requires a subsequent click.
            if (!this.press) return; // A host selection listener may replace/destroy the map.
            this.press.toggle = true;
        }
        this.element.setPointerCapture(e.pointerId);
    };
    private move = (e: PointerEvent): void => {
        const p = this.press; if (!p || p.pointerId !== e.pointerId) return;
        if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) {
            p.moved = true;
            if (p.kind === 'node') p.dragging = this.actions.startDrag(p.id!, e.clientX, e.clientY);
        }
        if (p.dragging) this.actions.drag(e.clientX, e.clientY);
        if (p.kind === 'canvas' && p.moved) {
            const rect = this.element.getBoundingClientRect();
            this.actions.pan(p.view.x + (e.clientX - p.x) * this.element.clientWidth / rect.width, p.view.y + (e.clientY - p.y) * this.element.clientHeight / rect.height);
        }
    };
    private up = (e: PointerEvent): void => {
        const p = this.press; if (!p || p.pointerId !== e.pointerId) return;
        if (p.dragging) this.actions.drop(e.clientX, e.clientY);
        this.cancel();
        if (p.kind === 'link') {
            if (!p.moved && this.actions.hit(e.clientX, e.clientY) === p.id && this.element.ownerDocument.elementFromPoint(e.clientX, e.clientY)?.closest('.mindmap-link')) this.actions.command({ type: 'openLink', targetId: p.id! });
            return;
        }
        if (p.kind === 'marker') {
            if (!p.moved && this.actions.marker(e.clientX, e.clientY) === p.id) this.actions.command({ type: 'expand', targetId: p.id! });
            return;
        }
        if (!p.moved && !p.toggle && !p.range) this.actions.select(p.id, false, false, !!p.id);
    };
    private cancel = (): void => {
        const p = this.press; this.press = undefined; this.actions.cancelDrag();
        if (p && this.element.hasPointerCapture(p.pointerId)) this.element.releasePointerCapture(p.pointerId);
    };
    private wheel = (e: WheelEvent): void => {
        if ((e.target as HTMLElement).closest('textarea, [role="menu"]')) return;
        e.preventDefault();
        // This wheel gesture belongs to the canvas (pan or zoom), not the host.
        e.stopPropagation();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.element.clientHeight : 1;
        const x = e.deltaX * unit, y = e.deltaY * unit, view = this.actions.viewport();
        if (this.primary(e)) {
            // Wheel magnitudes/units vary by OS, mouse and host UI scale. Use
            // direction alone; a horizontal-only event must not change zoom.
            if (e.deltaY !== 0) this.actions.zoomByWheel(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
        }
        else this.actions.pan(view.x - (e.shiftKey ? y || x : x), view.y - (e.shiftKey ? 0 : y));
    };
    reset(): void { this.cancel(); }
    destroy(): void { this.cancel(); this.abort.abort(); }
}
