import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { referenceMap, node } from '../fixtures/maps';
test('editing reference, multiline, checkbox/root alignment and frozen geometry evidence', async ({ page, browser }, info) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', { name: 'Open reference edit' }).click();
    const editor = page.locator('#editing-map textarea'); await expect(editor).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.locator('.edit-comparison').scrollIntoViewIfNeeded();
    await page.locator('.edit-comparison').screenshot({ path: `docs/evidence/milestone-b/editing-comparison-${info.project.name}.png` });
    await page.locator('#editing-map').screenshot({ path: `docs/evidence/milestone-b/editing-${info.project.name}.png` });
    const before = await page.locator('#editing-map .mindmap-nodes').innerHTML();
    await editor.fill('First line\nSecond line\nThird line');
    expect(await page.locator('#editing-map .mindmap-nodes').innerHTML()).toBe(before);
    await page.locator('#editing-map').screenshot({ path: `docs/evidence/milestone-b/editing-multiline-${info.project.name}.png` });
    await page.keyboard.press('Enter');
    await page.locator('#editing-map').screenshot({ path: `docs/evidence/milestone-b/committed-multiline-${info.project.name}.png` });
    const measurements = [];
    for (const id of ['root', 'multi', 'checked']) {
        await page.evaluate(id => { window.secondary.setZoom(1.5); window.secondary.editNode(id); }, id);
        const measured = await page.locator('#secondary').evaluate((host, id) => {
            const label = host.querySelector(`[data-node-id="${id}"] .mindmap-label`)!.getBoundingClientRect();
            const area = host.querySelector('textarea')!.getBoundingClientRect();
            return { id, label: label.toJSON(), area: area.toJSON(), dx: area.x + 4.5 - label.x, dy: area.y + 4.5 - label.y };
        }, id);
        expect(Math.abs(measured.dx)).toBeLessThan(.76); expect(Math.abs(measured.dy)).toBeLessThan(.76);
        measurements.push(measured);
        await page.locator('#secondary').screenshot({ path: `docs/evidence/milestone-b/editor-${id}-${info.project.name}.png` });
        await page.keyboard.press('Escape');
    }
    writeFileSync(`docs/evidence/milestone-b/editing-${info.project.name}.json`, JSON.stringify({ browser: browser.version(), platform: process.platform, viewport: page.viewportSize(), deviceScaleFactor: 1, measurements }, null, 2) + '\n');
});
test('Ctrl routing on simulated non-Mac platform, all movement no-op classes, left promotion, empty destination and reveal', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'Win32' }));
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    for (const ids of [['a', 'c'], ['a', 'c21'], ['root', 'one'], ['one', 'a'], ['one', 'child1'], ['a', 'b', 'c']]) {
        await page.evaluate(ids => { window.primary.setSelection(ids); window.primary.focus(); }, ids);
        const before = await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport() }));
        await page.keyboard.press('Control+ArrowUp'); expect(await page.evaluate(() => ({ d: window.primary.getDocument(), s: window.primary.getSelection(), v: window.primary.getViewport() }))).toEqual(before); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    }
    await page.evaluate(() => { window.primary.setSelection(['c21', 'c22'], 'c22'); window.primary.focus(); window.primary.panTo(-2000, -2000); });
    await page.keyboard.press('Control+ArrowRight');
    expect(await page.evaluate(() => window.primary.getDocument().root.children.filter(n => n.side === 'left').map(n => n.id))).toEqual(['child1', 'child2', 'c21', 'c22']);
    const host = (await page.locator('#primary').boundingBox())!;
    for (const id of ['c21', 'c22']) { const box = (await page.locator(`#primary [data-node-id="${id}"]`).boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x); expect(box.y).toBeGreaterThanOrEqual(host.y); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width); expect(box.y + box.height).toBeLessThanOrEqual(host.y + host.height); }
    await page.keyboard.press('Control+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.evaluate(doc => { window.primary.setDocument(doc); window.primary.setSelection(['only']); window.primary.focus(); }, { root: { ...node('root'), children: [{ ...node('only', 'only', [node('sub')]), side: 'left' as const }] } });
    await page.keyboard.press('Control+ArrowRight'); expect(await page.evaluate(() => window.primary.getDocument().root.children[0]!.side)).toBe('right');
    await page.keyboard.press('Control+ArrowLeft'); expect(await page.evaluate(() => window.primary.getDocument().root.children[0]!.side)).toBe('left');
});
test('an outside click re-hits geometry after a large relayout, rather than selecting its stale DOM target', async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => { window.primary.setSelection(['one']); window.primary.focus(); });
    await page.keyboard.press('F2'); await page.locator('#primary textarea').fill('One\nwith\nmany\nnew\nrows\nthat\nmove\nthe\nbranches');
    const target = (await page.locator('#primary [data-node-id="a"]').boundingBox())!;
    const x = target.x + target.width / 2, y = target.y + target.height / 2;
    await page.mouse.click(x, y);
    const hit = await page.evaluate(({ x, y }) => {
        const nodes = [...document.querySelectorAll<HTMLElement>('#primary .mindmap-nodes .mindmap-node')];
        return nodes.reverse().find(n => { const b = n.getBoundingClientRect(); return x >= b.x && x <= b.right && y >= b.y && y <= b.bottom + 3; })?.dataset.nodeId;
    }, { x, y });
    expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe(hit);
    await expect(page.locator('#primary textarea')).toHaveCount(0);
});
test('destroy from editcommit listener prevents a queued follow-on content mutation', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { window.primary.editNode('one'); window.primary.on('editcommit', () => window.primary.destroy()); });
    await page.locator('#primary textarea').fill('Committed before destroy');
    const result = await page.evaluate(() => window.primary.execute({ type: 'delete', ids: ['one'] }));
    expect(result).toBe(false); expect(await page.evaluate(() => window.primary.getDocument().root.children.some(n => n.id === 'one'))).toBe(true);
    await expect(page.locator('#primary .mindmap')).toHaveCount(0);
});
test('read-only edit/delete/checkbox shortcuts are silent; invalid creation callback is atomic in the browser', async ({ page }) => {
    await page.goto('/?readonly');
    const before = await page.evaluate(() => window.primary.getDocument());
    await page.locator('#primary [data-node-id="one"]').click(); await page.keyboard.press('F2'); await page.keyboard.press('Tab'); await page.keyboard.press('Delete');
    await expect(page.locator('#primary textarea')).toHaveCount(0); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before);
    await page.evaluate(async () => { const path = '/src/index.ts'; const { MindMapEditor } = await import(/* @vite-ignore */ path); const doc = window.primary.getDocument(); window.primary.destroy(); window.primary = new MindMapEditor(document.querySelector('#primary')!, { document: doc, createNodeId: () => 'one' }); window.primary.setSelection(['one']); window.primary.focus(); });
    await page.keyboard.press('Tab'); await expect(page.locator('#primary textarea')).toHaveCount(0); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});

test('accepted-A rendering regression in its original page geometry', async ({ page }, info) => {
    // Preserve the accepted shell so changes to demo prose cannot shift raster phase.
    const { readFileSync } = await import('node:fs');
    const shell = readFileSync('tests/fixtures/accepted-a-shell.html', 'utf8');
    await page.goto('/');
    await page.evaluate(async shell => {
        window.primary.destroy(); window.secondary.destroy(); window.comparison.destroy();
        document.body.innerHTML = shell;
        const path = '/src/index.ts', fixtures = '/tests/fixtures/maps.ts';
        const { MindMapEditor } = await import(/* @vite-ignore */ path);
        const { reference100DpiMap } = await import(/* @vite-ignore */ fixtures);
        window.comparison = new MindMapEditor(document.querySelector('#comparison-map')!, { document: reference100DpiMap() });
    }, shell);
    await page.evaluate(() => document.fonts.ready);
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.locator('.comparison').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const capture = await page.locator('#comparison-map').screenshot({ path: `docs/evidence/milestone-b/regression-reference-${info.project.name}.png` });
    expect(capture.equals(readFileSync(`docs/evidence/milestone-a/checkbox-size/reference-${info.project.name}.png`)), 'Approved A image, pinned macOS browser/font environment, exact PNG comparison').toBe(true);
});

test('zero-size mount centers when measurable; deferred fit and later resize preserve view/history', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => { const path = '/src/index.ts'; const { MindMapEditor } = await import(/* @vite-ignore */ path); const doc = window.primary.getDocument(); window.primary.destroy(); const host = document.querySelector<HTMLElement>('#primary')!; host.style.width = '0px'; host.style.height = '0px'; window.primary = new MindMapEditor(host, { document: doc }); });
    await page.evaluate(() => { const host = document.querySelector<HTMLElement>('#primary')!; host.style.width = '600px'; host.style.height = '400px'; });
    await expect.poll(() => page.evaluate(() => window.primary.getViewport())).toEqual({ x: 300, y: 200, zoom: 1 });
    await page.evaluate(() => { const host = document.querySelector<HTMLElement>('#primary')!; host.style.width = '0px'; window.primary.fit(); });
    await page.evaluate(() => { document.querySelector<HTMLElement>('#primary')!.style.width = '600px'; });
    await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).not.toBe(1);
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
test('keyboard deletion normalizes subtrees and restores useful selection in one history step', async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => { window.primary.setSelection(['one', 'a', 'two'], 'a'); window.primary.focus(); });
    await page.keyboard.press('Delete');
    expect(await page.evaluate(() => window.primary.getDocument().root.children.map(n => n.id))).toEqual(['child1', 'child2', 'three']);
    expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe('root');
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});

test('viewport no-ops report false and emit no viewport or document event', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
        const editor = window.primary;
        editor.setZoom(4); await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const events: string[] = []; editor.on('viewportchange', () => events.push('viewport')); editor.on('documentchange', () => events.push('document'));
        const allowed = editor.canExecute({ type: 'zoomIn' }), executed = editor.execute({ type: 'zoomIn' });
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        return { allowed, executed, events, undo: editor.canUndo() };
    });
    expect(result).toEqual({ allowed: false, executed: false, events: [], undo: false });
});
