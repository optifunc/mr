import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { referenceMap, geometryMap } from '../fixtures/maps';
const evidence = 'docs/evidence/milestone-d/regression/focus-controls';
const phase = process.env.FOCUS_CONTROLS_BEFORE ? 'before' : 'after';

test('keyboard focus has no frame and retains selection, navigation and active-descendant semantics', async ({ page }, info) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', { name: 'Select One', exact: true }).click();
    await page.keyboard.press('ArrowRight');
    const widget = page.locator('#primary .mindmap'); await expect(widget).toBeFocused();
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['b'], activeId: 'b' });
    expect(await widget.getAttribute('aria-activedescendant')).toBe(await page.locator('#primary [data-node-id="b"]').getAttribute('id'));
    await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-focus-${info.project.name}.png` });
    await expect(widget).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('F2'); await expect(page.locator('#primary textarea')).toBeFocused();
    await page.keyboard.press('Escape'); await expect(widget).toBeFocused(); await expect(widget).toHaveCSS('outline-style', 'none');
});

for (const platform of ['MacIntel', 'Win32']) test(`Control+Space toggles existing checkbox selection on ${platform}`, async ({ page }) => {
    await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { get: () => platform }), platform);
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { window.secondary.setSelection(['multi', 'checked', 'html'], 'multi'); window.secondary.focus(); });
    const before = await page.evaluate(() => ({ document: window.secondary.getDocument(), selection: window.secondary.getSelection(), viewport: window.secondary.getViewport(), layouts: document.querySelector('#secondary .mindmap')!.getAttribute('data-layout-count') }));
    await page.keyboard.press('Control+Space');
    await expect(page.locator('#secondary [data-node-id="multi"] input')).toBeChecked();
    await expect(page.locator('#secondary [data-node-id="checked"] input')).toBeChecked();
    await expect(page.locator('#secondary [data-node-id="multi"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#secondary [data-node-id="html"] input')).toHaveCount(0);
    expect(await page.evaluate(() => ({ selection: window.secondary.getSelection(), viewport: window.secondary.getViewport(), layouts: document.querySelector('#secondary .mindmap')!.getAttribute('data-layout-count') }))).toEqual({ selection: before.selection, viewport: before.viewport, layouts: before.layouts });
    await page.keyboard.press(`${platform === 'MacIntel' ? 'Meta' : 'Control'}+z`);
    expect(await page.evaluate(() => window.secondary.getDocument())).toEqual(before.document);
    expect(await page.evaluate(() => window.secondary.canUndo())).toBe(false);
    if (platform === 'MacIntel') {
        await page.keyboard.press('Meta+Space');
        expect(await page.evaluate(() => window.secondary.getDocument())).toEqual(before.document);
    }
    await page.keyboard.press('Space'); await expect(page.locator('#secondary [data-node-id="multi"]')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('F2'); await page.keyboard.press('Control+Space'); await expect(page.locator('#secondary textarea')).toBeFocused();
    expect(await page.evaluate(() => window.secondary.getDocument().root.children.find(n => n.id === 'multi')!.checked)).toBe(false);
});

for (const side of ['right', 'left', 'root'] as const) test(`clicking the ${side} collapsed circle expands on release, retains selection and undoes once`, async ({ page }, info) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    const doc = referenceMap();
    if (side === 'left') for (const child of doc.root.children) child.side = child.side === 'left' ? 'right' : 'left';
    if (side === 'root') doc.root.collapsed = true;
    await page.evaluate(({ doc, side }) => { window.primary.setDocument(doc); window.primary.setSelection(side === 'root' ? ['root'] : ['a', 'b'], side === 'root' ? 'root' : 'a'); window.primary.setZoom(2); window.primary.focus(); }, { doc, side });
    const id = side === 'root' ? 'root' : 'collapsed';
    const selection = await page.evaluate(() => window.primary.getSelection());
    const circle = page.locator('#primary circle').first();
    await circle.scrollIntoViewIfNeeded();
    const box = (await circle.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(doc);
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual(selection);
    await page.mouse.up();
    await expect(page.locator(`#primary [data-node-id="${id}"]`)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`#primary [data-node-id="${side === 'root' ? 'one' : 'hidden'}"]`)).toBeVisible();
    await expect(page.locator('#primary textarea')).toHaveCount(0);
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual(selection);
    await expect(page.locator('#primary .mindmap')).toBeFocused();
    if (side === 'right') await page.evaluate(() => window.primary.setZoom(1));
    if (side === 'right') await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-expanded-${info.project.name}.png` });
    await page.keyboard.press('ControlOrMeta+z');
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(doc);
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    writeFileSync(`${evidence}/${phase}-marker-${side}-${info.project.name}.json`, JSON.stringify({ side, zoom: 2, selection, restoredDocument: doc }, null, 2) + '\n');
});

test('marker drag/cancel and read-only marker/checkbox gestures do not mutate or select', async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    const snapshot = () => page.evaluate(() => ({ document: window.primary.getDocument(), selection: window.primary.getSelection(), viewport: window.primary.getViewport(), undo: window.primary.canUndo() }));
    const before = await snapshot();
    let box = (await page.locator('#primary circle').boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 15, y + 15); await page.mouse.up();
    expect(await snapshot()).toEqual(before);
    await page.mouse.move(x, y); await page.mouse.down();
    await page.locator('#primary .mindmap').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' }); await page.mouse.up();
    expect(await snapshot()).toEqual(before);
    await page.goto('/?readonly'); await page.evaluate(() => document.fonts.ready);
    const readonly = await snapshot(); box = (await page.locator('#primary circle').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await snapshot()).toEqual(readonly);
    await page.evaluate(doc => { window.primary.setDocument(doc); window.primary.setSelection(['multi']); window.primary.focus(); }, geometryMap());
    const checkbox = await snapshot(); await page.keyboard.press('Control+Space'); expect(await snapshot()).toEqual(checkbox);
});
