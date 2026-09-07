import { MindMapError } from './types';
import type { MindMapCommand, MindMapDocument, MindMapEditorEvents, MindMapEditorOptions, Origin, Selection, Viewport } from './types';
import { Store } from './model/store';
import { Scene } from './render/scene';
import { validateCommand } from './commands/validate';
import { Input } from './interaction/input';
import { navigate, SelectionPath } from './interaction/navigation';
import { fitBounds, reveal, zoomAt } from './interaction/viewport';
export class MindMapEditor {
    private readonly element: HTMLDivElement;
    private readonly store: Store;
    private readonly scene: Scene;
    private readonly resize: ResizeObserver;
    private readonly fonts: FontFaceSet;
    private readonly fontListener = (): void => { this.refreshLayout(); };
    private readonly input: Input;
    private readonly selectionPath = new SelectionPath();
    private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
    private viewportFrame = 0;
    private pendingFit = false;
    private destroyed = false;
    private dispatching = false;
    private reportingError = false;
    private queue: (() => boolean)[] = [];
    private readonly listeners = new Map<keyof MindMapEditorEvents, Set<(event: never) => void>>();
    constructor(host: HTMLElement, options: MindMapEditorOptions) {
        this.store = new Store(options);
        this.element = host.ownerDocument.createElement('div');
        this.element.className = 'mindmap';
        this.element.tabIndex = 0;
        this.element.setAttribute('role', 'tree');
        this.element.setAttribute('aria-label', 'Mind map');
        host.append(this.element);
        this.scene = new Scene(this.element);
        this.viewport = { x: this.element.clientWidth / 2, y: this.element.clientHeight / 2, zoom: 1 };
        this.applyViewport(this.viewport);
        this.render(true);
        this.selectionPath.reset(this.store.selection);
        this.input = new Input(this.element, {
            command: command => this.run(() => this.dispatch(command, 'user')),
            select: (id, toggle, range, release) => this.pointerSelect(id, toggle, range, release),
            selected: id => this.store.selection.ids.includes(id),
            viewport: () => this.getViewport(), pan: (x, y) => this.applyViewport({ ...this.viewport, x, y }),
            zoom: (scale, x, y) => { const p = this.localPoint(x, y); this.applyViewport(zoomAt(this.viewport, scale, p.x, p.y)); },
            hit: (x, y) => this.hit(x, y),
        });
        this.resize = new ResizeObserver(() => { if (!this.destroyed && this.pendingFit && this.element.clientWidth && this.element.clientHeight) this.fit(); });
        this.resize.observe(this.element);
        this.fonts = host.ownerDocument.fonts;
        this.fonts.addEventListener('loadingdone', this.fontListener);
        void this.fonts.ready.then(() => { if (!this.destroyed)
            this.refreshLayout(); });
    }
    private render(geometry: boolean): void { this.store.visualOrder = this.scene.render(this.store.model, this.store.selection, geometry).visualOrder; }
    refreshLayout(): void { this.run(() => { this.scene.refresh(); this.render(true); return true; }); }
    private emit<K extends keyof MindMapEditorEvents>(type: K, payload: () => MindMapEditorEvents[K]): void {
        for (const listener of [...this.listeners.get(type) ?? []]) {
            if (this.destroyed)
                return;
            try {
                listener(payload() as never);
            }
            catch {
                this.report(new MindMapError('HOST_CALLBACK', `${type} listener threw`));
            }
        }
    }
    private report(error: unknown): void {
        if (this.reportingError || this.destroyed)
            return;
        this.reportingError = true;
        const e = error instanceof MindMapError ? error : new MindMapError('HOST_CALLBACK', 'Operation failed');
        this.emit('error', () => ({ code: e.code, message: e.message }));
        this.reportingError = false;
    }
    private run(operation: () => boolean): boolean {
        if (this.destroyed)
            return false;
        if (this.dispatching) {
            this.queue.push(operation);
            return true;
        }
        this.dispatching = true;
        let result = false;
        this.queue.push(operation);
        try {
            // Keep one queue throughout the drain. Work appended by B stays
            // behind C if A already enqueued B and C. An index avoids recursion
            // and repeated shifting of the remaining queue.
            for (let index = 0; index < this.queue.length && !this.destroyed; index++) {
                try {
                    const applied = this.queue[index]!();
                    if (index === 0) result = applied;
                } catch (error) {
                    this.report(error);
                }
            }
        }
        finally {
            this.dispatching = false;
            this.queue = [];
        }
        return result;
    }
    private selectionEvent(before: Selection, origin: Origin): void { if (JSON.stringify(before) !== JSON.stringify(this.store.selection))
        this.emit('selectionchange', () => ({ ...this.getSelection(), origin })); }
    getDocument(): MindMapDocument { return this.store.getDocument(); }
    setDocument(document: MindMapDocument): void {
        // Validate/copy immediately even when called reentrantly; callers may reuse input.
        let candidate: MindMapDocument;
        try {
            candidate = new Store({ document }).getDocument();
        }
        catch (error) {
            this.run(() => { this.report(error); return false; });
            return;
        }
        this.run(() => { const before = this.getSelection(); this.input.reset(); this.store.setDocument(candidate); this.selectionPath.reset(this.store.selection); this.render(true); this.emit('documentchange', () => ({ document: this.getDocument(), origin: 'api', reason: 'replacement' })); this.selectionEvent(before, 'api'); return true; });
    }
    getSelection(): Selection { return { ...this.store.selection, ids: [...this.store.selection.ids] }; }
    setSelection(ids: string[], activeId?: string): void { const copy = [...ids]; this.run(() => { const before = this.getSelection(); this.store.setSelection(copy, activeId); this.selectionPath.reset(this.store.selection); this.render(false); this.selectionEvent(before, 'api'); return true; }); }
    execute(command: MindMapCommand): boolean {
        let copy: MindMapCommand;
        try {
            validateCommand(command);
            copy = structuredClone(command);
        } catch (error) {
            this.run(() => { this.report(error instanceof MindMapError ? error :
                new MindMapError('INVALID_DOCUMENT', 'Command must be cloneable data')); return false; });
            return false;
        }
        return this.run(() => this.dispatch(copy, 'api'));
    }
    private dispatch(command: MindMapCommand, source: Origin): boolean {
        const before = this.getSelection();
        const origin: Origin = command.type === 'undo' || command.type === 'redo' ? command.type : source;
        if (['zoomIn', 'zoomOut', 'resetZoom', 'fit'].includes(command.type)) {
            if (command.type === 'fit') this.fit();
            else this.setZoom(command.type === 'resetZoom' ? 1 : this.viewport.zoom * (command.type === 'zoomIn' ? 1.2 : 1 / 1.2));
            return true;
        }
        if (command.type === 'selectAll' || command.type === 'clearSelection') {
            const ids = command.type === 'selectAll' ? this.scene.geometry!.visualOrder.filter(id => id !== this.store.model.rootId) : [];
            this.select({ ids, ...(ids.length ? { activeId: ids.includes(before.activeId ?? '') ? before.activeId! : ids[0]! } : {}) }, source, true);
            return JSON.stringify(before) !== JSON.stringify(this.store.selection);
        }
        if (command.type === 'navigate') {
            const result = navigate(this.store.model, this.scene.geometry!, before.activeId, command.direction);
            if (result.expand) return this.store.readonly ? false : this.dispatch({ type: 'expand', targetId: result.expand }, source);
            if (!result.id) return false;
            this.select(this.selectionPath.arrow(result.id, !!command.extend, before), source, false);
            this.revealIds([result.id]); return true;
        }
        if (!this.store.execute(command)) return false;
        this.selectionPath.reset(this.store.selection);
        this.render(this.store.lastGeometry);
        if (command.type === 'moveSelection') this.revealIds(this.store.selection.ids);
        this.emit('documentchange', () => ({ document: this.getDocument(), origin, reason: 'command', command: command.type }));
        this.selectionEvent(before, origin); return true;
    }
    canExecute(command: MindMapCommand): boolean {
        if (this.destroyed) return false;
        try { validateCommand(command); } catch { return false; }
        if (['zoomIn', 'zoomOut', 'resetZoom', 'fit', 'selectAll', 'clearSelection'].includes(command.type)) return true;
        if (command.type === 'navigate') { const n = navigate(this.store.model, this.scene.geometry!, this.store.selection.activeId, command.direction); return !!n.id || !!n.expand && !this.store.readonly; }
        return this.store.canExecute(command);
    }
    private select(selection: Selection, origin: Origin, reset: boolean): void {
        const before = this.getSelection(); this.store.setSelection(selection.ids, selection.activeId);
        if (reset) this.selectionPath.reset(this.store.selection);
        this.render(false); this.selectionEvent(before, origin);
    }
    private pointerSelect(id: string | undefined, toggle: boolean, range: boolean, release: boolean): void {
        this.run(() => {
            const current = this.getSelection();
            if (!id) { this.select(release && current.activeId ? { ids: [current.activeId], activeId: current.activeId } : { ids: [] }, 'user', true); return true; }
            if (range) this.select(this.selectionPath.range(this.store.model, this.scene.geometry!, id, current), 'user', false);
            else if (toggle) {
                const ids = current.ids.includes(id) ? current.ids.filter(value => value !== id) : [...current.ids, id];
                const activeId = ids.includes(id) ? id : ids.includes(current.activeId ?? '') ? current.activeId : this.scene.geometry!.visualOrder.find(value => ids.includes(value));
                this.select({ ids, ...(activeId ? { activeId } : {}) }, 'user', true);
            } else this.select({ ids: [id], activeId: id }, 'user', true);
            return true;
        });
    }
    private localPoint(x: number, y: number): { x: number; y: number } {
        const r = this.element.getBoundingClientRect();
        return { x: (x - r.left) * this.element.clientWidth / r.width, y: (y - r.top) * this.element.clientHeight / r.height };
    }
    private hit(x: number, y: number): string | undefined {
        const p = this.localPoint(x, y), v = this.viewport;
        const wx = (p.x - v.x) / v.zoom, wy = (p.y - v.y) / v.zoom;
        return [...this.scene.geometry!.nodes.values()].reverse().find(g => { const b = g.interaction; return wx >= b.x && wx <= b.x + b.width && wy >= b.y && wy <= b.y + b.height + 3; })?.id;
    }
    private applyViewport(view: Viewport): void {
        if (this.destroyed || ![view.x, view.y, view.zoom].every(Number.isFinite)) return;
        this.viewport = view;
        this.scene.scene.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
        if (!this.viewportFrame) this.viewportFrame = requestAnimationFrame(() => { this.viewportFrame = 0; if (!this.destroyed) this.emit('viewportchange', () => this.getViewport()); });
    }
    getViewport(): Viewport { return { ...this.viewport }; }
    setZoom(scale: number): void { if (Number.isFinite(scale)) this.applyViewport(zoomAt(this.viewport, scale, this.element.clientWidth / 2, this.element.clientHeight / 2)); }
    fit(): void { this.pendingFit = !this.element.clientWidth || !this.element.clientHeight; if (!this.pendingFit) this.applyViewport(fitBounds(this.scene.geometry!.bounds, this.element.clientWidth, this.element.clientHeight)); }
    panToNode(id: string): void { this.revealIds([id]); }
    private revealIds(ids: string[]): void {
        const boxes = ids.flatMap(id => { const g = this.scene.geometry!.nodes.get(id); return g ? [g.interaction] : []; });
        if (!boxes.length) return;
        const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
        this.applyViewport(reveal(this.viewport, { x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x, height: Math.max(...boxes.map(b => b.y + b.height)) - y }, this.element.clientWidth, this.element.clientHeight));
    }
    undo(): boolean { return this.execute({ type: 'undo' }); }
    redo(): boolean { return this.execute({ type: 'redo' }); }
    canUndo(): boolean { return this.canExecute({ type: 'undo' }); }
    canRedo(): boolean { return this.canExecute({ type: 'redo' }); }
    focus(): void { if (!this.destroyed)
        this.element.focus(); }
    on<K extends keyof MindMapEditorEvents>(type: K, listener: (event: MindMapEditorEvents[K]) => void): () => void {
        if (this.destroyed)
            return () => { };
        let set = this.listeners.get(type);
        if (!set) {
            set = new Set();
            this.listeners.set(type, set);
        }
        set.add(listener as (event: never) => void);
        return () => { set.delete(listener as (event: never) => void); };
    }
    destroy(): void { if (this.destroyed)
        return; this.destroyed = true; this.queue = []; this.listeners.clear(); this.input.destroy(); cancelAnimationFrame(this.viewportFrame); this.resize.disconnect(); this.fonts.removeEventListener('loadingdone', this.fontListener); this.scene.destroy(); this.element.remove(); }
}
