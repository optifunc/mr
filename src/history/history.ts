import type { Selection } from '../types';
import type { Model, NodeRecord } from '../model/document';
import { sameRecord } from '../model/document';
export interface Patch {
    id: string;
    before: NodeRecord | undefined;
    after: NodeRecord | undefined;
}
export interface Transaction {
    patches: Patch[];
    before: Selection;
    after: Selection;
    geometry: boolean;
}
export function patchesBetween(before: Model, after: Model): Patch[] {
    const patches: Patch[] = [];
    for (const id of new Set([...before.nodes.keys(), ...after.nodes.keys()])) {
        const a = before.nodes.get(id), b = after.nodes.get(id);
        if (!sameRecord(a, b))
            patches.push({ id, before: a, after: b });
    }
    return patches;
}
export function applyPatches(model: Model, patches: Patch[], direction: 'before' | 'after'): Model {
    const nodes = new Map(model.nodes);
    for (const patch of patches) {
        const n = patch[direction];
        if (n)
            nodes.set(patch.id, n);
        else
            nodes.delete(patch.id);
    }
    return { rootId: model.rootId, nodes };
}
export class History {
    private past: Transaction[] = [];
    private future: Transaction[] = [];
    constructor(private readonly limit = 100) { if (!Number.isInteger(limit) || limit < 0)
        throw new RangeError('historyLimit must be a nonnegative integer'); }
    get canUndo(): boolean { return !!this.past.length; }
    get canRedo(): boolean { return !!this.future.length; }
    push(tx: Transaction): void { this.future = []; if (this.limit) {
        this.past.push(tx);
        if (this.past.length > this.limit)
            this.past.shift();
    } }
    undo(): Transaction | undefined { const tx = this.past.pop(); if (tx)
        this.future.push(tx); return tx; }
    redo(): Transaction | undefined { const tx = this.future.pop(); if (tx)
        this.past.push(tx); return tx; }
    clear(): void { this.past = []; this.future = []; }
}
