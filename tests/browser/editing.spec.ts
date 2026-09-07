import { expect, test } from '@playwright/test';
import { referenceMap, geometryMap } from '../fixtures/maps';
const primary = 'Meta';
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });
test('F2 selects text, native multiline typing freezes geometry and one commit relayouts once', async ({ page }) => {
    await page.evaluate(() => { window.primary.setSelection(['single']); window.primary.focus(); });
    const positions = () => page.locator('#primary .mindmap-nodes .mindmap-node').evaluateAll(nodes => nodes.map(n => ({ id: (n as HTMLElement).dataset.nodeId, left: (n as HTMLElement).style.left, top: (n as HTMLElement).style.top, width: (n as HTMLElement).style.width, height: (n as HTMLElement).style.height })));
    const before = await positions(), count = Number(await page.locator('#primary .mindmap').getAttribute('data-layout-count'));
    await page.keyboard.press('F2'); const editor = page.locator('#primary textarea'); await expect(editor).toBeFocused();
    expect(await editor.evaluate(e => [(e as HTMLTextAreaElement).selectionStart, (e as HTMLTextAreaElement).selectionEnd])).toEqual([0, 'Single child'.length]);
    await page.keyboard.type('First line'); await page.keyboard.press('Shift+Enter'); await page.keyboard.type('Second line with a longer label');
    expect(await positions()).toEqual(before); expect(Number(await page.locator('#primary .mindmap').getAttribute('data-layout-count'))).toBe(count);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.keyboard.press('Enter'); await expect(editor).toHaveCount(0); await expect(page.locator('#primary .mindmap')).toBeFocused();
    await expect(page.locator('#primary [data-node-id="single"] .mindmap-label')).toHaveText('First line\nSecond line with a longer label');
    expect(Number(await page.locator('#primary .mindmap').getAttribute('data-layout-count'))).toBe(count + 1);
    await page.keyboard.press(`${primary}+z`); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
for (const target of ['root', 'one'] as const) for (const key of ['Tab', 'Enter', 'Shift+Enter', 'Shift+Tab']) {
    test(`${key} on ${target}: visible provisional insertion, exact placement and one-entry commit`, async ({ page }) => {
        await page.evaluate(target => { window.primary.setSelection([target]); window.primary.focus(); }, target);
        await page.keyboard.press(key); const editor = page.locator('#primary textarea'); await expect(editor).toBeFocused();
        const provisional = await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), undo: window.primary.canUndo() }));
        const id = provisional.s.activeId!; expect(id).not.toBe(target); expect(provisional.undo).toBe(false);
        const roots = provisional.d.root.children, index = roots.findIndex(n => n.id === id);
        if (target === 'root') {
            expect(roots[index]!.side).toBe(key === 'Shift+Tab' ? 'left' : 'right');
            expect(index).toBe(key === 'Shift+Tab' || key === 'Shift+Enter' ? 2 : 5);
        } else if (key === 'Tab') expect(roots.find(n => n.id === 'one')!.children.map(n => n.id)).toEqual(['a', 'b', 'c', id]);
        else {
            expect(index).toBe(key === 'Enter' ? 3 : 2);
            if (key === 'Shift+Tab') expect(roots[index]!.children.map(n => n.id)).toEqual(['one']);
        }
        await page.keyboard.type('Created'); await page.keyboard.press('Enter');
        await expect(page.locator(`#primary [data-node-id="${id}"] .mindmap-label`)).toHaveText('Created');
        await page.keyboard.press(`${primary}+z`); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        await page.keyboard.press(`${primary}+Shift+z`); await expect(page.locator(`#primary [data-node-id="${id}"]`)).toBeVisible();
    });
}
test('Escape restores collapsed-parent creation and inserted-parent wrapping with selection and redo intact', async ({ page }) => {
    for (const key of ['Tab', 'Shift+Tab']) {
        await page.evaluate(() => { window.primary.execute({ type: 'setText', targetId: 'root', text: 'redo me' }); window.primary.undo(); window.primary.setSelection(['collapsed']); window.primary.focus(); });
        const before = await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection() }));
        await page.keyboard.press(key); await page.keyboard.type('cancel this'); await page.keyboard.press('Escape');
        expect(await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection() }))).toEqual(before);
        expect(await page.evaluate(() => window.primary.canRedo())).toBe(true); await expect(page.locator('#primary textarea')).toHaveCount(0);
        await expect(page.locator('#primary [data-node-id="hidden"]')).toHaveCount(0);
    }
});
test('click-to-edit only on sole selection and after pointer release; moved presses never edit', async ({ page }) => {
    const n = page.locator('#primary [data-node-id="one"]');
    const r = (await n.boundingBox())!; await page.mouse.move(r.x + 10, r.y + 8); await page.mouse.down(); await expect(page.locator('textarea')).toHaveCount(0); await page.mouse.up(); await expect(page.locator('#primary textarea')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.primary.setSelection(['one', 'two'], 'two'));
    await n.click(); await expect(page.locator('textarea')).toHaveCount(0); expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['one'], activeId: 'one' });
    await page.mouse.move(r.x + 10, r.y + 8); await page.mouse.down(); await page.mouse.move(r.x + 20, r.y + 20); await page.mouse.up(); await expect(page.locator('textarea')).toHaveCount(0);
});
test('outside pointer commits before resolving the new node target; external blur commits without stealing focus', async ({ page }) => {
    await page.evaluate(() => { window.primary.setSelection(['one']); window.primary.focus(); });
    await page.keyboard.press('F2'); await page.locator('#primary textarea').fill('One changed');
    await page.locator('#primary [data-node-id="child1"]').click();
    await expect(page.locator('#primary textarea')).toHaveCount(0); expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe('child1'); await expect(page.locator('#primary .mindmap')).toBeFocused();
    await page.keyboard.press('F2'); await page.locator('#primary textarea').fill('Blurred');
    await page.getByRole('button', { name: 'Undo', exact: true }).focus();
    await expect(page.locator('#primary textarea')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeFocused();
    await expect(page.locator('#primary [data-node-id="child1"] .mindmap-label')).toHaveText('Blurred');
});
test('composition Enter is guarded; platform textarea shortcuts never move, select map nodes or create history', async ({ page }) => {
    await page.evaluate(() => { window.primary.setSelection(['one']); window.primary.focus(); }); await page.keyboard.press('F2');
    const editor = page.locator('#primary textarea'); await editor.dispatchEvent('compositionstart'); await page.keyboard.press('Enter'); await expect(editor).toBeFocused();
    await editor.dispatchEvent('compositionend'); await editor.fill('Typing');
    const before = await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport() }));
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'a']) await page.keyboard.press(`${primary}+${key}`);
    expect(await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport() }))).toEqual(before);
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    await page.keyboard.press('Escape'); await expect(editor).toHaveCount(0); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
});
test('checkbox inheritance, empty creation commit, existing unchanged no-op and event order/origin', async ({ page }) => {
    await page.evaluate(doc => { window.primary.setDocument(doc); window.primary.setSelection(['multi']); window.primary.focus(); Object.assign(window, { edits: [] }); for (const type of ['documentchange', 'selectionchange', 'editstart', 'editcommit', 'editcancel'] as const) window.primary.on(type, e => (window as unknown as { edits: string[] }).edits.push(`${type}:${e.origin}`)); }, geometryMap());
    await page.keyboard.press('Tab'); const id = await page.evaluate(() => window.primary.getSelection().activeId!);
    await page.keyboard.press('Enter'); await expect(page.locator(`#primary [data-node-id="${id}"] input`)).not.toBeChecked();
    expect(await page.evaluate(() => (window as unknown as { edits: string[] }).edits)).toEqual(['selectionchange:user', 'editstart:user', 'documentchange:user', 'editcommit:user']);
    await page.keyboard.press('F2'); await page.keyboard.press('Enter'); await page.keyboard.press(`${primary}+z`); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(geometryMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
test('valid replacement/destroy discard edits, invalid replacement preserves buffer, public content commands finish it', async ({ page }) => {
    await page.evaluate(() => window.primary.editNode('one')); await page.locator('#primary textarea').fill('Buffer');
    await page.evaluate(() => window.primary.setDocument({} as never)); await expect(page.locator('#primary textarea')).toHaveValue('Buffer');
    await page.evaluate(() => window.primary.execute({ type: 'toggleCollapse', targetId: 'one' })); await expect(page.locator('#primary textarea')).toHaveCount(0);
    await expect(page.locator('#primary [data-node-id="one"] .mindmap-label')).toHaveText('Buffer');
    await page.evaluate(() => { window.primary.undo(); window.primary.undo(); window.primary.execute({ type: 'insertChild', targetId: 'collapsed' }); }); await page.locator('#primary textarea').fill('Discard');
    await page.evaluate(doc => window.primary.setDocument(doc), referenceMap()); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); await expect(page.locator('#primary textarea')).toHaveCount(0); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    await page.evaluate(() => window.primary.execute({ type: 'insertParent', targetId: 'one' })); await page.evaluate(() => window.primary.destroy()); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); await expect(page.locator('#primary .mindmap')).toHaveCount(0);
});
test('deferred style refresh cannot move the scene during typing; cancellation applies refresh', async ({ page }) => {
    await page.evaluate(() => { window.primary.editNode('one'); });
    const before = await page.locator('#primary .mindmap').getAttribute('data-layout-count');
    await page.evaluate(() => { document.querySelector<HTMLElement>('#primary .mindmap')!.style.setProperty('--mindmap-branch-gap', '35px'); window.primary.refreshLayout(); });
    expect(await page.locator('#primary .mindmap').getAttribute('data-layout-count')).toBe(before);
    await page.keyboard.press('Escape'); expect(Number(await page.locator('#primary .mindmap').getAttribute('data-layout-count'))).toBe(Number(before) + 1);
});

test('long labels stay editable inside the viewport; provisional Escape restores the prior view', async ({ page }) => {
    await page.evaluate(() => { const host = document.querySelector<HTMLElement>('#primary')!; host.style.width = '320px'; host.style.height = '240px'; window.primary.execute({ type: 'setText', targetId: 'one', text: 'Long label '.repeat(80) + '\nrow'.repeat(30) }); window.primary.editNode('one'); });
    const host = (await page.locator('#primary').boundingBox())!, editor = page.locator('#primary textarea'), area = (await editor.boundingBox())!;
    expect(area.x).toBeGreaterThanOrEqual(host.x); expect(area.y).toBeGreaterThanOrEqual(host.y); expect(area.x + area.width).toBeLessThanOrEqual(host.x + host.width); expect(area.y + area.height).toBeLessThanOrEqual(host.y + host.height);
    expect(await editor.evaluate(e => e.scrollWidth > e.clientWidth && e.scrollHeight > e.clientHeight)).toBe(true);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.primary.setSelection(['c']); window.primary.panTo(-900, -900); window.primary.focus(); });
    const before = await page.evaluate(() => window.primary.getViewport());
    await page.keyboard.press('Tab'); await expect(page.locator('#primary textarea')).toBeVisible(); await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.primary.getViewport())).toEqual(before);
});
