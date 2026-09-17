import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const { MindMapEditor, ContextMenu } = await import(/* @vite-ignore */ '/src/' + 'index.ts') as typeof import('../../src');
        const map = window.primary.getDocument(); window.primary.destroy();
        const pane = document.querySelector<HTMLElement>('#primary')!;
        pane.style.position = 'relative'; pane.tabIndex = -1;
        const editorHost = document.createElement('div'); editorHost.style.height = '100%'; pane.append(editorHost);
        const menu = new ContextMenu(pane, command => window.primary.canExecute(command), command => { window.primary.execute(command); });
        window.primary = new MindMapEditor(editorHost, { document: map, onContextMenu: request => {
            const rect = pane.getBoundingClientRect();
            document.body.dataset.menuSelection = JSON.stringify(request.selection);
            menu.open([...request.items, { label: 'Hide UI', separatorBefore: true,
                canExecute: () => document.body.dataset.hostDisabled !== 'true',
                action: () => { document.body.dataset.hiddenUi = 'true'; },
            }], request.clientX - rect.left, request.clientY - rect.top,
            { returnFocus: () => window.primary.focus() });
            return restoreFocus => menu.close(restoreFocus);
        } });
        window.primary.setSelection(['b', 'c'], 'c');
    });
});

test('host-mounted context menu preserves group/active target and handles blank or empty canvas', async ({ page }) => {
    const pane = page.locator('#primary'), tree = pane.getByRole('tree');
    await tree.locator('[data-node-id="b"]').click({ button: 'right' });
    await expect(tree.getByRole('menu')).toHaveCount(0);
    await expect(pane.getByRole('menuitem')).toHaveCount(14);
    await expect(pane.getByRole('menu')).toHaveCSS('position', 'absolute');
    await expect(pane.getByRole('menu')).toHaveCSS('font-size', '12px');
    const bounds = await pane.evaluate(pane => ({ host: pane.getBoundingClientRect().toJSON(), menu: pane.querySelector('[role="menu"]')!.getBoundingClientRect().toJSON() }));
    expect(bounds.menu.left).toBeGreaterThanOrEqual(bounds.host.left);
    expect(bounds.menu.right).toBeLessThanOrEqual(bounds.host.right);
    expect(await page.evaluate(() => JSON.parse(document.body.dataset.menuSelection!))).toEqual({ ids: ['b', 'c'], activeId: 'c' });
    await pane.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await expect(tree.locator('[data-node-id="b"]')).toHaveCount(0);
    await page.evaluate(() => window.primary.undo());
    await tree.locator('[data-node-id="two"]').click({ button: 'right' });
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['two'], activeId: 'two' });
    await page.keyboard.press('Escape'); await expect(tree).toBeFocused();
    await tree.click({ button: 'right', position: { x: 5, y: 5 } });
    await expect(pane.getByRole('menuitem', { name: 'Hide UI' })).toBeVisible();
    expect(await page.evaluate(() => window.primary.getSelection().ids)).toEqual(['two']);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.primary.setSelection([]); window.primary.focus(); });
    await page.keyboard.press('Shift+F10');
    await expect(pane.getByRole('menuitem', { name: 'Edit', exact: true })).toHaveAttribute('aria-disabled', 'true');
    await pane.getByRole('menuitem', { name: 'Hide UI' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-hidden-ui', 'true');
});

test('host actions recheck availability and external focus is retained', async ({ page }) => {
    const pane = page.locator('#primary');
    await pane.getByRole('tree').focus(); await page.keyboard.press('ContextMenu');
    await page.evaluate(() => { document.body.dataset.hostDisabled = 'true'; });
    await pane.getByRole('menuitem', { name: 'Hide UI' }).click();
    await expect(pane.getByRole('menu')).toBeVisible();
    expect(await page.locator('body').getAttribute('data-hidden-ui')).toBeNull();
    await page.locator('#secondary .mindmap').focus();
    await expect(pane.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('#secondary .mindmap')).toBeFocused();
});

for (const change of ['selection', 'document', 'edit', 'viewport', 'resize', 'destroy'])
test(`widget invalidation closes a host menu: ${change}`, async ({ page }) => {
    const pane = page.locator('#primary');
    await pane.getByRole('tree').focus(); await page.keyboard.press('Shift+F10');
    await expect(pane.getByRole('menu')).toBeVisible();
    await page.evaluate(change => {
        if (change === 'selection') window.primary.setSelection(['two']);
        if (change === 'document') window.primary.setDocument(window.primary.getDocument());
        if (change === 'edit') window.primary.editNode('two');
        if (change === 'viewport') window.primary.setZoom(1.1);
        if (change === 'resize') document.querySelector<HTMLElement>('#primary')!.style.height = '220px';
        if (change === 'destroy') window.primary.destroy();
    }, change);
    await expect(pane.getByRole('menu')).toHaveCount(0);
});

test('public menu can live outside an inert editor and return focus to its invoker', async ({ page }) => {
    await page.evaluate(async () => {
        const { ContextMenu, getNodeMenuDescriptors } = await import(/* @vite-ignore */ '/src/' + 'index.ts') as typeof import('../../src');
        const pane = document.querySelector<HTMLElement>('#primary')!;
        const tree = pane.querySelector<HTMLElement>('.mindmap')!; tree.inert = true;
        const trigger = document.createElement('button'); trigger.id = 'host-menu'; trigger.textContent = 'Host menu';
        pane.before(trigger);
        const menu = new ContextMenu(pane, () => false, () => { throw Error('Unavailable editor command'); });
        trigger.onclick = () => menu.open([...getNodeMenuDescriptors(), { label: 'Show UI', canExecute: () => true,
            action: () => { document.body.dataset.restoredUi = 'true'; }, separatorBefore: true,
        }], 0, 0, { returnFocus: trigger });
    });
    await page.locator('#host-menu').click();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Show UI' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-restored-ui', 'true');
    await expect(page.locator('#host-menu')).toBeFocused();
    await page.locator('#host-menu').click(); await page.keyboard.press('Escape');
    await expect(page.locator('#host-menu')).toBeFocused();
});

test('throwing host context handler reports an error and leaves the editor usable', async ({ page }) => {
    await page.evaluate(async () => {
        const { MindMapEditor } = await import(/* @vite-ignore */ '/src/' + 'index.ts') as typeof import('../../src');
        const doc = window.primary.getDocument(); window.primary.destroy();
        window.primary = new MindMapEditor(document.querySelector('#primary')!, { document: doc, onContextMenu: () => { throw Error('host'); } });
        window.primary.on('error', error => { document.body.dataset.error = error.code; }); window.primary.focus();
    });
    await page.keyboard.press('Shift+F10');
    await expect(page.locator('body')).toHaveAttribute('data-error', 'HOST_CALLBACK');
    await page.keyboard.press('F2'); await expect(page.locator('#primary textarea')).toBeFocused();
});
