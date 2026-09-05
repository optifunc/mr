import { MindMapError } from '../types';
import type { MindMapCommand, Selection, RootSide } from '../types';
import type { Model, NodeRecord } from '../model/document';
import { normalizeRoots, normalizeSelection } from '../model/document';
import { patchesBetween } from '../history/history';
import type { Transaction } from '../history/history';
export const contentCommands = new Set<MindMapCommand['type']>(['insertChild','insertBefore','insertAfter','insertParent','setText','delete','toggleChecked','addCheckbox','removeCheckbox','toggleCollapse','collapse','expand','move']);
export interface Prepared { model: Model; transaction: Transaction }
/** Prepares immutable records in isolation. ID/cycle/destination failures cannot install partial work. */
export function prepare(model: Model, selection: Selection, command: MindMapCommand, createId: () => string, order?: readonly string[]): Prepared | undefined {
  if (!contentCommands.has(command.type)) return;
  const nodes = new Map(model.nodes); let nextSelection = selection;
  const get = (id: string | undefined): NodeRecord => { const n = id === undefined ? undefined : nodes.get(id); if (!n) throw new MindMapError('INVALID_TARGET', `Unknown node: ${id ?? '(none)'}`); return n; };
  const update = (id: string, change: Partial<NodeRecord>): void => { nodes.set(id, { ...get(id), ...change }); };
  const explicit = 'targetId' in command ? command.targetId : undefined;
  const targetId = explicit ?? selection.activeId;
  const ids = 'ids' in command && command.ids !== undefined ? [...new Set(command.ids)] : selection.ids;
  if ('ids' in command && command.ids !== undefined) command.ids.forEach(get);
  if (explicit !== undefined) get(explicit);
  const choose = (id: string): void => { nextSelection = { ids: [id], activeId: id }; };
  const newId = (): string => { let id: string; try { id = createId(); } catch { throw new MindMapError('HOST_CALLBACK', 'createNodeId threw'); } if (typeof id !== 'string' || !id || nodes.has(id)) throw new MindMapError('INVALID_ID', 'createNodeId must return a new nonempty ID'); return id; };
  const splice = (parent: string, index: number, remove: number, ...insert: string[]): void => { const children = [...get(parent).children]; children.splice(index, remove, ...insert); update(parent, { children }); };
  const rootInsertIndex = (side: RootSide, before: boolean): number => { const children = get(model.rootId).children; const matches = children.map((id, i) => get(id).side === side ? i : -1).filter(i => i >= 0); return matches.length ? before ? matches[0]! : matches.at(-1)! + 1 : children.length; };
  switch (command.type) {
    case 'insertChild': case 'insertBefore': case 'insertAfter': case 'insertParent': {
      if (!targetId) return; const target = get(targetId); const atRoot = target.id === model.rootId;
      const wrap = command.type === 'insertParent' && !atRoot;
      let parent = command.type === 'insertChild' || atRoot ? target.id : target.parent!;
      let index = get(parent).children.length; let side: RootSide | undefined;
      if (parent === model.rootId) { side = atRoot ? command.type === 'insertParent' ? 'left' : 'right' : target.side!; index = atRoot ? rootInsertIndex(side, command.type === 'insertBefore') : get(parent).children.indexOf(target.id) + (command.type === 'insertAfter' ? 1 : 0); }
      else if (command.type !== 'insertChild') index = get(parent).children.indexOf(target.id) + (command.type === 'insertAfter' ? 1 : 0);
      const id = newId(); nodes.set(id, { id, text: command.text ?? '', children: wrap ? [target.id] : [], parent, ...(side ? { side } : {}), ...(!wrap && target.checked !== undefined ? { checked: false } : {}) });
      splice(parent, index, wrap ? 1 : 0, id);
      if (wrap) { const { side: _side, ...rest } = target; nodes.set(target.id, { ...rest, parent: id }); }
      if (get(parent).collapsed) update(parent, { collapsed: false }); choose(id); break;
    }
    case 'setText': if (!targetId) return; update(targetId, { text: command.text }); break;
    case 'toggleCollapse': case 'collapse': case 'expand': {
      if (!targetId) return; const target = get(targetId); if (!target.children.length) return;
      const collapsed = command.type === 'toggleCollapse' ? !target.collapsed : command.type === 'collapse';
      update(target.id, { collapsed });
      if (collapsed) { const candidate = { rootId: model.rootId, nodes }; const visibleSelection = normalizeSelection(candidate, nextSelection); if (visibleSelection.ids.length !== nextSelection.ids.length) choose(target.id); } break;
    }
    case 'toggleChecked': case 'addCheckbox': case 'removeCheckbox': {
      ids.forEach(get); const targets = ids.map(get); const checked = targets.filter(n => n.checked !== undefined); const value = checked.some(n => !n.checked);
      for (const n of targets) { if (command.type === 'toggleChecked' && n.checked !== undefined) update(n.id, { checked: value });
        if (command.type === 'addCheckbox' && n.checked === undefined) update(n.id, { checked: false });
        if (command.type === 'removeCheckbox' && n.checked !== undefined) { const { checked: _checked, ...rest } = n; nodes.set(n.id, rest); }
      } break;
    }
    case 'delete': {
      ids.forEach(get); if (!ids.length || ids.includes(model.rootId)) return;
      const roots = normalizeRoots(model, ids, order); const removed = new Set<string>(); const stack = [...roots];
      while (stack.length) { const n = get(stack.pop()!); removed.add(n.id); stack.push(...n.children); }
      let fallback = selection.activeId; while (fallback && removed.has(fallback)) fallback = get(fallback).parent ?? undefined;
      if (!fallback) fallback = get(roots[0]!).parent ?? model.rootId;
      for (const id of roots) { const n = get(id); splice(n.parent!, get(n.parent!).children.indexOf(id), 1); }
      for (const id of removed) nodes.delete(id); choose(fallback); break;
    }
    case 'move': {
      ids.forEach(get); if (!ids.length || ids.includes(model.rootId)) return;
      const roots = normalizeRoots(model, ids, order); const moving = new Set(roots); const target = get(command.destination.targetId);
      if (moving.has(target.id)) throw new MindMapError('INVALID_TARGET', 'Cannot move onto the moving group');
      let ancestor: string | null = target.id; while (ancestor) { if (moving.has(ancestor)) throw new MindMapError('INVALID_TARGET', 'Cannot move into a descendant'); ancestor = get(ancestor).parent; }
      const position = command.destination.position;
      if (target.id === model.rootId && position !== 'child') throw new MindMapError('INVALID_TARGET', 'Cannot insert beside root');
      const parent = position === 'child' ? target.id : target.parent!;
      const side = parent === model.rootId ? position === 'child' ? command.destination.side ?? 'right' : target.side! : undefined;
      for (const id of roots) { const n = get(id); splice(n.parent!, get(n.parent!).children.indexOf(id), 1); }
      const index = position === 'child' ? get(parent).children.length : get(parent).children.indexOf(target.id) + (position === 'after' ? 1 : 0);
      splice(parent, index, 0, ...roots);
      for (const id of roots) { const { side: _side, ...rest } = get(id); nodes.set(id, { ...rest, parent, ...(side ? { side } : {}) }); }
      nextSelection = { ids: roots, activeId: roots.includes(selection.activeId ?? '') ? selection.activeId! : roots[0]! };
      const visibleSelection = normalizeSelection({ rootId: model.rootId, nodes }, nextSelection);
      if (visibleSelection.ids.length !== nextSelection.ids.length) { let visibleTarget = target.id; const visible = new Set(normalizeSelection({ rootId: model.rootId, nodes }, { ids: [...nodes.keys()] }).ids); while (!visible.has(visibleTarget)) visibleTarget = get(visibleTarget).parent!; choose(visibleTarget); } break;
    }
    default: return;
  }
  const candidate: Model = { rootId: model.rootId, nodes }; const patches = patchesBetween(model, candidate); if (!patches.length) return;
  const geometry = patches.some(p => !p.before || !p.after || p.before.text !== p.after.text || p.before.parent !== p.after.parent || p.before.side !== p.after.side || !!p.before.collapsed !== !!p.after.collapsed || (p.before.checked === undefined) !== (p.after.checked === undefined) || p.before.children.length !== p.after.children.length || p.before.children.some((id, i) => id !== p.after!.children[i]));
  return { model: candidate, transaction: { patches, before: { ...selection, ids: [...selection.ids] }, after: normalizeSelection(candidate, nextSelection), geometry } };
}
