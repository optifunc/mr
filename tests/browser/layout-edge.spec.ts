import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('explicit newlines retain every empty row in measurement, rendering, and selection', async ({ page }, info) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const results = await page.evaluate(() => {
        const a = window.secondary;
        const rows: { text: string; expected: number; id: string; labelHeight: number; nodeHeight: number; content: string | null; stored: string; selected: boolean; overlaps: boolean }[] = [];
        for (const id of ['root', 'multi', 'checked']) {
            for (const text of ['', 'A', 'A\n', 'A\n\n', '\n', '\n\n', 'A\nB', 'A\r\n']) {
                a.execute({ type: 'setText', targetId: id, text });
                a.setSelection([id]);
                const node = document.querySelector(`#secondary [data-node-id="${id}"]`)!;
                const label = node.querySelector('.mindmap-label')!;
                const boxes = [...document.querySelectorAll('#secondary .mindmap-nodes .mindmap-node')].map(n => n.getBoundingClientRect());
                const overlaps = boxes.some((box, i) => boxes.slice(i + 1).some(other =>
                    box.left < other.right - .01 && box.right > other.left + .01 &&
                    box.top < other.bottom - .01 && box.bottom > other.top + .01));
                const snapshot = a.getDocument();
                rows.push({ text, expected: text.split(/\r\n|\r|\n/).length * 15, id,
                    labelHeight: label.getBoundingClientRect().height, nodeHeight: node.getBoundingClientRect().height,
                    content: label.textContent, stored: id === 'root' ? snapshot.root.text : snapshot.root.children.find(n => n.id === id)!.text,
                    selected: node.getAttribute('aria-selected') === 'true', overlaps });
            }
        }
        a.execute({ type: 'setText', targetId: 'root', text: 'Trailing rows\n' });
        a.execute({ type: 'setText', targetId: 'multi', text: 'A\n\n' });
        a.execute({ type: 'setText', targetId: 'checked', text: '\n\n' });
        a.setSelection(['root', 'multi', 'checked']);
        return rows;
    });
    for (const row of results) {
        expect(row.labelHeight, `${row.id} ${JSON.stringify(row.text)}`).toBe(row.expected);
        if (row.id !== 'root') expect(row.nodeHeight).toBe(row.expected + 5);
        expect(row.content).toBe(row.text);
        expect(row.stored).toBe(row.text);
        expect(row.selected).toBe(true);
        expect(row.overlaps).toBe(false);
    }
    writeFileSync(`docs/evidence/milestone-b/newlines-${info.project.name}.json`, JSON.stringify(results, null, 2) + '\n');
    await page.locator('#secondary').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('#secondary').screenshot({ path: `docs/evidence/milestone-b/newlines-${info.project.name}.png` });
});

test('ancestor transforms do not enter local measurements at mount or refresh', async ({ page }, info) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const results = await page.evaluate(() => {
        const host = document.querySelector('#secondary') as HTMLElement;
        const ancestor = host.parentElement!;
        const Editor = window.secondary.constructor as typeof import('../../src').MindMapEditor;
        const snapshotDocument = window.secondary.getDocument();
        snapshotDocument.root.text = 'Wide multiline root\nSecond line\n';
        window.secondary.setDocument(snapshotDocument);
        const snapshot = () => {
            const elements = [...host.querySelectorAll<HTMLElement>('.mindmap-nodes .mindmap-node')];
            return {
                local: elements.map(node => ({ id: node.dataset.nodeId, x: parseFloat(node.style.left), y: parseFloat(node.style.top),
                    width: parseFloat(node.style.width), height: parseFloat(node.style.height) })),
                paths: [...host.querySelectorAll('path')].map(path => path.getAttribute('d')),
                ellipse: [host.querySelector('ellipse')!.getAttribute('rx'), host.querySelector('ellipse')!.getAttribute('ry')],
                displayed: elements.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
                multilineLabelHeight: host.querySelector('[data-node-id="multi"] .mindmap-label')!.getBoundingClientRect().height,
            };
        };
        const baseline = snapshot();
        const cases = [
            { host: 'scale(.5)', ancestor: 'none' },
            { host: 'scale(1.5)', ancestor: 'none' },
            { host: 'scale(.5, 1.5)', ancestor: 'scale(1.25, .75)' },
            { host: 'rotate(15deg)', ancestor: 'scale(.75)' },
        ];
        const rows = cases.map(transforms => {
            host.style.transform = transforms.host;
            ancestor.style.transform = transforms.ancestor;
            const transformedBaseline = snapshot();
            window.secondary.refreshLayout();
            const refreshed = snapshot();
            window.secondary.destroy();
            window.secondary = new Editor(host, { document: snapshotDocument });
            const mounted = snapshot();
            host.style.transform = 'none'; ancestor.style.transform = 'none';
            window.secondary.refreshLayout();
            const restored = snapshot();
            return { transforms, transformedBaseline, refreshed, mounted, restored };
        });
        host.style.transform = 'scale(.5)';
        window.secondary.refreshLayout();
        return { baseline, rows };
    });
    for (const row of results.rows) {
        for (const state of [row.refreshed, row.mounted, row.restored]) {
            expect(state.local, JSON.stringify(row.transforms)).toEqual(results.baseline.local);
            expect(state.paths).toEqual(results.baseline.paths);
            expect(state.ellipse).toEqual(results.baseline.ellipse);
        }
        for (const state of [row.refreshed, row.mounted]) {
            // The browser supplies the expected transformed bounds before refresh.
            // This retains its own edge rounding (Firefox uses fractional app units)
            // and catches any second scaling during measurement with exact equality.
            expect(state.displayed).toEqual(row.transformedBaseline.displayed);
        }
    }
    const half = results.rows[0]!.refreshed;
    const multiIndex = half.local.findIndex(node => node.id === 'multi');
    expect(half.displayed[multiIndex]!.height).toBe(17.5);
    expect(half.multilineLabelHeight).toBe(15);
    writeFileSync(`docs/evidence/milestone-b/scaling-${info.project.name}.json`, JSON.stringify(results, null, 2) + '\n');
    await page.locator('#secondary').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('#secondary').screenshot({ path: `docs/evidence/milestone-b/scaling-${info.project.name}.png` });
});
