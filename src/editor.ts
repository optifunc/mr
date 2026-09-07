import { MindMapError } from './types';
import type { MindMapCommand, MindMapDocument, MindMapEditorEvents, MindMapEditorOptions, Origin, Selection } from './types';
import { Store } from './model/store';
import { Scene } from './render/scene';
import { validateCommand } from './commands/validate';
export class MindMapEditor {
    private readonly element: HTMLDivElement;
    private readonly store: Store;
    private readonly scene: Scene;
    private readonly resize: ResizeObserver;
    private readonly fonts: FontFaceSet;
    private readonly fontListener = (): void => { this.refreshLayout(); };
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
        this.scene.center();
        this.render(true);
        this.resize = new ResizeObserver(() => { if (!this.destroyed)
            this.scene.center(); });
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
        this.run(() => { const before = this.getSelection(); this.store.setDocument(candidate); this.render(true); this.emit('documentchange', () => ({ document: this.getDocument(), origin: 'api', reason: 'replacement' })); this.selectionEvent(before, 'api'); return true; });
    }
    getSelection(): Selection { return { ...this.store.selection, ids: [...this.store.selection.ids] }; }
    setSelection(ids: string[], activeId?: string): void { const copy = [...ids]; this.run(() => { const before = this.getSelection(); this.store.setSelection(copy, activeId); this.render(false); this.selectionEvent(before, 'api'); return true; }); }
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
        return this.run(() => { const before = this.getSelection(); if (!this.store.execute(copy))
            return false; this.render(this.store.lastGeometry); const origin: Origin = copy.type === 'undo' || copy.type === 'redo' ? copy.type : 'api'; this.emit('documentchange', () => ({ document: this.getDocument(), origin, reason: 'command', command: copy.type })); this.selectionEvent(before, origin); return true; });
    }
    canExecute(command: MindMapCommand): boolean { return !this.destroyed && this.store.canExecute(command); }
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
        return; this.destroyed = true; this.queue = []; this.listeners.clear(); this.resize.disconnect(); this.fonts.removeEventListener('loadingdone', this.fontListener); this.scene.destroy(); this.element.remove(); }
}
