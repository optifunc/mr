import type { MindMapDocument, MindMapNode } from '../../src/types';
export const node = (id: string, text = id, children: MindMapNode[] = []): MindMapNode => ({ id, text, children });
export function referenceMap(): MindMapDocument {
    return { root: { id: 'root', text: 'New Mindmap', children: [
                { ...node('child1', 'Child 1'), side: 'left' },
                { ...node('child2', 'Child2', [node('c21', 'C2.1'), node('c22', 'C2.2'), node('c23', 'C 2.3')]), side: 'left' },
                { ...node('one', 'One', [node('a', 'A'), node('b', 'B'), node('c', 'C')]), side: 'right' },
                { ...node('two', 'Two', [node('single', 'Single child', [node('chain', 'Child of a single child')])]), side: 'right' },
                { ...node('three', 'Three', [node('n1', 'N1'), node('n2', 'N2'), node('n3', 'N3', [node('c1', 'C1', [{ ...node('collapsed', 'Collapsed node', [node('hidden', 'Hidden descendant')]), collapsed: true }]), node('c2', 'C2')]), node('n4', 'N4')]), side: 'right' },
            ] } };
}
export function geometryMap(): MindMapDocument {
    return { root: { ...node('root', 'Geometry'), checked: true, children: [
                { ...node('multi', 'First line\nSecond line', [node('empty', ''), node('space', '   ')]), side: 'left', checked: false },
                { ...node('checked', 'Checked label'), side: 'right', checked: true },
                { ...node('unchecked', 'Unchecked label', [{ ...node('nested', 'Independent child'), checked: true }]), side: 'right', checked: false },
                { ...node('html', '<b>Plain text</b>'), side: 'right' },
            ] } };
}
/** Exactly 1,000 total / 500 visible: ten mixed branches, 250 collapsed leaves
 * each containing two hidden descendants. IDs/text/order are deterministic. */
export function workloadMap(): MindMapDocument {
    const root: MindMapDocument['root'] = { id: 'root', text: 'Workload', children: [] };
    let serial = 0, collapsed = 0;
    const visible = (): MindMapNode => { const i = serial++; return node(`branch-${i}`, i % 19 === 0 ? `Topic ${i % 40}\nSecond line` : `Topic ${i % 40}`); };
    for (let branch = 0; branch < 10; branch++) {
        const top = visible();
        for (let group = 0; group < 7; group++) {
            const parent = visible();
            for (let leaf = 0; leaf < (branch === 9 && group === 6 ? 5 : 6); leaf++) {
                const item = visible();
                if (collapsed < 250) {
                    item.collapsed = true;
                    item.children = [node(`hidden-${collapsed}-a`), node(`hidden-${collapsed}-b`)];
                    collapsed++;
                }
                if (serial % 5 === 0)
                    item.checked = serial % 2 === 0;
                parent.children.push(item);
            }
            top.children.push(parent);
        }
        root.children.push({ ...top, side: branch % 2 ? 'left' : 'right' });
    }
    return { root };
}
