import { MindMapError } from '../types';
import type { MindMapCommand, MindMapDocument, MindMapEditorOptions, Selection } from '../types';
import { generateId, normalizeSelection, snapshot, validateDocument } from './document';
import type { Model } from './document';
import { History, applyPatches } from '../history/history';
import { contentCommands, prepare } from '../commands/reducer';
export class Store {
  model: Model; selection: Selection; readonly history: History; lastGeometry = false;
  private readonly createId: () => string; readonly readonly: boolean;
  visualOrder: readonly string[] | undefined;
  constructor(options: MindMapEditorOptions) { this.model = validateDocument(options.document); this.selection = { ids: [this.model.rootId], activeId: this.model.rootId }; this.history = new History(options.historyLimit); this.createId = options.createNodeId ?? generateId; this.readonly = options.readonly ?? false; }
  getDocument(): MindMapDocument { return snapshot(this.model); }
  setDocument(document: MindMapDocument): void { const candidate = validateDocument(document); this.model = candidate; this.selection = { ids: [candidate.rootId], activeId: candidate.rootId }; this.history.clear(); this.lastGeometry = true; }
  setSelection(ids: string[], activeId?: string): void {
    if (ids.some(id => !this.model.nodes.has(id)) || activeId !== undefined && !ids.includes(activeId)) throw new MindMapError('INVALID_TARGET', 'Selection must contain known IDs and its active node');
    this.selection = normalizeSelection(this.model, { ids, ...(activeId !== undefined ? { activeId } : {}) });
  }
  canExecute(command: MindMapCommand): boolean {
    if (this.readonly) return false;
    if (command.type === 'undo') return this.history.canUndo; if (command.type === 'redo') return this.history.canRedo;
    if (!contentCommands.has(command.type)) return false;
    // Applicability must not invoke the host callback or reserve real IDs.
    let serial = 0; const id = (): string => { let value: string; do { value = `__preview_${serial++}`; } while (this.model.nodes.has(value)); return value; };
    try { return !!prepare(this.model, this.selection, command, id, this.visualOrder); } catch { return false; }
  }
  execute(command: MindMapCommand): boolean {
    this.lastGeometry = false;
    if (!contentCommands.has(command.type) && command.type !== 'undo' && command.type !== 'redo') return false;
    if (this.readonly) throw new MindMapError('READ_ONLY', 'Content commands are disabled in read-only mode');
    if (command.type === 'undo' || command.type === 'redo') {
      const tx = command.type === 'undo' ? this.history.undo() : this.history.redo(); if (!tx) return false;
      const direction = command.type === 'undo' ? 'before' : 'after'; this.model = applyPatches(this.model, tx.patches, direction); this.selection = normalizeSelection(this.model, tx[direction]); this.lastGeometry = tx.geometry; return true;
    }
    const result = prepare(this.model, this.selection, command, this.createId, this.visualOrder); if (!result) return false;
    this.model = result.model; this.selection = result.transaction.after; this.history.push(result.transaction); this.lastGeometry = result.transaction.geometry; return true;
  }
}
