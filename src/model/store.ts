import { MindMapError } from '../types';
import type { MindMapCommand, MindMapDocument, MindMapEditorOptions, Selection } from '../types';
import { generateId, normalizeSelection, snapshot, validateDocument } from './document';
import type { Model } from './document';
import { History, applyPatches, patchesBetween } from '../history/history';
import { contentCommands, prepare } from '../commands/reducer';
import { validateCommand } from '../commands/validate';
import { preparePaste } from '../clipboard/paste';
import type { ClipboardNode } from '../clipboard/codec';
export class Store {
    model: Model;
    selection: Selection;
    readonly history: History;
    lastGeometry = false;
    edit: { id: string; provisional: boolean; base: Model; selection: Selection; command: MindMapCommand['type'] } | undefined;
    private readonly createId: () => string;
    readonly readonly: boolean;
    visualOrder: readonly string[] | undefined;
    constructor(options: MindMapEditorOptions) { this.model = validateDocument(options.document); this.selection = { ids: [this.model.rootId], activeId: this.model.rootId }; this.history = new History(options.historyLimit); this.createId = options.createNodeId ?? generateId; this.readonly = options.readonly ?? false; }
    getDocument(): MindMapDocument { return snapshot(this.model); }
    setDocument(document: MindMapDocument): void { const candidate = validateDocument(document); this.edit = undefined; this.model = candidate; this.selection = { ids: [candidate.rootId], activeId: candidate.rootId }; this.history.clear(); this.lastGeometry = true; }
    setSelection(ids: string[], activeId?: string): void {
        if (ids.some(id => !this.model.nodes.has(id)) || activeId !== undefined && !ids.includes(activeId))
            throw new MindMapError('INVALID_TARGET', 'Selection must contain known IDs and its active node');
        this.selection = normalizeSelection(this.model, { ids, ...(activeId !== undefined ? { activeId } : {}) });
    }
    beginEdit(id: string): boolean {
        if (this.readonly) throw new MindMapError('READ_ONLY', 'Editing is disabled in read-only mode');
        if (!this.model.nodes.has(id)) throw new MindMapError('INVALID_TARGET', 'Unknown edit target');
        this.edit = { id, provisional: false, base: this.model, selection: { ...this.selection, ids: [...this.selection.ids] }, command: 'setText' };
        return true;
    }
    beginCreation(command: MindMapCommand): boolean {
        if (this.readonly) throw new MindMapError('READ_ONLY', 'Editing is disabled in read-only mode');
        const result = prepare(this.model, this.selection, command, this.createId, this.visualOrder);
        if (!result) return false;
        this.edit = { id: result.transaction.after.activeId!, provisional: true, base: this.model, selection: { ...this.selection, ids: [...this.selection.ids] }, command: command.type };
        this.model = result.model; this.selection = result.transaction.after; this.lastGeometry = true;
        return true;
    }
    commitEdit(text: string): boolean {
        const edit = this.edit; if (!edit) return false;
        const result = prepare(this.model, this.selection, { type: 'setText', targetId: edit.id, text }, this.createId, this.visualOrder);
        const model = result?.model ?? this.model;
        const patches = patchesBetween(edit.base, model);
        this.edit = undefined; this.model = model;
        this.lastGeometry = edit.provisional || !!result?.transaction.geometry;
        if (!patches.length) return false;
        this.history.push({ patches, before: edit.selection, after: { ...this.selection, ids: [...this.selection.ids] }, geometry: this.lastGeometry });
        return true;
    }
    cancelEdit(): void {
        const edit = this.edit; if (!edit) return;
        if (edit.provisional) { this.model = edit.base; this.selection = edit.selection; }
        this.edit = undefined; this.lastGeometry = edit.provisional;
    }
    paste(targetId: string, roots: ClipboardNode[]): boolean {
        if (this.readonly) throw new MindMapError('READ_ONLY', 'Paste is disabled in read-only mode');
        const result = preparePaste(this.model, this.selection, targetId, roots, this.createId);
        if (!result) return false;
        this.model = result.model; this.selection = result.transaction.after;
        this.history.push(result.transaction); this.lastGeometry = true;
        return true;
    }
    canExecute(command: MindMapCommand): boolean {
        try { validateCommand(command); } catch { return false; }
        if (this.readonly)
            return false;
        if (command.type === 'undo')
            return this.history.canUndo;
        if (command.type === 'redo')
            return this.history.canRedo;
        if (!contentCommands.has(command.type))
            return false;
        try { return this.checkContentCommand(command); }
        catch { return false; }
    }
    /** Side-effect-free reducer preflight. Preserve validation errors for callers
     * that must reject a command before settling an active edit. */
    checkContentCommand(command: MindMapCommand): boolean {
        // Applicability must not invoke the host callback or reserve real IDs.
        let serial = 0;
        const id = (): string => { let value: string; do {
            value = `__preview_${serial++}`;
        } while (this.model.nodes.has(value)); return value; };
        return !!prepare(this.model, this.selection, command, id, this.visualOrder);
    }
    execute(command: MindMapCommand): boolean {
        validateCommand(command);
        this.lastGeometry = false;
        if (!contentCommands.has(command.type) && command.type !== 'undo' && command.type !== 'redo')
            return false;
        if (this.readonly)
            throw new MindMapError('READ_ONLY', 'Content commands are disabled in read-only mode');
        if (command.type === 'undo' || command.type === 'redo') {
            const tx = command.type === 'undo' ? this.history.undo() : this.history.redo();
            if (!tx)
                return false;
            const direction = command.type === 'undo' ? 'before' : 'after';
            this.model = applyPatches(this.model, tx.patches, direction);
            this.selection = normalizeSelection(this.model, tx[direction]);
            this.lastGeometry = tx.geometry;
            return true;
        }
        const result = prepare(this.model, this.selection, command, this.createId, this.visualOrder);
        if (!result)
            return false;
        this.model = result.model;
        this.selection = result.transaction.after;
        this.history.push(result.transaction);
        this.lastGeometry = result.transaction.geometry;
        return true;
    }
}
