import { expect, test } from '@playwright/test';
import { referenceMap, node } from '../fixtures/maps';
const primary = 'Meta'; // The recorded macOS automation environment uses Command.
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });
test('mouse toggle/range/empty selection and keyboard central-child navigation, contraction and collapse', async ({ page }) => {
    const n = (id: string) => page.locator(`#primary [data-node-id="${id}"]`);
    const selection = () => page.evaluate(() => window.primary.getSelection());
    await page.evaluate(() => window.primary.focus()); await page.keyboard.press('ArrowRight'); expect((await selection()).activeId).toBe('b');
    await page.keyboard.press('Shift+ArrowUp'); expect((await selection()).ids).toEqual(['b', 'a']);
    await page.keyboard.press('Shift+ArrowDown'); expect((await selection()).ids).toEqual(['b']);
    await n('a').click(); await n('c').click({ modifiers: ['Shift'] }); expect((await selection()).ids).toEqual(['a', 'b', 'c']);
    await n('b').click({ modifiers: [primary] }); expect((await selection()).ids).toEqual(['a', 'c']);
    await n('child1').click(); await n('one').click({ modifiers: ['Shift'] }); expect((await selection()).ids).toEqual(['child1', 'child2', 'one']);
    await n('child2').click(); await page.keyboard.press('ArrowLeft'); expect((await selection()).activeId).toBe('c22');
    await n('collapsed').click(); await page.keyboard.press('ArrowRight'); expect((await selection()).activeId).toBe('collapsed'); await expect(n('hidden')).toBeVisible();
    await page.keyboard.press('ArrowRight'); expect((await selection()).activeId).toBe('hidden');
    await page.keyboard.press(`${primary}+a`); expect((await selection()).ids).not.toContain('root');
    await page.keyboard.press('Escape'); expect((await selection()).ids).toEqual(['hidden']);
    const rect = await page.locator('#primary').boundingBox(); await page.mouse.click(rect!.x + 10, rect!.y + 10); expect((await selection()).ids).toEqual([]);
});
test('actual block keys wrap, promote, flip, preserve selection, emit one event and undo/redo once', async ({ page }) => {
    await page.evaluate(() => { window.primary.setSelection(['b', 'c'], 'c'); window.primary.focus(); });
    await page.keyboard.press(`${primary}+ArrowDown`);
    expect(await page.evaluate(() => window.primary.getDocument().root.children.find(n => n.id === 'one')!.children.map(n => n.id))).toEqual(['b', 'c', 'a']);
    await page.keyboard.press(`${primary}+ArrowUp`);
    expect(await page.evaluate(() => window.primary.getDocument().root.children.find(n => n.id === 'one')!.children.map(n => n.id))).toEqual(['a', 'b', 'c']);
    await page.evaluate(() => { Object.assign(window, { changes: [] }); window.primary.on('documentchange', e => (window as unknown as { changes: string[] }).changes.push(`${e.origin}:${e.command}`)); });
    await page.keyboard.press(`${primary}+ArrowLeft`);
    expect(await page.evaluate(() => window.primary.getDocument().root.children.map(n => n.id))).toEqual(['child1', 'child2', 'one', 'b', 'c', 'two', 'three']);
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['b', 'c'], activeId: 'c' });
    await page.keyboard.press(`${primary}+ArrowLeft`);
    expect(await page.evaluate(() => window.primary.getDocument().root.children.filter(n => n.side === 'left').map(n => n.id))).toEqual(['child1', 'child2', 'b', 'c']);
    const before = await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport() }));
    await page.keyboard.press(`${primary}+ArrowLeft`);
    expect(await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport() }))).toEqual(before);
    await page.keyboard.press(`${primary}+z`); await page.keyboard.press(`${primary}+Shift+z`);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before.d);
    expect(await page.evaluate(() => (window as unknown as { changes: string[] }).changes)).toEqual(['user:moveSelection', 'user:moveSelection', 'undo:undo', 'redo:redo']);
});
test('ineligible movement does not navigate or change viewport/history; interleaved siblings use same-side order', async ({ page }) => {
    const doc = { root: { ...node('root'), children: [{ ...node('a'), side: 'right' as const }, { ...node('l'), side: 'left' as const }, { ...node('b'), side: 'right' as const }, { ...node('c'), side: 'right' as const }] } };
    await page.evaluate(doc => { window.primary.setDocument(doc); window.primary.setSelection(['a', 'b'], 'b'); window.primary.focus(); }, doc);
    await page.keyboard.press(`${primary}+ArrowUp`);
    expect(await page.evaluate(() => window.primary.getDocument().root.children.map(n => n.id))).toEqual(['l', 'c', 'a', 'b']);
    for (const ids of [['a', 'l'], ['root'], ['c', 'b']]) {
        await page.evaluate(ids => window.primary.setSelection(ids), ids);
        const before = await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport(), undo: window.primary.canUndo() }));
        await page.keyboard.press(`${primary}+ArrowUp`);
        expect(await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport(), undo: window.primary.canUndo() }))).toEqual(before);
    }
});
test('pan, wheel variants, pointer-anchored zoom, keyboard fit/clamps and resize keep document/history intact', async ({ page }) => {
    const before = await page.evaluate(() => ({ d: window.primary.getDocument(), count: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }));
    const rect = (await page.locator('#primary').boundingBox())!;
    const start = await page.evaluate(() => window.primary.getViewport());
    await page.mouse.move(rect.x + 10, rect.y + 10); await page.mouse.down(); await page.mouse.move(rect.x + 90, rect.y + 60); await page.mouse.up();
    expect(await page.evaluate(() => window.primary.getViewport())).toEqual({ ...start, x: start.x + 80, y: start.y + 50 });
    await page.mouse.wheel(0, 40); await expect.poll(() => page.evaluate(() => window.primary.getViewport().y)).toBe(start.y + 10);
    await page.keyboard.down('Shift'); await page.mouse.wheel(0, 30); await page.keyboard.up('Shift'); await expect.poll(() => page.evaluate(() => window.primary.getViewport().x)).toBe(start.x + 50);
    const old = await page.evaluate(() => { document.querySelector('#primary .mindmap')!.addEventListener('wheel', event => { const e = event as WheelEvent, r = (event.currentTarget as HTMLElement).getBoundingClientRect(); Object.assign(window, { wheelPoint: { x: e.clientX - r.x, y: e.clientY - r.y } }); }, { once: true }); return window.primary.getViewport(); });
    await page.keyboard.down(primary); await page.mouse.wheel(0, -100); await page.keyboard.up(primary);
    await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).toBeGreaterThan(1);
    const zoom = await page.evaluate(() => window.primary.getViewport());
    const point = await page.evaluate(() => (window as unknown as { wheelPoint: { x: number; y: number } }).wheelPoint);
    expect((point.x - old.x) / old.zoom).toBeCloseTo((point.x - zoom.x) / zoom.zoom, 5);
    expect((point.y - old.y) / old.zoom).toBeCloseTo((point.y - zoom.y) / zoom.zoom, 5);
    await page.evaluate(() => { window.primary.setZoom(100); window.primary.focus(); }); expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(4);
    await page.keyboard.press(`${primary}+0`); expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1);
    await page.keyboard.press(`${primary}+Shift+0`);
    const fitted = await page.evaluate(() => window.primary.getViewport());
    await page.evaluate(() => { document.querySelector<HTMLElement>('#primary')!.style.height = '500px'; });
    await page.waitForTimeout(50); expect(await page.evaluate(() => window.primary.getViewport())).toEqual(fitted);
    expect(await page.evaluate(() => ({ d: window.primary.getDocument(), count: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }))).toEqual(before);
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
test('checkbox click and mixed keyboard toggle are independent and do not relayout', async ({ page }) => {
    const count = await page.locator('#secondary .mindmap').getAttribute('data-layout-count');
    await page.locator('#secondary [data-node-id="checked"] input').click();
    await expect(page.locator('#secondary [data-node-id="checked"] input')).not.toBeChecked();
    await page.evaluate(() => { window.secondary.setSelection(['multi', 'nested', 'html'], 'multi'); window.secondary.focus(); });
    await page.keyboard.press('Control+Space');
    await expect(page.locator('#secondary [data-node-id="multi"] input')).toBeChecked();
    await expect(page.locator('#secondary [data-node-id="nested"] input')).toBeChecked();
    expect(await page.locator('#secondary .mindmap').getAttribute('data-layout-count')).toBe(count);
});
test('read-only gestures allow navigation/viewport but reject movement/collapse and preserve instance isolation', async ({ page }) => {
    await page.evaluate(async doc => { const path = '/src/index.ts'; const { MindMapEditor } = await import(/* @vite-ignore */ path); window.primary.destroy(); window.primary = new MindMapEditor(document.querySelector('#primary')!, { document: doc, readonly: true }); window.primary.setSelection(['one']); window.primary.focus(); }, referenceMap());
    const secondary = await page.evaluate(() => window.secondary.getDocument());
    await page.keyboard.press(`${primary}+ArrowLeft`); await page.keyboard.press('Space');
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.keyboard.press('ArrowRight'); expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe('b');
    await page.keyboard.press(`${primary}++`); expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBeGreaterThan(1);
    expect(await page.evaluate(() => window.secondary.getDocument())).toEqual(secondary);
});
