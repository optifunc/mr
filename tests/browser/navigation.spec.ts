import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { navigationExamples } from '../fixtures/navigation';
for (const readonly of [false, true]) {
    test(`reviewed Up/Down examples with actual keys (${readonly ? 'read-only' : 'editable'})`, async ({ page, browser }, info) => {
        await page.goto(readonly ? '/?readonly' : '/');
        await page.evaluate(() => document.fonts.ready);
        const before = await page.evaluate(() => ({ document: window.primary.getDocument(), layouts: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }));
        const results = [];
        for (const example of navigationExamples) {
            await page.evaluate(id => { window.primary.setSelection([id]); window.primary.focus(); }, example.from);
            await page.keyboard.press(example.direction === 'up' ? 'ArrowUp' : 'ArrowDown');
            const selection = await page.evaluate(() => window.primary.getSelection());
            expect(selection).toEqual({ ids: [example.to], activeId: example.to });
            await expect(page.locator(`#primary [data-node-id="${example.to}"]`)).toHaveAttribute('aria-selected', 'true');
            await expect(page.locator('#primary .mindmap')).toBeFocused();
            results.push({ ...example, actual: selection.activeId });
        }
        expect(await page.evaluate(() => ({ document: window.primary.getDocument(), layouts: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }))).toEqual(before);
        expect(await page.evaluate(() => window.primary.canUndo() || window.primary.canRedo())).toBe(false);
        if (!readonly) {
            writeFileSync(`docs/evidence/milestone-b/navigation-fallback/results-${info.project.name}.json`, JSON.stringify({ browser: browser.version(), results }, null, 2) + '\n');
            await page.locator('#primary').screenshot({ path: `docs/evidence/milestone-b/navigation-fallback/selection-${info.project.name}.png` });
        }
    });
}
test('Shift+Up/Down extends and contracts across groups at the same depth; edges and collapse skip unavailable peers', async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { window.primary.setSelection(['c']); window.primary.focus(); });
    for (const ids of [['c', 'single'], ['c', 'single', 'n1']]) {
        await page.keyboard.press('Shift+ArrowDown');
        expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids, activeId: ids.at(-1) });
    }
    await page.keyboard.press('Shift+ArrowUp'); expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['c', 'single'], activeId: 'single' });
    await page.keyboard.press('Shift+ArrowUp'); expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['c'], activeId: 'c' });
    await page.evaluate(() => { window.primary.execute({ type: 'collapse', targetId: 'one' }); window.primary.setSelection(['single']); });
    const state = () => page.evaluate(() => ({ document: window.primary.getDocument(), selection: window.primary.getSelection(), viewport: window.primary.getViewport(), undo: window.primary.canUndo(), redo: window.primary.canRedo() }));
    const before = await state(); await page.keyboard.press('ArrowUp');
    expect(await state()).toEqual({ ...before, selection: { ids: ['one'], activeId: 'one' } });
    for (const [id, key] of [['child1', 'ArrowUp'], ['c23', 'ArrowDown'], ['three', 'ArrowDown']]) {
        await page.evaluate(id => window.primary.setSelection([id!]), id);
        const before = await state(); await page.keyboard.press(key!); expect(await state()).toEqual(before);
    }
});

test('Shift+Arrow includes shallower fallback destinations without selecting skipped ancestors', async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    for (const example of navigationExamples.slice(-3)) {
        await page.evaluate(id => { window.primary.setSelection([id]); window.primary.focus(); }, example.from);
        await page.keyboard.press(example.direction === 'up' ? 'Shift+ArrowUp' : 'Shift+ArrowDown');
        expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: [example.from, example.to], activeId: example.to });
    }
    expect(await page.evaluate(() => window.primary.canUndo() || window.primary.canRedo())).toBe(false);
});
