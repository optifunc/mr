import type { MindMapCommand, Selection, Viewport } from '../types';
import type { Model } from '../model/document';
import { normalizeRoots } from '../model/document';
import type { Layout } from '../layout/layout';
import { dropZone, edgeVelocity } from './drop';
import type { DropZone } from './drop';

interface DragActions {
    context(): { model: Model; selection: Selection; layout: Layout; readonly: boolean; generation: number };
    local(x: number, y: number): { x: number; y: number };
    viewport(): Viewport;
    pan(x: number, y: number): void;
    canMove(command: MindMapCommand): boolean;
    move(command: MindMapCommand): boolean;
    node(id: string): HTMLElement | undefined;
}
export class Drag {
    private state: { ids: string[]; generation: number; x: number; y: number } | undefined;
    private ghost: HTMLDivElement | undefined;
    private highlight: HTMLElement | undefined;
    private zone: DropZone | undefined;
    private frame = 0;
    private lastTime = 0;
    private lastPreview: { x: number; y: number; view: Viewport; layout: Layout } | undefined;
    constructor(private readonly element: HTMLElement, private readonly actions: DragActions) {}
    start(id: string, x: number, y: number): boolean {
        const context = this.actions.context();
        if (context.readonly || context.selection.ids.includes(context.model.rootId) || !context.selection.ids.includes(id)) return false;
        const ids = normalizeRoots(context.model, context.selection.ids, context.layout.visualOrder);
        if (!ids.length) return false;
        this.cancel(); this.state = { ids, generation: context.generation, x, y };
        this.ghost = this.element.ownerDocument.createElement('div'); this.ghost.className = 'mindmap-drag-image'; this.ghost.setAttribute('aria-hidden', 'true');
        for (const id of ids) {
            const line = this.element.ownerDocument.createElement('div'); line.textContent = context.model.nodes.get(id)!.text.replace(/\r?\n/g, ' ↵ ') || '(empty)';
            this.ghost.append(line);
        }
        this.element.append(this.ghost); this.element.classList.add('mindmap-dragging');
        this.update(x, y); this.lastTime = 0; this.frame = requestAnimationFrame(this.tick);
        return true;
    }
    update(x: number, y: number): void {
        const state = this.state; if (!state) return;
        if (state.generation !== this.actions.context().generation) { this.cancel(); return; }
        state.x = x; state.y = y;
        const p = this.actions.local(x, y), view = this.actions.viewport();
        const layout = this.actions.context().layout, previous = this.lastPreview;
        if (previous && previous.x === p.x && previous.y === p.y && previous.view.x === view.x && previous.view.y === view.y && previous.view.zoom === view.zoom && previous.layout === layout) return;
        this.lastPreview = { x: p.x, y: p.y, view, layout };
        const inside = p.x >= 0 && p.y >= 0 && p.x <= this.element.clientWidth && p.y <= this.element.clientHeight;
        const zone = inside ? dropZone(layout, (p.x - view.x) / view.zoom, (p.y - view.y) / view.zoom) : undefined;
        const valid = zone && this.actions.canMove({ type: 'move', ids: state.ids, destination: zone.destination });
        this.highlight?.removeAttribute('data-drop-edge'); this.highlight = undefined; this.zone = valid ? zone : undefined;
        if (this.zone) { this.highlight = this.actions.node(this.zone.node.id); this.highlight?.setAttribute('data-drop-edge', this.zone.edge); }
        this.element.classList.toggle('mindmap-drop-invalid', !valid);
        if (this.ghost) Object.assign(this.ghost.style, { left: `${p.x + 14}px`, top: `${p.y + 14}px` });
    }
    private tick = (time: number): void => {
        this.frame = 0; const state = this.state; if (!state) return;
        const dt = this.lastTime ? Math.min(32, time - this.lastTime) / 1000 : 0; this.lastTime = time;
        const p = this.actions.local(state.x, state.y), view = this.actions.viewport();
        const dx = edgeVelocity(p.x, this.element.clientWidth) * dt, dy = edgeVelocity(p.y, this.element.clientHeight) * dt;
        if (dx || dy) this.actions.pan(view.x + dx, view.y + dy);
        this.update(state.x, state.y);
        if (this.state) this.frame = requestAnimationFrame(this.tick);
    };
    finish(x: number, y: number): void {
        this.update(x, y);
        const state = this.state, zone = this.zone;
        this.cancel();
        if (state && zone) this.actions.move({ type: 'move', ids: state.ids, destination: zone.destination });
    }
    cancel(): void {
        this.state = undefined; this.zone = undefined; this.lastPreview = undefined; this.highlight?.removeAttribute('data-drop-edge'); this.highlight = undefined;
        this.ghost?.remove(); this.ghost = undefined; cancelAnimationFrame(this.frame); this.frame = 0;
        this.element.classList.remove('mindmap-dragging', 'mindmap-drop-invalid');
    }
}
