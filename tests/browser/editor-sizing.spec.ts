import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/regression/editor-sizing';
const phase = process.env.EDITOR_SIZING_BEFORE ? 'before' : 'after';
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });

for (const zoom of [1, 1.5, 2]) test(`F2 width follows visible children and text/bottom alignment at ${zoom}`, async ({ page }, info) => {
    const results = [];
    for (const id of ['one', 'two', 'child2', 'a', 'child1', 'collapsed', 'chain']) {
        await page.evaluate(({ id, zoom }) => { window.primary.setZoom(zoom); window.primary.setSelection([id]); window.primary.panToNode(id); window.primary.focus(); }, { id, zoom });
        const before = await page.locator(`#primary [data-node-id="${id}"]`).evaluate(node => {
            const label = node.querySelector('.mindmap-label')!;
            const probe = label.cloneNode(false) as HTMLElement; probe.textContent = 'MMMMMMMM'; probe.style.position = 'absolute'; probe.style.width = 'max-content'; node.append(probe);
            const eightM = parseFloat(getComputedStyle(probe).width); probe.remove();
            return { node: node.getBoundingClientRect().toJSON(), label: label.getBoundingClientRect().toJSON(), eightM, expanded: node.getAttribute('aria-expanded') === 'true' };
        });
        await page.keyboard.press('F2');
        const editor = page.locator('#primary textarea'); await expect(editor).toBeFocused();
        await page.keyboard.press('ArrowLeft'); // Clear the selection without changing text.
        const actual = await editor.evaluate(e => {
            const s = getComputedStyle(e), r = e.getBoundingClientRect();
            const label = document.querySelector('#primary .mindmap-active .mindmap-label')!.getBoundingClientRect();
            return { box: r.toJSON(), label: label.toJSON(), paddingLeft: parseFloat(s.paddingLeft), paddingTop: parseFloat(s.paddingTop), scrollLeft: e.scrollLeft, scrollTop: e.scrollTop };
        });
        if (zoom === 2 && ['one', 'child1', 'collapsed'].includes(id)) await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-${id}-${info.project.name}.png` });
        expect.soft(Math.abs(actual.box.width - (before.expanded ? before.node.width : Math.max(before.node.width, (Math.ceil(before.eightM) + 6) * zoom)))).toBeLessThan(.1);
        // The middle of the 1px border must meet the SVG branch stroke center.
        expect.soft(Math.abs(actual.box.bottom - .5 * zoom - before.node.bottom)).toBeLessThan(.1);
        expect.soft(Math.abs(actual.box.y + (1 + actual.paddingTop - actual.scrollTop) * zoom - before.label.y)).toBeLessThan(.1);
        // Opening a wider frame may pan to reveal its edge; compare text with
        // the label under the same current viewport, not its pre-pan screen X.
        expect.soft(Math.abs(actual.box.x + (1 + actual.paddingLeft - actual.scrollLeft) * zoom - actual.label.x)).toBeLessThan(.8);
        results.push({ id, zoom, before, actual });
        const frame = await editor.boundingBox();
        await page.keyboard.type('MMMMMMMM'); await page.keyboard.press('Shift+Enter'); await page.keyboard.type('Second line');
        expect.soft(await editor.boundingBox()).toEqual(frame);
        await page.keyboard.press('Escape');
    }
    writeFileSync(`${evidence}/${phase}-geometry-${zoom}-${info.project.name}.json`, JSON.stringify(results, null, 2) + '\n');
});

test('eight-M width fits eight letters, follows the font, and creation wrapping follows visible children', async ({ page }, info) => {
    const widths = [];
    for (const fontSize of [12, 18]) for (const key of ['Enter', 'Shift+Tab']) {
        await page.evaluate(fontSize => { document.querySelector<HTMLElement>('#primary .mindmap')!.style.setProperty('--mindmap-font-size', `${fontSize}px`); window.primary.refreshLayout(); window.primary.setSelection(['child1']); window.primary.focus(); }, fontSize);
        await page.keyboard.press(key);
        const editor = page.locator('#primary textarea'); await expect(editor).toBeFocused();
        const measured = await editor.evaluate(e => {
            const node = document.querySelector('#primary .mindmap-active')!;
            const probe = node.querySelector('.mindmap-label')!.cloneNode(false) as HTMLElement;
            probe.textContent = 'MMMMMMMM'; probe.style.width = 'max-content'; probe.style.position = 'absolute'; node.append(probe);
            const eightM = parseFloat(getComputedStyle(probe).width); probe.remove();
            return { width: parseFloat(getComputedStyle(e).width), expected: Math.ceil(eightM) + 6 };
        });
        widths.push({ fontSize, key, ...measured });
        expect.soft(measured.width).toBeCloseTo(measured.expected, 2);
        if (key === 'Enter') {
            await page.keyboard.type('MMMMMMMM');
            expect.soft(await editor.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
            if (fontSize === 12) await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-eight-M-${info.project.name}.png` });
        }
        await page.keyboard.press('Escape');
    }
    writeFileSync(`${evidence}/${phase}-font-widths-${info.project.name}.json`, JSON.stringify(widths, null, 2) + '\n');
});
