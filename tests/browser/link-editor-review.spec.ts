import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { node } from '../fixtures/maps';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/regression';
const phase = process.env.LINK_EDITOR_BEFORE ? 'before' : 'after';

test('URL labels use standard blue without underline, retain their branch and protected click behavior', async ({ page }, info) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', { name: 'Load clipboard + links fixture' }).click();
    const link = page.locator('#primary [data-node-id="url"] .mindmap-label');
    const measured = await link.evaluate(el => ({ color: getComputedStyle(el).color, decoration: getComputedStyle(el).textDecorationLine }));
    await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-links-${info.project.name}.png` });
    expect.soft(measured).toEqual({ color: 'rgb(0, 0, 238)', decoration: 'none' });
    await expect(page.locator('#primary [data-node-id="prose"] .mindmap-label')).not.toHaveClass(/mindmap-link/);
    const before = await page.locator('#primary .mindmap-lines').innerHTML();
    await page.evaluate(() => { window.clip = { events: [], completions: [], writes: [], resolve: () => {}, reject: () => {}, opens: [] }; window.open = (...args: unknown[]) => { window.clip.opens.push(args); return null; }; });
    await link.click({ modifiers: ['Meta'] });
    expect(await page.evaluate(() => window.clip.opens)).toEqual([['https://example.com/', '_blank', 'noopener,noreferrer']]);
    expect(await page.locator('#primary .mindmap-lines').innerHTML()).toBe(before);
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});

for (const zoom of [1, 1.5, 2]) test(`compact editor uses the larger node/eight-M width and preserves alignment at ${zoom}`, async ({ page }, info) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(doc => window.primary.setDocument(doc), { root: { ...node('root', 'Editor widths'), children: [
        { ...node('wide-left', 'A much wider left leaf label'), side: 'left' as const },
        { ...node('collapsed-left', 'Collapsed checkbox on the left', [node('hidden-left')]), checked: true, collapsed: true, side: 'left' as const },
        { ...node('wide-right', 'A much wider right leaf label'), side: 'right' as const },
        { ...node('collapsed-right', 'Collapsed multiline right label\nSecond line', [node('hidden-right')]), collapsed: true, side: 'right' as const },
        { ...node('short', 'A'), side: 'right' as const },
    ] } });
    const results = [];
    for (const id of ['wide-left', 'collapsed-left', 'wide-right', 'collapsed-right', 'short']) {
        await page.evaluate(({ id, zoom }) => { window.primary.setZoom(zoom); window.primary.setSelection([id]); window.primary.panToNode(id); window.primary.focus(); }, { id, zoom });
        await page.keyboard.press('F2'); await page.keyboard.press('ArrowLeft');
        const editor = page.locator('#primary textarea'); await expect(editor).toBeFocused();
        const measured = await editor.evaluate((area, id) => {
            const n = document.querySelector<HTMLElement>(`#primary [data-node-id="${id}"]`)!, label = n.querySelector<HTMLElement>('.mindmap-label')!;
            const probe = label.cloneNode(false) as HTMLElement; probe.style.width = 'max-content'; probe.style.position = 'absolute'; probe.textContent = 'MMMMMMMM'; n.append(probe);
            const defaultWidth = Math.ceil(parseFloat(getComputedStyle(probe).width)) + 6; probe.remove();
            const s = getComputedStyle(area), nr = n.getBoundingClientRect(), lr = label.getBoundingClientRect(), ar = area.getBoundingClientRect();
            return { id, width: parseFloat(s.width), nodeWidth: parseFloat(getComputedStyle(n).width), defaultWidth, area: ar.toJSON(), label: lr.toJSON(), node: nr.toJSON(), paddingLeft: parseFloat(s.paddingLeft), paddingTop: parseFloat(s.paddingTop), scrollLeft: area.scrollLeft, scrollTop: area.scrollTop };
        }, id);
        if (id === 'wide-left' || id === 'collapsed-right' || id === 'collapsed-left') await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-${id}-${zoom}-${info.project.name}.png` });
        if (id === 'collapsed-left') {
            // The wider left frame includes the existing checkbox in its padding.
            // Verify that padding is transparent, and retain its painted screenshot.
            expect.soft(await editor.evaluate(el => getComputedStyle(el).backgroundClip)).toBe('content-box');
            await expect(page.locator('#primary [data-node-id="collapsed-left"] input')).toBeChecked();
        }
        expect.soft(measured.width).toBeCloseTo(Math.max(measured.nodeWidth, measured.defaultWidth), 2);
        expect.soft(Math.abs(measured.area.x + (1 + measured.paddingLeft - measured.scrollLeft) * zoom - measured.label.x)).toBeLessThan(.8);
        expect.soft(Math.abs(measured.area.y + (1 + measured.paddingTop - measured.scrollTop) * zoom - measured.label.y)).toBeLessThan(.1);
        expect.soft(Math.abs(measured.area.bottom - .5 * zoom - measured.node.bottom)).toBeLessThan(.1);
        const frame = await editor.boundingBox(); await editor.fill('Changed\nMany more lines\nMore text'); expect(await editor.boundingBox()).toEqual(frame);
        await page.keyboard.press('Escape'); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        results.push(measured);
    }
    writeFileSync(`${evidence}/${phase}-widths-${zoom}-${info.project.name}.json`, JSON.stringify(results, null, 2) + '\n');
});

test('wide root leaf still uses node width, while oversized compact frames respect the viewport', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(doc => { window.primary.setDocument(doc); window.primary.focus(); }, { root: { ...node('root', 'Wide root without visible children'), children: [] } });
    const width = await page.locator('#primary .mindmap-root-node').evaluate(n => parseFloat(getComputedStyle(n).width));
    await page.keyboard.press('F2'); expect.soft(await page.locator('#primary textarea').evaluate(n => parseFloat(getComputedStyle(n).width))).toBeCloseTo(width, 2);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.querySelector<HTMLElement>('#primary')!.style.width = '320px'; window.primary.execute({ type: 'setText', targetId: 'root', text: 'Wide label '.repeat(40) }); window.primary.focus(); });
    await page.keyboard.press('F2');
    const host = (await page.locator('#primary').boundingBox())!, area = (await page.locator('#primary textarea').boundingBox())!;
    expect(area.width).toBe(288); expect(area.x).toBeGreaterThanOrEqual(host.x); expect(area.x + area.width).toBeLessThanOrEqual(host.x + host.width);
});
