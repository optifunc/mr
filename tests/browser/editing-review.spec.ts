import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { referenceMap } from '../fixtures/maps';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-c/regression/editor-sizing';
const phase = process.env.EDIT_REVIEW_BEFORE ? 'before' : 'after';
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });

test('typing replaces the active label, preserves the first character and commits in one undo step', async ({ page }, info) => {
    for (const ids of [['one'], ['root'], ['a', 'c']]) {
        await page.evaluate(ids => { window.primary.setSelection(ids, ids.at(-1)); window.primary.focus(); }, ids);
        const before = await page.evaluate(() => ({ document: window.primary.getDocument(), layouts: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }));
        await page.keyboard.type('New label!');
        const editor = page.locator('#primary textarea');
        await expect(editor).toHaveValue('New label!'); await expect(editor).toBeFocused();
        expect(await editor.evaluate(e => [(e as HTMLTextAreaElement).selectionStart, (e as HTMLTextAreaElement).selectionEnd])).toEqual([10, 10]);
        expect(await page.evaluate(() => ({ document: window.primary.getDocument(), layouts: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }))).toEqual(before);
        expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: [ids.at(-1)], activeId: ids.at(-1) });
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        if (ids.length === 1 && ids[0] === 'one') await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-replacement-${info.project.name}.png` });
        await page.keyboard.press('Enter');
        await expect(page.locator(`#primary [data-node-id="${ids.at(-1)}"] .mindmap-label`)).toHaveText('New label!');
        await page.keyboard.press('ControlOrMeta+z');
        expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        // Clear redo before the next independent case.
        await page.evaluate(doc => window.primary.setDocument(doc), referenceMap());
    }
});

test('replacement cancellation restores text and redo; shortcuts and empty/read-only selection do not start replacement', async ({ page }) => {
    await page.evaluate(() => { window.primary.execute({ type: 'setText', targetId: 'one', text: 'Redo me' }); window.primary.undo(); window.primary.setSelection(['one']); window.primary.focus(); });
    await page.keyboard.press('Shift+X'); await expect(page.locator('#primary textarea')).toHaveValue('X');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    expect(await page.evaluate(() => window.primary.canRedo())).toBe(true);
    await expect(page.locator('#primary .mindmap')).toBeFocused();
    for (const key of ['Control+c', 'Meta+c', 'Alt+x']) {
        await page.keyboard.press(key); await expect(page.locator('#primary textarea')).toHaveCount(0);
    }
    await page.keyboard.press('Space'); await expect(page.locator('#primary [data-node-id="one"]')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#primary textarea')).toHaveCount(0);
    await page.evaluate(() => { window.primary.setSelection([]); window.primary.focus(); });
    await page.keyboard.type('No selection'); await expect(page.locator('#primary textarea')).toHaveCount(0);
    await page.goto('/?readonly'); await page.evaluate(() => window.primary.focus());
    await page.keyboard.type('Read only'); await expect(page.locator('#primary textarea')).toHaveCount(0);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
});

test('overflow has no horizontal scrollbar and the caret can reach both ends without relayout', async ({ page }, info) => {
    await page.evaluate(() => { window.primary.setSelection(['one']); window.primary.focus(); });
    await page.keyboard.press('F2');
    const editor = page.locator('#primary textarea');
    const before = await page.locator('#primary .mindmap-nodes').innerHTML();
    const text = 'A long replacement label with enough text to overflow the editor';
    await page.keyboard.type(text);
    await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-overflow-${info.project.name}.png` });
    expect(await editor.evaluate(e => getComputedStyle(e).overflowX)).toBe('hidden');
    expect(await editor.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
    await expect.poll(() => editor.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('ArrowLeft');
    await expect.poll(() => editor.evaluate(e => {
        const area = e as HTMLTextAreaElement;
        // Firefox may scroll away the left padding. The first character must
        // remain visible and the caret must be at the beginning of the buffer.
        return area.selectionStart === 0 && area.selectionEnd === 0 && area.scrollLeft <= parseFloat(getComputedStyle(area).paddingLeft);
    })).toBe(true);
    await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-overflow-start-${info.project.name}.png` });
    await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('ArrowRight');
    await expect.poll(() => editor.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    await expect(editor).toHaveValue(text);
    expect(await page.locator('#primary .mindmap-nodes').innerHTML()).toBe(before);
    await page.keyboard.press('Escape'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
});

for (const zoom of [1, 2]) test(`empty creation fits eight Ms and grows away from root at ${zoom * 100}%`, async ({ page }, info) => {
    const measurements = [];
    for (const target of ['child1', 'c21', 'one']) for (const key of ['Enter', 'Shift+Enter', 'Tab', 'Shift+Tab']) {
        await page.evaluate(({ target, zoom }) => { window.primary.setZoom(zoom); window.primary.setSelection([target]); window.primary.focus(); }, { target, zoom });
        const before = await page.evaluate(() => ({ document: window.primary.getDocument(), selection: window.primary.getSelection(), viewport: window.primary.getViewport() }));
        await page.keyboard.press(key);
        const editor = page.locator('#primary textarea'); await expect(editor).toHaveValue(''); await expect(editor).toBeFocused();
        const measured = await page.locator('#primary').evaluate(host => {
            const id = window.primary.getSelection().activeId!;
            const label = host.querySelector(`[data-node-id="${id}"] .mindmap-label`)!.getBoundingClientRect();
            const area = host.querySelector('textarea')!.getBoundingClientRect();
            const probe = host.querySelector(`[data-node-id="${id}"] .mindmap-label`)!.cloneNode(false) as HTMLElement;
            probe.textContent = 'MMMMMMMM'; probe.style.position = 'absolute'; probe.style.width = 'max-content'; host.querySelector('.mindmap-scene')!.append(probe);
            const eightM = parseFloat(getComputedStyle(probe).width); probe.remove();
            return { label: label.toJSON(), area: area.toJSON(), eightM };
        });
        if (target === 'child1' && key === 'Enter') await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-left-new-${zoom}x-${info.project.name}.png` });
        // Border + padding is 3 local px on each edge. Left branches anchor the
        // content's right edge; right branches anchor its left edge.
        const dx = target === 'one' ? measured.area.x + 3 * zoom - measured.label.x : measured.area.right - 3 * zoom - measured.label.right;
        expect(Math.abs(dx)).toBeLessThan(.76);
        expect(measured.area.width).toBe((Math.ceil(measured.eightM) + 6) * zoom);
        expect(Math.abs(measured.area.y + 3 * zoom - measured.label.y)).toBeLessThan(.76);
        measurements.push({ target, key, zoom, ...measured, dx });
        const frozen = await page.locator('#primary .mindmap-nodes').innerHTML();
        await page.keyboard.type('New sibling'); expect(await page.locator('#primary .mindmap-nodes').innerHTML()).toBe(frozen);
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => ({ document: window.primary.getDocument(), selection: window.primary.getSelection(), viewport: window.primary.getViewport() }))).toEqual(before);
    }
    writeFileSync(`${evidence}/${phase}-geometry-${zoom}x-${info.project.name}.json`, JSON.stringify(measurements, null, 2) + '\n');
});
