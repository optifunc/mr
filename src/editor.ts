import { MindMapError } from './types';
import type { MindMapCommand, MindMapDocument, MindMapEditorEvents, MindMapEditorOptions, Origin, Selection, Viewport } from './types';
import { Store } from './model/store';
import { Scene } from './render/scene';
import { validateCommand } from './commands/validate';
import { TextEditor } from './interaction/editing';
import { contentCommands } from './commands/reducer';
import { Drag } from './interaction/drag';
import { ContextMenu, menuItems } from './interaction/menu';
import { Input } from './interaction/input';
import { navigate, SelectionPath } from './interaction/navigation';
import { BrowserClipboard } from './clipboard/browser';
import type { ClipboardCommand } from './clipboard/browser';
import { parse, serialize } from './clipboard/codec';
import { normalizeRoots } from './model/document';
import { labelUrl } from './interaction/links';
import { fitBounds, reveal, zoomAt } from './interaction/viewport';
export class MindMapEditor {
    private readonly element: HTMLDivElement;
    private readonly store: Store;
    private readonly scene: Scene;
    private readonly resize: ResizeObserver;
    private readonly fonts: FontFaceSet;
    private readonly fontListener = (): void => { this.refreshLayout(); };
    private readonly input: Input;
    private readonly clipboard: BrowserClipboard;
    private readonly drag: Drag;
    private readonly menu: ContextMenu;
    private readonly menuAbort = new AbortController();
    private generation = 0;
    private textEditor: TextEditor | undefined;
    private editOrigin: Origin = 'api';
    private editViewport: Viewport | undefined;
    private deferredLayout = false;
    private readonly selectionPath = new SelectionPath();
    private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
    private viewportFrame = 0;
    private viewportOrigin: Origin = 'api';
    private pendingFit = false;
    private measuredViewport = false;
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
        this.element.setAttribute('aria-multiselectable', 'true');
        this.element.setAttribute('aria-readonly', String(options.readonly ?? false));
        host.append(this.element);
        this.scene = new Scene(this.element);
        this.viewport = { x: this.element.clientWidth / 2, y: this.element.clientHeight / 2, zoom: 1 };
        this.measuredViewport = !!this.element.clientWidth && !!this.element.clientHeight;
        this.applyViewport(this.viewport);
        this.render(true);
        this.selectionPath.reset(this.store.selection);
        this.clipboard = new BrowserClipboard(this.element, (type, data) => { this.run(() => this.clipboardRequest({ type }, 'user', data)); });
        this.drag = new Drag(this.element, {
            context: () => ({ model: this.store.model, selection: this.getSelection(), layout: this.scene.geometry!, readonly: this.store.readonly, generation: this.generation }),
            local: (x, y) => this.localPoint(x, y), viewport: () => this.getViewport(), pan: (x, y) => { this.run(() => { this.applyViewport({ ...this.viewport, x, y }, 'user'); return true; }); },
            canMove: command => this.store.canExecute(command), move: command => this.run(() => this.dispatch(command, 'user')),
            node: id => this.scene.nodeElement(id),
        });
        this.input = new Input(this.element, {
            command: (command, replacementText) => this.run(() => this.canExecute(command) ? this.dispatch(command, 'user', replacementText) : false),
            select: (id, toggle, range, release) => this.pointerSelect(id, toggle, range, release),
            selected: id => this.store.selection.ids.includes(id),
            viewport: () => this.getViewport(), pan: (x, y) => { this.run(() => { this.applyViewport({ ...this.viewport, x, y }, 'user'); return true; }); },
            zoom: (scale, x, y) => { this.run(() => { const p = this.localPoint(x, y); this.applyViewport(zoomAt(this.viewport, scale, p.x, p.y), 'user'); return true; }); },
            startDrag: (id, x, y) => this.drag.start(id, x, y), drag: (x, y) => this.drag.update(x, y), drop: (x, y) => this.drag.finish(x, y), cancelDrag: () => this.drag.cancel(),
            hit: (x, y) => this.hit(x, y), marker: (x, y) => this.hit(x, y, true),
        });
        this.menu = new ContextMenu(this.element, command => this.canExecute(command),
            command => { this.run(() => this.canExecute(command) ? this.dispatch(command, 'user') : false); });
        if (options.contextMenu !== false) {
            const signal = this.menuAbort.signal;
            this.element.addEventListener('contextmenu', e => {
                if ((e.target as HTMLElement).closest('textarea')) return;
                e.preventDefault();
                const id = this.hit(e.clientX, e.clientY);
                if (id) this.showMenu(id, this.localPoint(e.clientX, e.clientY));
            }, { signal });
            this.element.addEventListener('keydown', e => {
                if ((e.target as HTMLElement).closest('textarea, [role="menu"]') || e.isComposing) return;
                if (e.key !== 'ContextMenu' && !(e.key === 'F10' && e.shiftKey)) return;
                e.preventDefault();
                const id = this.store.selection.activeId;
                if (id) this.showMenu(id);
            }, { signal });
        }
        this.resize = new ResizeObserver(() => {
            if (this.destroyed || !this.element.clientWidth || !this.element.clientHeight) return;
            this.run(() => {
                if (this.pendingFit) this.fitViewport();
                else if (!this.measuredViewport) this.applyViewport({ ...this.viewport, x: this.element.clientWidth / 2, y: this.element.clientHeight / 2 });
                this.measuredViewport = true;
                this.constrainEditor();
                this.menu.close(true);
                return true;
            });
        });
        this.resize.observe(this.element);
        this.fonts = host.ownerDocument.fonts;
        this.fonts.addEventListener('loadingdone', this.fontListener);
        void this.fonts.ready.then(() => { if (!this.destroyed)
            this.refreshLayout(); });
    }
    private showMenu(id: string, point?: { x: number; y: number }): void {
        this.run(() => {
            if (this.textEditor) this.finishEdit(true, false);
            this.input.reset();
            if (!this.store.selection.ids.includes(id)) this.select({ ids: [id], activeId: id }, 'user', true);
            if (this.destroyed) return false;
            const node = this.store.model.nodes.get(this.store.selection.activeId ?? '');
            const geometry = this.scene.geometry!.nodes.get(id);
            if (!node || !geometry) return false;
            if (!point) this.revealIds([id]);
            this.menu.open(menuItems(!!node.collapsed, node.checked !== undefined),
                point?.x ?? this.viewport.x + geometry.box.x * this.viewport.zoom,
                point?.y ?? this.viewport.y + (geometry.box.y + geometry.box.height) * this.viewport.zoom);
            return true;
        });
    }
    private render(geometry: boolean): void { this.store.visualOrder = this.scene.render(this.store.model, this.store.selection, geometry).visualOrder; }
    refreshLayout(): void { this.run(() => { if (this.textEditor) { this.deferredLayout = true; return true; } this.scene.refresh(); this.render(true); return true; }); }
    private emit<K extends keyof MindMapEditorEvents>(type: K, payload: () => MindMapEditorEvents[K]): void {
        if (type === 'documentchange') { this.generation++; this.input?.reset(); this.menu?.close(true); }
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
        this.run(() => { const before = this.getSelection(); this.discardEdit(); this.input.reset(); this.store.setDocument(candidate); this.selectionPath.reset(this.store.selection); this.render(true); this.emit('documentchange', () => ({ document: this.getDocument(), origin: 'api', reason: 'replacement' })); this.selectionEvent(before, 'api'); return true; });
    }
    getSelection(): Selection { return { ...this.store.selection, ids: [...this.store.selection.ids] }; }
    setSelection(ids: string[], activeId?: string): void { const copy = [...ids]; this.run(() => { const before = this.getSelection(); this.store.setSelection(copy, activeId); this.menu.close(true); this.selectionPath.reset(this.store.selection); this.render(false); this.selectionEvent(before, 'api'); return true; }); }
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
    private dispatch(command: MindMapCommand, source: Origin, replacementText?: string): boolean {
        if (['copy', 'cut', 'paste'].includes(command.type)) return this.clipboardRequest(command, source);
        if (this.textEditor && (contentCommands.has(command.type) || ['undo', 'redo', 'edit', 'openLink'].includes(command.type))) this.finishEdit(true, false);
        if (this.destroyed) return false;
        if (command.type === 'openLink') return this.openLink(command.targetId ?? this.store.selection.activeId, source);
        if (['insertChild', 'insertBefore', 'insertAfter', 'insertParent'].includes(command.type)) return this.startEdit(command, source);
        if (command.type === 'edit') return this.startEdit(command, source, replacementText);
        const before = this.getSelection();
        const origin: Origin = command.type === 'undo' || command.type === 'redo' ? command.type : source;
        if (['zoomIn', 'zoomOut', 'resetZoom', 'fit'].includes(command.type)) {
            const view = this.getViewport(), pending = this.pendingFit;
            if (command.type === 'fit') this.fitViewport(source);
            else this.zoom(command.type === 'resetZoom' ? 1 : this.viewport.zoom * (command.type === 'zoomIn' ? 1.2 : 1 / 1.2), source);
            return JSON.stringify(view) !== JSON.stringify(this.viewport) || pending !== this.pendingFit;
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
            this.revealIds([result.id], source); return true;
        }
        if (!this.store.execute(command)) return false;
        this.selectionPath.reset(this.store.selection);
        this.render(this.store.lastGeometry);
        if (command.type === 'moveSelection') this.revealIds(this.store.selection.ids, source);
        this.emit('documentchange', () => ({ document: this.getDocument(), origin, reason: 'command', command: command.type }));
        this.selectionEvent(before, origin); return true;
    }
    canExecute(command: MindMapCommand): boolean {
        if (this.destroyed) return false;
        try { validateCommand(command); } catch { return false; }
        if (command.type === 'openLink') return !!labelUrl(this.store.model.nodes.get(command.targetId ?? this.store.selection.activeId ?? '')?.text ?? '');
        if (['copy', 'cut', 'paste'].includes(command.type)) return !this.clipboard.busy && this.clipboardApplicable(command);
        if (['zoomIn', 'zoomOut', 'resetZoom'].includes(command.type)) {
            const zoom = command.type === 'resetZoom' ? 1 : this.viewport.zoom * (command.type === 'zoomIn' ? 1.2 : 1 / 1.2);
            return zoomAt(this.viewport, zoom, 0, 0).zoom !== this.viewport.zoom;
        }
        if (command.type === 'fit') return !this.element.clientWidth || !this.element.clientHeight ? !this.pendingFit : JSON.stringify(fitBounds(this.scene.geometry!.bounds, this.element.clientWidth, this.element.clientHeight)) !== JSON.stringify(this.viewport);
        if (command.type === 'clearSelection') return this.store.selection.ids.length > 0;
        if (command.type === 'selectAll') { const ids = this.scene.geometry!.visualOrder.filter(id => id !== this.store.model.rootId); return ids.length !== this.store.selection.ids.length || ids.some(id => !this.store.selection.ids.includes(id)); }
        if (command.type === 'navigate') { const n = navigate(this.store.model, this.scene.geometry!, this.store.selection.activeId, command.direction); return !!n.id || !!n.expand && !this.store.readonly; }
        if (command.type === 'edit') return !this.store.readonly && this.scene.geometry!.nodes.has(command.targetId ?? this.store.selection.activeId ?? '');
        if (['insertChild', 'insertBefore', 'insertAfter', 'insertParent'].includes(command.type) && !this.scene.geometry!.nodes.has(('targetId' in command ? command.targetId : undefined) ?? this.store.selection.activeId ?? '')) return false;
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
            } else if (release && current.ids.length === 1 && current.ids[0] === id) return this.dispatch({ type: 'edit', targetId: id }, 'user');
            else this.select({ ids: [id], activeId: id }, 'user', true);
            return true;
        });
    }
    editNode(id: string): void { this.execute({ type: 'edit', targetId: id }); }
    private startEdit(command: MindMapCommand, origin: Origin, replacementText?: string): boolean {
        if (origin === 'user' && this.store.readonly) return false;
        const before = this.getSelection();
        const creation = command.type !== 'edit';
        const target = 'targetId' in command ? command.targetId ?? before.activeId : before.activeId;
        if (!target || !this.scene.geometry!.nodes.has(target)) return false;
        const originalViewport = this.getViewport();
        if (creation) { if (!this.store.beginCreation(command)) return false; this.render(true); }
        else { this.store.beginEdit(target); this.store.setSelection([target], target); this.render(false); }
        this.generation++; this.input.reset(); this.menu.close(false);
        const edit = this.store.edit!; this.editOrigin = origin; this.editViewport = creation ? originalViewport : undefined;
        this.selectionPath.reset(this.store.selection); this.revealIds([edit.id], origin);
        this.textEditor = new TextEditor(this.scene.scene, this.scene.nodeElement(edit.id)!, replacementText ?? this.store.model.nodes.get(edit.id)!.text,
            { geometry: this.scene.geometry!.nodes.get(edit.id)!, creation, compact: creation || !this.store.model.nodes.get(edit.id)!.children.some(id => this.scene.geometry!.nodes.has(id)),
                ...this.editorLimits() },
            (commit, focus) => { this.run(() => { this.finishEdit(commit, focus); return true; }); });
        if (replacementText !== undefined) this.textEditor.textarea.setSelectionRange(replacementText.length, replacementText.length);
        this.constrainEditor();
        this.selectionEvent(before, origin);
        this.emit('editstart', () => ({ id: edit.id, provisional: edit.provisional, origin }));
        return true;
    }
    private editorLimits(): { width: number; height: number } {
        return { width: Math.max(20, (this.element.clientWidth - 32) / this.viewport.zoom), height: Math.max(21, Math.min(186, (this.element.clientHeight - 32) / this.viewport.zoom)) };
    }
    private constrainEditor(): void {
        if (!this.textEditor || !this.element.clientWidth || !this.element.clientHeight) return;
        const limits = this.editorLimits();
        this.textEditor.resize(limits.width, limits.height);
        const area = this.textEditor.textarea.style;
        this.applyViewport(reveal(this.viewport, { x: parseFloat(area.left), y: parseFloat(area.top), width: parseFloat(area.width), height: parseFloat(area.height) }, this.element.clientWidth, this.element.clientHeight));
    }
    private finishEdit(commit: boolean, focus: boolean): void {
        const editor = this.textEditor, edit = this.store.edit; if (!editor || !edit) return;
        const text = editor.textarea.value, before = this.getSelection(), origin = this.editOrigin;
        this.textEditor = undefined; editor.destroy();
        const changed = commit ? this.store.commitEdit(text) : (this.store.cancelEdit(), false);
        if (this.deferredLayout) { this.scene.refresh(); this.deferredLayout = false; this.render(true); }
        else this.render(this.store.lastGeometry);
        this.selectionPath.reset(this.store.selection);
        if (!commit && this.editViewport) this.applyViewport(this.editViewport);
        this.editViewport = undefined;
        if (focus) this.focus();
        if (changed) this.emit('documentchange', () => ({ document: this.getDocument(), origin, reason: 'command', command: edit.command }));
        this.selectionEvent(before, origin);
        this.emit(commit ? 'editcommit' : 'editcancel', () => ({ id: edit.id, provisional: edit.provisional, origin }));
    }
    private discardEdit(): void {
        this.textEditor?.destroy(); this.textEditor = undefined; this.editViewport = undefined; this.store.cancelEdit();
        if (this.deferredLayout) { this.scene.refresh(); this.deferredLayout = false; }
    }
    private clipboardApplicable(command: MindMapCommand): boolean {
        if (command.type !== 'copy' && this.store.readonly) return false;
        if (command.type === 'paste') return this.store.model.nodes.has(command.targetId ?? this.store.selection.activeId ?? '');
        const ids = 'ids' in command ? command.ids ?? this.store.selection.ids : this.store.selection.ids;
        return !!ids.length && ids.every(id => this.store.model.nodes.has(id)) && (command.type !== 'cut' || !ids.includes(this.store.model.rootId));
    }
    private clipboardRequest(command: MindMapCommand, origin: Origin, data?: DataTransfer): boolean {
        if (this.clipboard.busy) throw new MindMapError('CLIPBOARD_BUSY', 'A clipboard request is already pending');
        if (command.type !== 'copy' && this.store.readonly) {
            if (origin === 'api') throw new MindMapError('READ_ONLY', 'Clipboard mutation is disabled in read-only mode');
            return false;
        }
        if (!this.clipboardApplicable(command)) {
            if (('targetId' in command && command.targetId !== undefined) || ('ids' in command && command.ids?.some(id => !this.store.model.nodes.has(id)))) throw new MindMapError('INVALID_TARGET', 'Unknown clipboard target');
            return false;
        }
        if (this.textEditor) this.finishEdit(true, false);
        if (this.destroyed || !this.clipboardApplicable(command)) return false;
        const type = command.type as ClipboardCommand, generation = this.generation;
        const target = 'targetId' in command ? command.targetId ?? this.store.selection.activeId : this.store.selection.activeId;
        const ids = normalizeRoots(this.store.model, 'ids' in command ? command.ids ?? this.store.selection.ids : this.store.selection.ids, this.store.visualOrder);
        const text = type === 'paste' ? '' : serialize(this.store.model, ids, this.store.visualOrder);
        return this.clipboard.request(type, text, data, value => { this.run(() => {
            if (type !== 'copy' && this.generation !== generation) throw new MindMapError('CLIPBOARD_STALE', 'Document or editing interaction changed during clipboard access');
            const before = this.getSelection();
            const modelBefore = this.store.model;
            const changed = type === 'cut' ? this.store.execute({ type: 'delete', ids }) : type === 'paste' ? this.store.paste(target!, parse(value)) : false;
            const affected = type === 'paste' ? changed ? this.store.model.nodes.get(target!)!.children.filter(id => !modelBefore.nodes.has(id)) : [] : ids;
            if (changed) {
                this.selectionPath.reset(this.store.selection); this.render(true); this.revealIds(this.store.selection.ids, origin);
                this.emit('documentchange', () => ({ document: this.getDocument(), origin, reason: 'command', command: type }));
                this.selectionEvent(before, origin);
            }
            this.emit('commandcomplete', () => ({ command: type, origin, ids: [...affected] }));
            return true;
        }); }, error => { this.run(() => { this.report(error); return false; }); });
    }
    private openLink(id: string | undefined, origin: Origin): boolean {
        const url = labelUrl(this.store.model.nodes.get(id ?? '')?.text ?? '');
        if (!id || !url) return false;
        let prevented = false;
        const event = { id, url, origin, preventDefault: (): void => { prevented = true; } };
        for (const listener of [...this.listeners.get('linkopen') ?? []]) {
            if (this.destroyed) return false;
            try { listener(event as never); } catch { prevented = true; this.report(new MindMapError('HOST_CALLBACK', 'linkopen listener threw')); }
        }
        if (!prevented && !this.destroyed) this.element.ownerDocument.defaultView!.open(url, '_blank', 'noopener,noreferrer');
        return true;
    }
    private localPoint(x: number, y: number): { x: number; y: number } {
        const r = this.element.getBoundingClientRect();
        return { x: (x - r.left) * this.element.clientWidth / r.width, y: (y - r.top) * this.element.clientHeight / r.height };
    }
    private hit(x: number, y: number, markerOnly = false): string | undefined {
        const p = this.localPoint(x, y), v = this.viewport;
        const wx = (p.x - v.x) / v.zoom, wy = (p.y - v.y) / v.zoom;
        if (markerOnly) {
            const stroke = parseFloat(getComputedStyle(this.element).getPropertyValue('--mindmap-line-width')) || 1;
            return [...this.scene.geometry!.nodes.values()].reverse().find(g => g.marker &&
                Math.hypot(wx - g.marker.x, wy - g.marker.y) <= g.marker.radius + stroke / 2)?.id;
        }
        return [...this.scene.geometry!.nodes.values()].reverse().find(g => { const b = g.interaction; return wx >= b.x && wx <= b.x + b.width && wy >= b.y && wy <= b.y + b.height + 3; })?.id;
    }
    private applyViewport(view: Viewport, origin: Origin = 'api'): void {
        if (this.destroyed || ![view.x, view.y, view.zoom].every(Number.isFinite)) return;
        const changed = view.x !== this.viewport.x || view.y !== this.viewport.y || view.zoom !== this.viewport.zoom;
        if (changed) { this.menu?.close(true); this.viewportOrigin = origin; }
        this.viewport = view;
        this.scene.scene.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
        if (changed && !this.viewportFrame) this.viewportFrame = requestAnimationFrame(() => {
            this.viewportFrame = 0;
            this.run(() => { this.emit('viewportchange', () => ({ ...this.getViewport(), origin: this.viewportOrigin })); return true; });
        });
    }
    panTo(x: number, y: number): void { this.run(() => { this.applyViewport({ ...this.viewport, x, y }); return true; }); }
    getViewport(): Viewport { return { ...this.viewport }; }
    setZoom(scale: number): void { this.run(() => { this.zoom(scale); return true; }); }
    private zoom(scale: number, origin: Origin = 'api'): void { if (Number.isFinite(scale)) this.applyViewport(zoomAt(this.viewport, scale, this.element.clientWidth / 2, this.element.clientHeight / 2), origin); }
    fit(): void { this.run(() => { this.fitViewport(); return true; }); }
    private fitViewport(origin: Origin = 'api'): void {
        if (this.destroyed) return;
        this.pendingFit = !this.element.clientWidth || !this.element.clientHeight;
        if (this.pendingFit) {
            // A zero-size interval can be coalesced away when the host returns to
            // its previous size before delivery. Request a fresh observation.
            this.resize.unobserve(this.element); this.resize.observe(this.element);
        } else this.applyViewport(fitBounds(this.scene.geometry!.bounds, this.element.clientWidth, this.element.clientHeight), origin);
    }
    panToNode(id: string): void { this.run(() => { this.revealIds([id]); return true; }); }
    private revealIds(ids: string[], origin: Origin = 'api'): void {
        const boxes = ids.flatMap(id => { const g = this.scene.geometry!.nodes.get(id); return g ? [g.interaction] : []; });
        if (!boxes.length) return;
        const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
        this.applyViewport(reveal(this.viewport, { x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x, height: Math.max(...boxes.map(b => b.y + b.height)) - y }, this.element.clientWidth, this.element.clientHeight), origin);
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
        return; this.discardEdit(); this.destroyed = true; this.queue = []; this.listeners.clear(); this.menu.close(false); this.menuAbort.abort(); this.clipboard.destroy(); this.input.destroy(); cancelAnimationFrame(this.viewportFrame); this.resize.disconnect(); this.fonts.removeEventListener('loadingdone', this.fontListener); this.scene.destroy(); this.element.remove(); }
}
