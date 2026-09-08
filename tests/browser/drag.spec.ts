import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { referenceMap } from '../fixtures/maps';
import type { MindMapEditor } from '../../src';
declare global { interface Window { dragDemo: MindMapEditor; dragEvents: string[] } }
const node = (page: Page, id: string, host = '#primary') => page.locator(`${host} .mindmap-nodes [data-node-id="${id}"]`);
async function point(page: Page, id: string, x = .5, y = .5, host = '#primary') {
    const b = (await node(page, id, host).boundingBox())!; return { x: b.x + b.width * x, y: b.y + b.height * y };
}
async function begin(page: Page, id = 'c', host = '#primary') { const p = await point(page, id, .5, .5, host); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 6, p.y); }
async function over(page: Page, id: string, x: number, y: number, host = '#primary') { const p = await point(page, id, x, y, host); await page.mouse.move(p.x, p.y, { steps: 3 }); return p; }
async function state(page: Page) { return page.evaluate(() => ({ doc: window.primary.getDocument(), undo: window.primary.canUndo(), selection: window.primary.getSelection() })); }
test.beforeEach(async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready); await page.locator('#primary').scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.dragEvents = []; window.primary.on('documentchange', e => window.dragEvents.push(`${e.origin}:${e.command}`)); window.primary.setSelection(['b', 'c'], 'c'); });
});
for (const [mode, x, y, edge] of [['before', .5, .1, 'top'], ['after', .5, .9, 'bottom'], ['child', .9, .5, 'right']] as const) test(`actual group drag ${mode} previews gradient, freezes layout and commits one undoable move`, async ({ page }, info) => {
    const before = await state(page), layout = await page.locator('#primary .mindmap').getAttribute('data-layout-count');
    await begin(page); await over(page, 'n1', x, y);
    await expect(node(page, 'n1')).toHaveAttribute('data-drop-edge', edge);
    await expect(page.locator('#primary .mindmap-drag-image')).toHaveText('BC');
    expect(await state(page)).toEqual(before); expect(await page.locator('#primary .mindmap').getAttribute('data-layout-count')).toBe(layout);
    await page.locator('#primary').screenshot({ path: `docs/evidence/milestone-c/stage7/${mode}-${info.project.name}.png` });
    await page.mouse.up();
    const after = await state(page), parent = after.doc.root.children.find(n => n.id === 'three')!;
    expect(mode === 'child' ? parent.children[0]!.children.map(n => n.id) : parent.children.map(n => n.id)).toEqual(mode === 'child' ? ['b', 'c'] : mode === 'before' ? ['b', 'c', 'n1', 'n2', 'n3', 'n4'] : ['n1', 'b', 'c', 'n2', 'n3', 'n4']);
    expect(after.selection).toEqual({ ids: ['b', 'c'], activeId: 'c' }); expect(await page.evaluate(() => window.dragEvents)).toEqual(['user:move']);
    await expect(page.locator('#primary .mindmap-drag-image')).toHaveCount(0);
    await page.keyboard.press('Meta+z'); expect(await state(page)).toEqual(before); await page.keyboard.press('Meta+Shift+z'); expect((await state(page)).doc).toEqual(after.doc);
});
for (const side of ['left', 'right'] as const) test(`root ${side} drop assigns side and append order; before/after root siblings adopts their side`, async ({ page }) => {
    const before = await state(page); await begin(page); await over(page, 'root', side === 'left' ? .2 : .8, .5);
    await expect(node(page, 'root')).toHaveAttribute('data-drop-edge', side); await page.mouse.up();
    expect((await state(page)).doc.root.children.filter(n => n.side === side).slice(-2).map(n => n.id)).toEqual(['b', 'c']);
    await page.keyboard.press('Meta+z'); expect(await state(page)).toEqual(before);
    await begin(page); await over(page, 'child2', .5, .1); await page.mouse.up();
    expect((await state(page)).doc.root.children.filter(n => n.side === 'left').map(n => n.id)).toEqual(['child1', 'b', 'c', 'child2']);
});
test('left outward zones mirror at 200% zoom and host scale; inward middle rejects', async ({ page }, info) => {
    await page.evaluate(() => { const host = document.querySelector<HTMLElement>('#primary')!; host.style.transformOrigin = 'top left'; host.style.transform = 'scale(.8)'; window.primary.setZoom(2); window.primary.fit(); window.primary.setZoom(2); window.primary.panToNode('c21'); });
    // Keep both source and target in the viewport at this scale.
    await page.evaluate(() => { window.primary.setSelection(['c22', 'c23'], 'c23'); });
    await begin(page, 'c23'); await over(page, 'c21', .85, .5); await expect(page.locator('#primary [data-drop-edge]')).toHaveCount(0);
    await over(page, 'c21', .15, .5); await expect(node(page, 'c21')).toHaveAttribute('data-drop-edge', 'left');
    await page.locator('#primary').screenshot({ path: `docs/evidence/milestone-c/stage7/left-zoom-${info.project.name}.png` });
    await page.mouse.up(); expect((await state(page)).doc.root.children[1]!.children[0]!.children.map(n => n.id)).toEqual(['c22', 'c23']);
    await page.keyboard.press('Meta+z'); expect((await state(page)).doc).toEqual(referenceMap());
});
test('multi-parent and ancestor selections normalize to one visual forest without duplicate descendants', async ({ page }) => {
    await page.evaluate(() => window.primary.setSelection(['c', 'single', 'chain', 'b'], 'chain'));
    const before = await state(page); await begin(page, 'single'); await over(page, 'n1', .9, .5); await page.mouse.up();
    const roots = (await state(page)).doc.root.children.find(n => n.id === 'three')!.children[0]!.children;
    expect(roots.map(n => n.id)).toEqual(['b', 'c', 'single']); expect(roots[2]!.children.map(n => n.id)).toEqual(['chain']);
    await page.keyboard.press('Meta+z'); expect(await state(page)).toEqual(before);
});
test('collapsed child drop stays collapsed, selects visible target and reveals preserved subtrees on expansion', async ({ page }) => {
    const before = await state(page); await begin(page); await over(page, 'collapsed', .85, .5); await page.mouse.up();
    const target = (await state(page)).doc.root.children.find(n => n.id === 'three')!.children[2]!.children[0]!.children[0]!;
    expect(target.collapsed).toBe(true); expect(target.children.map(n => n.id)).toEqual(['hidden', 'b', 'c']);
    await expect(node(page, 'b')).toHaveCount(0); expect((await state(page)).selection.ids).toEqual(['collapsed']);
    await page.keyboard.press('Space'); await expect(node(page, 'b')).toBeVisible();
    await page.keyboard.press('Meta+z'); await page.keyboard.press('Meta+z'); expect(await state(page)).toEqual(before);
});
for (const scenario of ['cycle', 'selected', 'same-position', 'root', 'inward'] as const) test(`invalid ${scenario} has prohibited cursor, no gradient, no history`, async ({ page }) => {
    if (scenario === 'cycle') await page.evaluate(() => window.primary.setSelection(['one']));
    if (scenario === 'root') await page.evaluate(() => window.primary.setSelection(['root', 'c'], 'c'));
    const before = await state(page); await begin(page, scenario === 'cycle' ? 'one' : 'c');
    await over(page, scenario === 'cycle' ? 'a' : scenario === 'selected' ? 'b' : scenario === 'same-position' ? 'a' : 'n1', scenario === 'inward' ? .1 : .9, scenario === 'same-position' ? .9 : .5);
    await expect(page.locator('#primary [data-drop-edge]')).toHaveCount(0);
    if (scenario !== 'root') expect(await page.locator('#primary .mindmap').evaluate(el => getComputedStyle(el).cursor)).toBe('not-allowed');
    else await expect(page.locator('#primary .mindmap-drag-image')).toHaveCount(0);
    await page.mouse.up(); expect(await state(page)).toEqual(before); expect(await page.evaluate(() => window.dragEvents)).toEqual([]);
});
for (const cancellation of ['Escape', 'pointercancel', 'capture-loss', 'replacement', 'edit', 'destroy'] as const) test(`${cancellation} clears drag feedback and cancels mutation`, async ({ page }) => {
    const before = await state(page); await begin(page); await over(page, 'n1', .9, .5); await expect(node(page, 'n1')).toHaveAttribute('data-drop-edge', 'right');
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else await page.evaluate(cancellation => {
        const element = document.querySelector('#primary .mindmap')!;
        if (cancellation === 'pointercancel') element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
        if (cancellation === 'capture-loss') element.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
        if (cancellation === 'replacement') window.primary.setDocument(window.primary.getDocument());
        if (cancellation === 'edit') window.primary.editNode('a');
        if (cancellation === 'destroy') window.primary.destroy();
    }, cancellation);
    await expect(page.locator('#primary [data-drop-edge], #primary .mindmap-drag-image')).toHaveCount(0); await page.mouse.up();
    expect((await state(page)).doc).toEqual(before.doc); expect((await state(page)).undo).toBe(false);
    if (cancellation === 'Escape') expect((await state(page)).selection).toEqual(before.selection);
});
test('stationary edge pointer autopans across frames, re-hits the target and stops on cancel without relayout', async ({ page }, info) => {
    const host = (await page.locator('#primary').boundingBox())!, before = await state(page), count = await page.locator('#primary .mindmap').getAttribute('data-layout-count');
    await begin(page); const view = await page.evaluate(() => window.primary.getViewport());
    await page.mouse.move(host.x + host.width - 3, host.y + host.height / 2);
    await expect.poll(() => page.evaluate(() => window.primary.getViewport().x)).toBeLessThan(view.x - 30);
    await page.locator('#primary').screenshot({ path: `docs/evidence/milestone-c/stage7/autopan-${info.project.name}.png` });
    await page.keyboard.press('Escape'); const stopped = await page.evaluate(() => window.primary.getViewport()); await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.primary.getViewport())).toEqual(stopped); expect(await state(page)).toEqual(before);
    expect(await page.locator('#primary .mindmap').getAttribute('data-layout-count')).toBe(count);
    await page.mouse.up();
});
test('unselected press selects one source; read-only and non-mouse input never drag', async ({ page }) => {
    await begin(page, 'a'); expect((await state(page)).selection.ids).toEqual(['a']); await over(page, 'n1', .9, .5); await page.mouse.up();
    expect((await state(page)).doc.root.children.find(n => n.id === 'three')!.children[0]!.children.map(n => n.id)).toEqual(['a']);
    await page.goto('/?readonly'); await page.evaluate(() => { window.primary.setSelection(['b', 'c'], 'c'); });
    const before = await state(page); await begin(page); await over(page, 'n1', .9, .5); await expect(page.locator('#primary .mindmap-drag-image')).toHaveCount(0); await page.mouse.up(); expect(await state(page)).toEqual(before);
    await node(page, 'a').dispatchEvent('pointerdown', { pointerType: 'pen', pointerId: 3, button: 0 }); await node(page, 'n1').dispatchEvent('pointermove', { pointerType: 'pen', pointerId: 3 }); expect(await state(page)).toEqual(before);
});
test('reference drag comparison and environment evidence', async ({ page, browser }, info) => {
    await page.setViewportSize({ width: 1440, height: 1200 }); await page.locator('.drag-comparison').scrollIntoViewIfNeeded();
    await begin(page, 'c', '#drag-map'); await over(page, 'n1', .9, .5, '#drag-map');
    await expect(node(page, 'n1', '#drag-map')).toHaveAttribute('data-drop-edge', 'right');
    await page.locator('.drag-comparison').screenshot({ path: `docs/evidence/milestone-c/stage7/comparison-${info.project.name}.png` });
    await page.locator('#drag-map').screenshot({ path: `docs/evidence/milestone-c/stage7/reference-${info.project.name}.png` });
    writeFileSync(`docs/evidence/milestone-c/stage7/environment-${info.project.name}.json`, JSON.stringify({ browser: browser.version(), platform: process.platform, viewport: page.viewportSize(), deviceScaleFactor: 1, font: await node(page, 'n1', '#drag-map').evaluate(el => getComputedStyle(el).font), gradient: await node(page, 'n1', '#drag-map').evaluate(el => getComputedStyle(el).backgroundImage) }, null, 2) + '\n');
    await page.keyboard.press('Escape'); await page.mouse.up();
});

test('stationary pointer gradient is re-evaluated as autopan moves its target away', async ({ page }) => {
    await page.evaluate(() => { const doc = window.primary.getDocument(); doc.root.children.find(n => n.id === 'three')!.children[0]!.text = 'Wide target for stationary edge hover'; window.primary.setDocument(doc); window.primary.setSelection(['n2']); });
    const before = await state(page), host = (await page.locator('#primary').boundingBox())!, target = await point(page, 'n1', .75, .5);
    await page.evaluate(dx => { const v = window.primary.getViewport(); window.primary.panTo(v.x + dx, v.y); }, host.x + host.width - 28 - target.x);
    await begin(page, 'n2'); await over(page, 'n1', .75, .5);
    await expect(node(page, 'n1')).toHaveAttribute('data-drop-edge', 'right');
    await expect.poll(() => page.locator('#primary [data-drop-edge]').count()).toBe(0);
    await page.mouse.up(); expect(await state(page)).toEqual(before);
});
test('real pointer capture release and outside-widget release cancel drops', async ({ page }) => {
    await page.evaluate(() => { document.querySelector('#primary .mindmap')!.addEventListener('pointerdown', e => { (window as unknown as { pointer: number }).pointer = (e as PointerEvent).pointerId; }, { once: true }); });
    const before = await state(page); await begin(page); await over(page, 'n1', .9, .5);
    await page.evaluate(() => document.querySelector('#primary .mindmap')!.releasePointerCapture((window as unknown as { pointer: number }).pointer));
    await page.mouse.move(30, 30); await expect(page.locator('#primary .mindmap-drag-image')).toHaveCount(0); await page.mouse.up(); expect(await state(page)).toEqual(before);
    await begin(page); await over(page, 'n1', .9, .5); await page.mouse.move(30, 30); await page.mouse.up(); expect(await state(page)).toEqual(before);
});
