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
    writeFileSync(`docs/evidence/milestone-a/correctness/newlines-${info.project.name}.json`, JSON.stringify(results, null, 2) + '\n');
    await page.locator('#secondary').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('#secondary').screenshot({ path: `docs/evidence/milestone-a/correctness/newlines-${info.project.name}.png` });
});
