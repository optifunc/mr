import { MindMapError } from './types';
import type { MindMapCommand, MindMapDocument, MindMapEditorEvents, MindMapEditorOptions, Origin, Selection } from './types';
import { Store } from './model/store';
export class MindMapEditor {
  private readonly element: HTMLDivElement;
  private readonly store: Store;
  private destroyed = false; private dispatching = false; private reportingError = false;
  private queue: (() => void)[] = [];
  private readonly listeners = new Map<keyof MindMapEditorEvents, Set<(event: never) => void>>();
  constructor(host: HTMLElement, options: MindMapEditorOptions) {
    this.store = new Store(options);
    this.element = host.ownerDocument.createElement('div'); this.element.className = 'mindmap'; this.element.tabIndex = 0;
    this.element.setAttribute('role', 'tree'); this.element.setAttribute('aria-label', 'Mind map');
    host.append(this.element); this.render(true);
  }
  private render(_geometry: boolean): void { this.element.textContent = this.store.model.nodes.get(this.store.model.rootId)!.text; }
  private emit<K extends keyof MindMapEditorEvents>(type: K, payload: () => MindMapEditorEvents[K]): void {
    for (const listener of [...this.listeners.get(type) ?? []]) { if (this.destroyed) return; try { listener(payload() as never); } catch { this.report(new MindMapError('HOST_CALLBACK', `${type} listener threw`)); } }
  }
  private report(error: unknown): void {
    if (this.reportingError || this.destroyed) return; this.reportingError = true;
    const e = error instanceof MindMapError ? error : new MindMapError('HOST_CALLBACK', 'Operation failed');
    this.emit('error', () => ({ code: e.code, message: e.message })); this.reportingError = false;
  }
  private run(operation: () => boolean): boolean {
    if (this.destroyed) return false;
    if (this.dispatching) { this.queue.push(() => { this.run(operation); }); return true; }
    this.dispatching = true; let result = false;
    try { result = operation(); } catch (error) { this.report(error); }
    finally { this.dispatching = false; const pending = this.queue; this.queue = []; for (const task of pending) { if (!this.destroyed) task(); } }
    return result;
  }
  private selectionEvent(before: Selection, origin: Origin): void { if (JSON.stringify(before) !== JSON.stringify(this.store.selection)) this.emit('selectionchange', () => ({ ...this.getSelection(), origin })); }
  getDocument(): MindMapDocument { return this.store.getDocument(); }
  setDocument(document: MindMapDocument): void {
    // Validate/copy immediately even when called reentrantly; callers may reuse input.
    let candidate: MindMapDocument; try { candidate = new Store({ document }).getDocument(); } catch (error) { this.run(() => { this.report(error); return false; }); return; }
    this.run(() => { const before = this.getSelection(); this.store.setDocument(candidate); this.render(true); this.emit('documentchange', () => ({ document: this.getDocument(), origin: 'api', reason: 'replacement' })); this.selectionEvent(before, 'api'); return true; });
  }
  getSelection(): Selection { return { ...this.store.selection, ids: [...this.store.selection.ids] }; }
  setSelection(ids: string[], activeId?: string): void { const copy = [...ids]; this.run(() => { const before = this.getSelection(); this.store.setSelection(copy, activeId); this.render(false); this.selectionEvent(before, 'api'); return true; }); }
  execute(command: MindMapCommand): boolean {
    const copy = structuredClone(command);
    return this.run(() => { const before = this.getSelection(); if (!this.store.execute(copy)) return false; this.render(this.store.lastGeometry); const origin: Origin = copy.type === 'undo' || copy.type === 'redo' ? copy.type : 'api'; this.emit('documentchange', () => ({ document: this.getDocument(), origin, reason: 'command', command: copy.type })); this.selectionEvent(before, origin); return true; });
  }
  canExecute(command: MindMapCommand): boolean { return !this.destroyed && this.store.canExecute(command); }
  undo(): boolean { return this.execute({ type: 'undo' }); } redo(): boolean { return this.execute({ type: 'redo' }); }
  canUndo(): boolean { return this.canExecute({ type: 'undo' }); } canRedo(): boolean { return this.canExecute({ type: 'redo' }); }
  focus(): void { if (!this.destroyed) this.element.focus(); }
  on<K extends keyof MindMapEditorEvents>(type: K, listener: (event: MindMapEditorEvents[K]) => void): () => void {
    if (this.destroyed) return () => {}; let set = this.listeners.get(type); if (!set) { set = new Set(); this.listeners.set(type, set); } set.add(listener as (event: never) => void); return () => { set.delete(listener as (event: never) => void); };
  }
  destroy(): void { if (this.destroyed) return; this.destroyed = true; this.queue = []; this.listeners.clear(); this.element.remove(); }
}
