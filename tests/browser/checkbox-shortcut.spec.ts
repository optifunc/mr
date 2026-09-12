import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { referenceMap } from '../fixtures/maps';

const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/checkbox-shortcut';

for (const platform of ['MacIntel', 'Win32']) test.describe(platform, () => {
    const modifier = platform === 'MacIntel' ? 'Meta' : 'Control';
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { get: () => platform }), platform);
    });

    test(`checkbox shortcut matches active menu action on mixed selection, with history and focus on ${platform}`, async ({ page }, info) => {
        await page.goto('/');
        await page.evaluate(() => {
            const doc = window.primary.getDocument();
            doc.root.children.find(n => n.id === 'one')!.checked = true;
            window.primary.setDocument(doc);
            window.primary.setSelection(['one', 'two'], 'two'); window.primary.focus();
        });
        const before = await page.evaluate(() => window.primary.getDocument());
        const states = () => page.evaluate(() => window.primary.getDocument().root.children.filter(n => ['one', 'two'].includes(n.id)).map(n => n.checked ?? null));
        const tree = page.locator('#primary .mindmap');
        await page.keyboard.press(`${modifier}+1`);
        expect(await states()).toEqual([true, false]);
        expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['one', 'two'], activeId: 'two' });
        await expect(tree).toBeFocused();
        await expect(page.locator('#events')).toContainText('"command":"addCheckbox"');
        await expect(page.locator('#events')).toContainText('"origin":"user"');
        await page.keyboard.press(`${modifier}+z`);
        expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before);
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        await page.keyboard.press(`${modifier}+Shift+z`);
        expect(await states()).toEqual([true, false]);
        await page.keyboard.press('Shift+F10');
        const item = tree.getByRole('menuitem', { name: 'Remove checkbox', exact: true });
        await expect(item.locator('.mindmap-menu-shortcut')).toHaveText(platform === 'MacIntel' ? '⌘1' : 'Ctrl+1');
        await expect(item).toHaveAttribute('aria-keyshortcuts', `${modifier}+1`);
        mkdirSync(evidence, { recursive: true });
        await tree.screenshot({ path: `${evidence}/remove-${platform}-${info.project.name}.png` });
        await page.keyboard.press('Escape');
        await page.keyboard.press(`${modifier}+1`);
        expect(await states()).toEqual([null, null]);
        await page.keyboard.press(`${modifier}+z`);
        expect(await states()).toEqual([true, false]);
        // A checked active node chooses Remove even when another selected node has none.
        await page.evaluate(() => {
            window.primary.execute({ type: 'removeCheckbox', ids: ['two'] });
            window.primary.setSelection(['one', 'two'], 'one');
        });
        await page.keyboard.press(`${modifier}+1`);
        expect(await states()).toEqual([null, null]);
        await expect(tree).toBeFocused();
    });

    test(`checkbox shortcut respects editing, empty selection, root and instance isolation on ${platform}`, async ({ page }) => {
        await page.goto('/');
        const other = await page.evaluate(() => window.secondary.getDocument());
        await page.evaluate(() => { window.primary.setSelection([]); window.primary.focus(); });
        await page.keyboard.press(`${modifier}+1`);
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        await page.evaluate(() => { window.primary.setSelection(['root']); window.primary.focus(); });
        await page.keyboard.press(`${modifier}+Alt+1`);
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        await page.keyboard.press(`${modifier}+1`);
        expect(await page.evaluate(() => window.primary.getDocument().root.checked)).toBe(false);
        await page.keyboard.press('Control+Space');
        expect(await page.evaluate(() => window.primary.getDocument().root.checked)).toBe(true);
        await page.keyboard.press('F2');
        const area = page.locator('#primary textarea');
        await area.fill('Uncommitted');
        const before = await page.evaluate(() => window.primary.getDocument());
        await page.keyboard.press(`${modifier}+1`);
        await expect(area).toBeFocused(); await expect(area).toHaveValue('Uncommitted');
        expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before);
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => window.secondary.getDocument())).toEqual(other);
    });

    test(`read-only checkbox shortcut is a silent no-op on ${platform}`, async ({ page }) => {
        await page.goto('/?readonly');
        await page.evaluate(() => { window.primary.setSelection(['one']); window.primary.focus(); });
        await page.keyboard.press(`${modifier}+1`);
        expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
        await expect(page.locator('#primary .mindmap')).toBeFocused();
        await page.keyboard.press('Shift+F10');
        const item = page.getByRole('menuitem', { name: 'Add checkbox', exact: true });
        await expect(item).toHaveAttribute('aria-disabled', 'true');
        await expect(item.locator('.mindmap-menu-shortcut')).toHaveText(platform === 'MacIntel' ? '⌘1' : 'Ctrl+1');
    });
});
