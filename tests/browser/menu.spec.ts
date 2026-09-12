import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/stage8';
mkdirSync(evidence, { recursive: true });
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });
for (const opening of ['pointer', 'keyboard']) test(`menu focus highlight waits for arrows after ${opening} opening and resets on reopen`, async ({ page }, info) => {
    const tree = page.locator('#primary .mindmap'), menu = tree.getByRole('menu');
    await page.evaluate(() => window.primary.setSelection(['root']));
    if (opening === 'pointer') await tree.locator('[data-node-id="root"]').click({ button: 'right' });
    else { await tree.focus(); await page.keyboard.press('Shift+F10'); }
    await page.mouse.move(0, 0);
    const edit = menu.getByRole('menuitem', { name: 'Edit', exact: true });
    const child = menu.getByRole('menuitem', { name: 'Add child', exact: true });
    await expect(edit).toBeFocused();
    await expect(edit).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(edit).toHaveCSS('outline-style', 'none');
    await expect(edit.locator('.mindmap-menu-shortcut')).toHaveCSS('color', 'rgb(102, 102, 102)');
    await tree.screenshot({ path: `${evidence}/menu-initial-${opening}-${info.project.name}.png` });
    await child.hover();
    await expect(child).toHaveCSS('background-color', 'rgb(229, 229, 229)');
    await expect(edit).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.mouse.move(0, 0);
    await page.keyboard.press('End');
    const link = menu.getByRole('menuitem', { name: 'Open link', exact: true });
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(link).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Home');
    await expect(edit).toHaveCSS('outline-style', 'none');
    if (opening === 'pointer') {
        await page.keyboard.press('ArrowUp');
        await expect(link).toBeFocused();
        await expect(link).toHaveCSS('outline-style', 'solid');
        await expect(link).toHaveCSS('background-color', 'rgb(229, 229, 229)');
        await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('ArrowDown');
    await expect(child).toBeFocused();
    await expect(child).toHaveCSS('outline-style', 'solid');
    await expect(child).toHaveCSS('background-color', 'rgb(229, 229, 229)');
    await tree.screenshot({ path: `${evidence}/menu-navigated-${opening}-${info.project.name}.png` });
    await page.keyboard.press('Escape'); await expect(tree).toBeFocused();
    await page.keyboard.press('Shift+F10');
    await expect(edit).toBeFocused();
    await expect(edit).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(edit).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Enter'); await expect(tree.locator('textarea')).toBeFocused();
    await page.keyboard.press('Escape'); await expect(tree).toBeFocused();
});
test('keyboard menu traversal, disabled discovery, edit and focus return', async ({ page }, info) => {
    const tree = page.locator('#primary .mindmap'), menu = tree.getByRole('menu');
    await tree.focus(); await page.keyboard.press('Shift+F10');
    await expect(menu.getByRole('menuitem')).toHaveCount(13);
    await expect(menu.getByRole('menuitem', { name: 'Edit', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(menu.getByRole('menuitem', { name: 'Open link' })).toBeFocused();
    await expect(menu.getByRole('menuitem', { name: 'Open link' })).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Enter'); await expect(menu).toBeVisible();
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Add child', exact: true })).toBeFocused();
    await page.keyboard.press('End'); await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Edit', exact: true })).toBeFocused();
    await tree.screenshot({ path: `${evidence}/menu-keyboard-${info.project.name}.png` });
    await page.keyboard.press('Enter'); await expect(tree.locator('textarea')).toBeFocused();
    await tree.locator('textarea').fill('Menu edited'); await page.keyboard.press('Enter');
    await expect(tree).toBeFocused();
    expect(await page.evaluate(() => window.primary.getDocument().root.children.find(n => n.id === 'one')!.text)).toBe('Menu edited');
    await page.evaluate(() => window.primary.undo());
    await page.keyboard.press('ContextMenu'); await expect(menu).toBeVisible();
    await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0); await expect(tree).toBeFocused();
    await page.keyboard.press('Shift+F10'); await page.keyboard.press('Tab'); await expect(tree).toBeFocused();
});
test('right click preserves selected group; unselected node becomes sole selection; pointer commands undo once', async ({ page }) => {
    const tree = page.locator('#primary .mindmap');
    await page.evaluate(() => window.primary.setSelection(['b', 'c'], 'c'));
    await tree.locator('[data-node-id="b"]').click({ button: 'right' });
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['b', 'c'], activeId: 'c' });
    await tree.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    expect(await tree.locator('[data-node-id="b"]').count()).toBe(0);
    await page.evaluate(() => window.primary.undo());
    await expect(tree.locator('[data-node-id="b"]')).toBeVisible();
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    await tree.locator('[data-node-id="two"]').click({ button: 'right' });
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['two'], activeId: 'two' });
    await tree.getByRole('menuitem', { name: 'Add child', exact: true }).click();
    await expect(tree.locator('textarea')).toBeFocused();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.primary.getSelection().ids)).toEqual(['two']);
});
test('root protections, checkbox/collapse applicability and user event origins', async ({ page }) => {
    const tree = page.locator('#primary .mindmap');
    await page.evaluate(() => { window.primary.setSelection(['root']); window.primary.focus(); });
    await page.keyboard.press('Shift+F10');
    for (const name of ['Cut', 'Delete', 'Open link', 'Toggle checked state']) await expect(tree.getByRole('menuitem', { name, exact: true })).toHaveAttribute('aria-disabled', 'true');
    await tree.getByRole('menuitem', { name: 'Add checkbox', exact: true }).click();
    await page.keyboard.press('Shift+F10');
    await expect(tree.getByRole('menuitem', { name: 'Remove checkbox' })).toHaveAttribute('aria-disabled', 'false');
    await tree.getByRole('menuitem', { name: 'Toggle checked state' }).click();
    expect(await page.evaluate(() => window.primary.getDocument().root.checked)).toBe(true);
    await page.keyboard.press('Shift+F10'); await tree.getByRole('menuitem', { name: 'Collapse', exact: true }).click();
    await expect(tree.locator('[data-node-id="root"]')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Shift+F10'); await tree.getByRole('menuitem', { name: 'Expand', exact: true }).click();
    await expect(page.locator('#events')).toContainText('"origin":"user"');
});
test('read-only menu, disabled option, empty selection and native textarea context menu', async ({ page }) => {
    await page.goto('/?readonly');
    const tree = page.locator('#primary .mindmap');
    await tree.focus(); await page.keyboard.press('Shift+F10');
    const states = await tree.getByRole('menuitem').evaluateAll(items => items.map(n => [n.querySelector('.mindmap-menu-label')!.textContent, n.getAttribute('aria-disabled')]));
    expect(states.filter(([, disabled]) => disabled === 'false')).toEqual([['Copy', 'false']]);
    await page.keyboard.press('Home'); await page.keyboard.press('Enter'); await expect(tree.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.primary.setSelection([]); window.primary.focus(); });
    await page.keyboard.press('Shift+F10'); await expect(tree.getByRole('menu')).toHaveCount(0);
    await page.goto('/?no-menu'); await tree.focus(); await page.keyboard.press('Shift+F10');
    await tree.locator('[data-node-id="one"]').click({ button: 'right' }); await expect(tree.getByRole('menu')).toHaveCount(0);
    await page.goto('/'); await page.evaluate(() => window.primary.editNode('one'));
    await page.keyboard.press('Shift+F10'); await expect(tree.getByRole('menu')).toHaveCount(0); await expect(tree.locator('textarea')).toBeFocused();
});
test('bounded scrolling menu under host scaling, outside focus and two-instance isolation', async ({ page }, info) => {
    const tree = page.locator('#primary .mindmap');
    await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>('#primary')!;
        host.style.width = '150px'; host.style.height = '140px'; host.style.transform = 'scale(.8)'; host.style.transformOrigin = 'top left';
        window.primary.setSelection(['root']); window.primary.panTo(130, 120);
    });
    await page.waitForTimeout(100);
    await tree.focus(); await page.keyboard.press('Shift+F10'); await page.keyboard.press('End');
    const bounds = await tree.evaluate(host => { const h = host.getBoundingClientRect(), m = host.querySelector('[role="menu"]')!.getBoundingClientRect(); return { h: h.toJSON(), m: m.toJSON() }; });
    expect(bounds.m.x).toBeGreaterThanOrEqual(bounds.h.x); expect(bounds.m.y).toBeGreaterThanOrEqual(bounds.h.y);
    expect(bounds.m.right).toBeLessThanOrEqual(bounds.h.right + .1); expect(bounds.m.bottom).toBeLessThanOrEqual(bounds.h.bottom + .1);
    expect(await tree.getByRole('menu').evaluate(menu => menu.scrollWidth <= menu.clientWidth)).toBe(true);
    await tree.screenshot({ path: `${evidence}/menu-small-${info.project.name}.png` });
    await page.evaluate(() => { const input = document.createElement('input'); input.id = 'host-input'; document.querySelector('header')!.append(input); });
    await page.locator('#host-input').click(); await expect(tree.getByRole('menu')).toHaveCount(0); await expect(page.locator('#host-input')).toBeFocused();
    await tree.focus(); await page.keyboard.press('Shift+F10');
    await page.locator('#secondary .mindmap').focus(); await page.keyboard.press('Shift+F10');
    await expect(tree.getByRole('menu')).toHaveCount(0); await expect(page.locator('#secondary').getByRole('menu')).toBeVisible();
    writeFileSync(`${evidence}/menu-bounds-${info.project.name}.json`, JSON.stringify(bounds, null, 2) + '\n');
});

for (const platform of ['MacIntel', 'Win32']) test(`menu groups, rounded highlights and aligned shortcuts on ${platform}`, async ({ page }, info) => {
    await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { get: () => platform }), platform);
    await page.goto('/'); await page.evaluate(() => document.fonts.ready);
    const tree = page.locator('#primary .mindmap'), menu = tree.getByRole('menu');
    await tree.locator('[data-node-id="root"]').click({ button: 'right' });
    const groups = [
        ['Edit'], ['Add child', 'Add sibling before', 'Add sibling after', 'Insert parent', 'Delete'],
        ['Cut', 'Copy', 'Paste'], ['Collapse'], ['Add checkbox', 'Toggle checked state'], ['Open link'],
    ];
    expect(await menu.evaluate(menu => {
        const groups: string[][] = [[]];
        for (const child of menu.children) {
            if (child.getAttribute('role') === 'separator') groups.push([]);
            else groups.at(-1)!.push(child.querySelector('.mindmap-menu-label')!.textContent!);
        }
        return groups;
    })).toEqual(groups);
    await expect(menu.getByRole('separator')).toHaveCount(5);
    await expect(menu).toHaveCSS('border-radius', '4px');
    const primary = platform === 'MacIntel' ? '⌘' : 'Ctrl+';
    const hints = ['F2', 'Tab', 'Shift+Enter', 'Enter', 'Shift+Tab', 'Delete', `${primary}X`, `${primary}C`, `${primary}V`, 'Space', `${primary}1`, 'Ctrl+Space', ''];
    const keys = ['F2', 'Tab', 'Shift+Enter', 'Enter', 'Shift+Tab', 'Delete', ...['X', 'C', 'V'].map(k => `${platform === 'MacIntel' ? 'Meta' : 'Control'}+${k}`), 'Space', `${platform === 'MacIntel' ? 'Meta' : 'Control'}+1`, 'Control+Space', null];
    const labels = groups.flat();
    for (let i = 0; i < labels.length; i++) {
        const item = menu.getByRole('menuitem', { name: labels[i]!, exact: true });
        await expect(item).toBeFocused(); // Separators never enter arrow-key traversal.
        await expect(item).toHaveCSS('border-radius', '4px');
        expect(await item.getAttribute('aria-keyshortcuts')).toBe(keys[i]);
        if (hints[i]) {
            await expect(item.locator('.mindmap-menu-shortcut')).toHaveText(hints[i]!);
            await expect(item.locator('.mindmap-menu-shortcut')).toHaveAttribute('aria-hidden', 'true');
        } else await expect(item.locator('.mindmap-menu-shortcut')).toHaveCount(0);
        await page.keyboard.press('ArrowDown');
    }
    const geometry = await menu.locator('.mindmap-menu-shortcut').evaluateAll(hints => hints.map(hint => ({
        right: hint.getBoundingClientRect().right,
        gap: hint.getBoundingClientRect().left - hint.previousElementSibling!.getBoundingClientRect().right,
    })));
    expect(Math.max(...geometry.map(g => g.right)) - Math.min(...geometry.map(g => g.right))).toBeLessThan(.1);
    for (const { gap } of geometry) expect(gap).toBeGreaterThanOrEqual(11.9);
    const disabled = menu.getByRole('menuitem', { name: 'Delete', exact: true });
    await expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await expect(disabled).toHaveCSS('color', 'rgb(117, 117, 117)');
    await expect(disabled.locator('.mindmap-menu-shortcut')).toHaveCSS('color', 'rgb(136, 136, 136)');
    await menu.getByRole('menuitem', { name: 'Add child', exact: true }).hover();
    await expect(menu.getByRole('menuitem', { name: 'Add child', exact: true })).toHaveCSS('background-color', 'rgb(229, 229, 229)');
    await tree.screenshot({ path: `${evidence}/menu-${platform}-${info.project.name}.png` });
    await page.keyboard.press('Escape'); await expect(tree).toBeFocused();
});
test('replacement, invalid replacement, resize, API editing and destruction clean up menu', async ({ page }) => {
    const tree = page.locator('#primary .mindmap');
    for (const action of ['invalid', 'replace', 'selection', 'edit', 'resize', 'destroy']) {
        await tree.focus(); await page.keyboard.press('Shift+F10'); await expect(tree.getByRole('menu')).toBeVisible();
        await page.evaluate(action => {
            if (action === 'invalid') window.primary.setDocument({ root: { id: '', text: '', children: [] } });
            if (action === 'replace') window.primary.setDocument(window.primary.getDocument());
            if (action === 'selection') window.primary.setSelection(['one']);
            if (action === 'edit') window.primary.editNode('one');
            if (action === 'resize') document.querySelector<HTMLElement>('#primary')!.style.height = '180px';
            if (action === 'destroy') { window.primary.destroy(); window.primary.destroy(); }
        }, action);
        if (action === 'invalid') { await expect(tree.getByRole('menu')).toBeVisible(); await page.keyboard.press('Escape'); }
        else await expect(tree.getByRole('menu')).toHaveCount(0);
        if (action === 'edit') { await expect(tree.locator('textarea')).toBeFocused(); await page.keyboard.press('Escape'); }
    }
    await page.locator('#secondary .mindmap').focus(); await page.keyboard.press('Shift+F10');
    await expect(page.locator('#secondary').getByRole('menu')).toBeVisible();
});
test('menu clipboard and protected link use shared completion and policy path', async ({ page }) => {
    await page.locator('#clipboard-fixture').click();
    await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {}, readText: async () => 'Pasted\n    Child\n' } });
        window.primary.on('linkopen', e => e.preventDefault());
    });
    const tree = page.locator('#primary .mindmap');
    await tree.locator('[data-node-id="mixed"]').click({ button: 'right' }); await tree.getByRole('menuitem', { name: 'Copy', exact: true }).click();
    await expect(page.locator('#events')).toContainText('commandcomplete {"command":"copy","origin":"user"');
    await tree.locator('[data-node-id="destination"]').click({ button: 'right' }); await tree.getByRole('menuitem', { name: 'Paste', exact: true }).click();
    await expect(tree.getByText('Pasted', { exact: true })).toBeVisible();
    await page.evaluate(() => window.primary.undo()); await expect(tree.getByText('Pasted', { exact: true })).toHaveCount(0);
    await tree.locator('[data-node-id="url"]').click({ button: 'right' }); await tree.getByRole('menuitem', { name: 'Open link' }).click();
    await expect(page.locator('#events')).toContainText('linkopen'); await expect(tree).toBeFocused();
});
test('accessible hierarchy, selection, checkboxes and viewport/link event origins', async ({ page }, info) => {
    const tree = page.locator('#secondary .mindmap');
    await expect(tree).toHaveAttribute('aria-multiselectable', 'true');
    const snapshot = await tree.ariaSnapshot();
    expect(snapshot).toContain('group:'); expect(snapshot).toContain('[selected]');
    await expect(tree.locator('[data-node-id="checked"]')).toHaveAttribute('aria-checked', 'true');
    const ownership = await tree.locator('[data-node-id="root"]').getAttribute('aria-owns');
    await expect(tree.locator(`[id="${ownership}"]`)).toHaveAttribute('role', 'group');
    writeFileSync(`${evidence}/accessibility-${info.project.name}.yml`, snapshot + '\n');
    await page.evaluate(() => { window.primary.on('viewportchange', e => { document.body.dataset.viewOrigin = e.origin; }); });
    await page.locator('#primary .mindmap').focus(); await page.keyboard.press('Meta+-');
    await expect(page.locator('body')).toHaveAttribute('data-view-origin', 'user');
    await page.evaluate(() => window.primary.setZoom(1.5)); await expect(page.locator('body')).toHaveAttribute('data-view-origin', 'api');
    await page.locator('#clipboard-fixture').click();
    await page.evaluate(() => { window.primary.on('linkopen', e => { document.body.dataset.linkOrigin = e.origin; e.preventDefault(); }); });
    await page.locator('#primary [data-node-id="url"]').click({ button: 'right' });
    await page.locator('#primary').getByRole('menuitem', { name: 'Open link' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-link-origin', 'user');
    await page.evaluate(() => window.primary.execute({ type: 'openLink', targetId: 'url' }));
    await expect(page.locator('body')).toHaveAttribute('data-link-origin', 'api');
});
