import { expect, test } from 'vitest';
import { layout } from '../../src/layout/layout';
import { validateDocument, visibleIds } from '../../src/model/document';
import { referenceMap, geometryMap, node, workloadMap } from '../fixtures/maps';
import type { MindMapDocument } from '../../src/types';
const style = { siblingGap: 4, branchGap: 24, rootGap: 24, markerRadius: 3, chainRise: 2 };
const measure = (m: ReturnType<typeof validateDocument>) => new Map([...m.nodes.values()].map(n => [n.id, { width: Math.max(...n.text.split('\n').map(line => line.length * 7), 1) + 14 + (n.checked !== undefined ? 17 : 0), height: n.text.split('\n').length * 18 + 6 }]));
test('reference tree: deterministic geometry, stable order, hidden exclusion, and ellipse bounds', () => { const m = validateDocument(referenceMap()); const a = layout(m, measure(m), style); expect(a).toEqual(layout(m, measure(m), style)); expect(a.nodes.size).toBe(21); expect(a.nodes.has('hidden')).toBe(false); expect(a.paths.size).toBe(20); expect(a.nodes.get('collapsed')!.marker).toBeDefined(); expect(a.nodes.get('root')!.box.x).toBe(-a.nodes.get('root')!.box.width / 2); expect(a.nodes.get('one')!.order).toBeLessThan(a.nodes.get('two')!.order); });
test('symmetric inputs mirror x geometry exactly and preserve side order', () => { const d: MindMapDocument = { root: { id: 'root', text: 'root', children: [{ ...node('l', 'Same', [node('lc', 'Child')]), side: 'left' }, { ...node('r', 'Same', [node('rc', 'Child')]), side: 'right' }] } }; const m = validateDocument(d), a = layout(m, measure(m), style); for (const [l, r] of [['l', 'r'], ['lc', 'rc']]) {
    const left = a.nodes.get(l!)!, right = a.nodes.get(r!)!;
    expect(left.box.x + left.box.width).toBe(-right.box.x);
    expect(left.baseline).toBe(right.baseline);
} expect(a.nodes.get('l')!.baseline - a.nodes.get('lc')!.baseline).toBe(style.chainRise); });
test.each([referenceMap(), geometryMap(), workloadMap()])('visible label boxes never overlap', d => { const m = validateDocument(d), a = layout(m, measure(m), style); const nodes = [...a.nodes.values()]; for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
        const x = nodes[i]!.box, y = nodes[j]!.box;
        expect(x.x + x.width <= y.x || y.x + y.width <= x.x || x.y + x.height <= y.y || y.y + y.height <= x.y).toBe(true);
    } expect(a.nodes.size).toBe(visibleIds(m).length); });
test('parents center on visible child extent; single-child baselines align; multiline and empty have area', () => { const m = validateDocument(geometryMap()), a = layout(m, measure(m), style); const p = a.nodes.get('multi')!, c1 = a.nodes.get('empty')!, c2 = a.nodes.get('space')!; expect(p.box.y + p.box.height / 2).toBe((c1.box.y + c2.box.y + c2.box.height) / 2); expect(c1.box.width).toBeGreaterThan(0); expect(c1.box.height).toBeGreaterThan(0); expect(p.box.height).toBe(42); });
test('collapsed root retains only ellipse and marker; deep layout is iterative', () => { const d = referenceMap(); d.root.collapsed = true; const m = validateDocument(d), a = layout(m, measure(m), style); expect(a.nodes.size).toBe(1); expect(a.nodes.get('root')!.marker).toBeDefined(); expect(a.bounds.width).toBeGreaterThan(a.nodes.get('root')!.box.width); const deep: MindMapDocument = { root: { id: 'r', text: 'r', children: [{ ...node('0'), side: 'right' }] } }; let n = deep.root.children[0]! as ReturnType<typeof node>; for (let i = 1; i < 5000; i++) {
    const next = node(String(i));
    n.children.push(next);
    n = next;
} const dm = validateDocument(deep); expect(layout(dm, measure(dm), style).nodes.size).toBe(5001); });
