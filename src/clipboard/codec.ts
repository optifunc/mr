import { MindMapError } from '../types';
import { normalizeRoots } from '../model/document';
import type { Model } from '../model/document';

export interface ClipboardNode { text: string; checked?: boolean; children: ClipboardNode[] }
const encode = (text: string): string => text.replace(/\\/g, '\\\\').replace(/\r\n|\n|\r/g, '\\n').replace(/\t/g, '\\t');
const decode = (text: string): string => text.replace(/\\([\\nt\[])/g, (_, c: string) => c === 'n' ? '\n' : c === 't' ? '\t' : c);

export function serialize(model: Model, ids: readonly string[], order?: readonly string[]): string {
    const work = normalizeRoots(model, ids, order).reverse().map(id => ({ id, depth: 0 }));
    const lines: string[] = [];
    while (work.length) {
        const { id, depth } = work.pop()!, n = model.nodes.get(id)!;
        let text = encode(n.text);
        if (n.checked !== undefined) text = `${n.checked ? '[x]' : '[ ]'} ${text}`;
        else if (/^\[(?: |x)\] /.test(text)) text = `\\${text}`;
        lines.push('\t'.repeat(depth) + text);
        const children = id === model.rootId ? [...n.children.filter(c => model.nodes.get(c)!.side === 'left'), ...n.children.filter(c => model.nodes.get(c)!.side === 'right')] : n.children;
        for (let i = children.length - 1; i >= 0; i--) work.push({ id: children[i]!, depth: depth + 1 });
    }
    return lines.length ? lines.join('\n') + '\n' : '';
}

export function parse(text: string): ClipboardNode[] {
    if (!text) return [];
    const lines = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
    const roots: ClipboardNode[] = [], parents: ClipboardNode[] = [];
    for (const line of lines) {
        const depth = /^\t*/.exec(line)![0].length;
        if (depth > parents.length) throw new MindMapError('CLIPBOARD_INDENTATION', 'Clipboard indentation must start at zero and increase by at most one');
        let label = line.slice(depth);
        const checkbox = /^\[( |x)\] /.exec(label);
        if (checkbox) label = label.slice(4);
        const node: ClipboardNode = { text: decode(label), children: [], ...(checkbox ? { checked: checkbox[1] === 'x' } : {}) };
        (depth ? parents[depth - 1]!.children : roots).push(node);
        parents.length = depth; parents.push(node);
    }
    return roots;
}
