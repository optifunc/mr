import { expect, test } from '@playwright/test';
test('invalid explicit edit, insertion and link targets reject before changing an active buffer', async ({ page }) => {
    await page.goto('/'); await page.evaluate(() => window.primary.editNode('one'));
    await page.locator('#primary textarea').fill('Uncommitted');
    const result = await page.evaluate(() => {
        const a = window.primary, before = a.getDocument(), errors: string[] = [], changes: string[] = [];
        a.on('error', e => errors.push(e.code)); a.on('documentchange', e => changes.push(e.command ?? 'replacement'));
        const commands = [
            ...(['edit', 'insertChild', 'openLink'] as const).map(type => ({ type, targetId: 'missing' })),
            { type: 'setText' as const, targetId: 'missing', text: 'bad' },
            { type: 'delete' as const, ids: ['missing'] },
            { type: 'move' as const, ids: ['one'], destination: { targetId: 'missing', position: 'child' as const } },
            { type: 'copy' as const, ids: ['missing'] },
        ];
        const results = commands.map(command => [a.canExecute(command), a.execute(command)]);
        return { results, errors, changes, before, after: a.getDocument(), undo: a.canUndo() };
    });
    expect(result.results).toEqual(Array.from({ length: 7 }, () => [false, false]));
    expect(result.errors).toEqual(Array(7).fill('INVALID_TARGET')); expect(result.changes).toEqual([]);
    expect(result.after).toEqual(result.before); expect(result.undo).toBe(false);
    await expect(page.locator('#primary textarea')).toHaveValue('Uncommitted'); await expect(page.locator('#primary textarea')).toBeFocused();
});
test('menu reentrant replacement and throwing ID callback preserve atomicity and cleanup', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
        const a = window.primary;
        a.on('selectionchange', () => a.setDocument({ root: { id: 'new-root', text: 'Replaced by listener', children: [] } }));
    });
    await page.locator('#primary [data-node-id="two"]').click({ button: 'right' });
    await expect(page.locator('#primary [role="menu"]')).toHaveCount(0);
    await expect(page.locator('#primary [data-node-id="new-root"]')).toBeVisible();
    await page.goto('/');
    // Exercise the configured callback path in an isolated host.
    await page.evaluate(async () => {
        const { MindMapEditor } = await import(/* @vite-ignore */ '/src/' + 'index.ts');
        window.primary.destroy();
        window.primary = new MindMapEditor(document.querySelector('#primary')!, { document: { root: { id: 'root', text: 'Callback test', children: [] } }, createNodeId: () => { throw Error('host'); } });
        window.primary.on('error', e => { document.body.dataset.error = e.code; }); window.primary.focus();
    });
    await page.keyboard.press('Shift+F10'); await page.locator('#primary').getByRole('menuitem', { name: 'Add child', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-error', 'HOST_CALLBACK');
    await expect(page.locator('#primary [role="treeitem"]')).toHaveCount(1);
    await expect(page.locator('#primary textarea, #primary [role="menu"]')).toHaveCount(0);
    await expect(page.locator('#primary .mindmap')).toBeFocused();
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
test('opening a menu immediately after mounting survives the initial resize notification', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const { MindMapEditor } = await import(/* @vite-ignore */ '/src/' + 'index.ts');
        window.primary.destroy();
        const host = document.querySelector('#primary')!;
        window.primary = new MindMapEditor(host, { document: { root: { id: 'root', text: 'Immediate menu', children: [] } } });
        window.primary.focus();
        host.querySelector('.mindmap')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
    });
    await page.waitForTimeout(150);
    await expect(page.locator('#primary [role="menu"]')).toBeVisible();
    await expect(page.locator('#primary').getByRole('menuitem', { name: 'Edit', exact: true })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(page.locator('#primary .mindmap')).toBeFocused();
});
test('keyboard menu reveal reports user origin and default label/menu contrast is readable', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        window.primary.panTo(-5000, -5000);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        window.primary.on('viewportchange', event => { document.body.dataset.revealOrigin = event.origin; });
        window.primary.focus();
    });
    await page.keyboard.press('Shift+F10');
    await expect(page.locator('body')).toHaveAttribute('data-reveal-origin', 'user');
    const colors = await page.locator('#primary .mindmap').evaluate(tree => {
        const contrast = (a: string, b: string): number => {
            const luminance = (color: string): number => {
                const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
                return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
            };
            const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
        };
        const style = getComputedStyle(tree), selected = getComputedStyle(tree.querySelector('.mindmap-selected')!),
            menu = getComputedStyle(tree.querySelector('[role="menu"]')!), disabled = getComputedStyle(tree.querySelector('[aria-disabled="true"]')!);
        return { text: contrast(style.color, style.backgroundColor), selection: contrast(style.color, selected.backgroundColor), menu: contrast(menu.color, menu.backgroundColor), disabled: contrast(disabled.color, menu.backgroundColor) };
    });
    for (const ratio of Object.values(colors)) expect(ratio).toBeGreaterThanOrEqual(4.5);
});
