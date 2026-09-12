import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { referenceMap } from '../fixtures/maps';

const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/delete-selection';

for (const platform of ['MacIntel', 'Win32']) {
    test(`repeated keyboard deletion selects siblings then parent and retains focus on ${platform}`, async ({ page }, info) => {
        await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { get: () => platform }), platform);
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        const tree = page.locator('#primary .mindmap');
        await page.locator('#primary [data-node-id="b"] .mindmap-label').click();
        const primary = platform === 'MacIntel' ? 'Meta' : 'Control';
        for (const [deleted, next] of [['b', 'c'], ['c', 'a'], ['a', 'one']]) {
            await page.keyboard.press('Delete');
            await expect(page.locator(`#primary [data-node-id="${deleted}"]`)).toHaveCount(0);
            expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: [next], activeId: next });
            await expect(tree).toBeFocused();
            await expect(page.locator(`#primary [data-node-id="${next}"]`)).toHaveAttribute('aria-selected', 'true');
            if (deleted === 'b' && platform === 'MacIntel') {
                mkdirSync(evidence, { recursive: true });
                await page.locator('#primary').screenshot({ path: `${evidence}/next-sibling-${info.project.name}.png` });
                writeFileSync(`${evidence}/environment-${info.project.name}.json`, JSON.stringify({ browser: info.project.name, version: page.context().browser()!.version(), os: process.platform, platform, viewport: page.viewportSize(), deviceScaleFactor: 1 }, null, 2) + '\n');
            }
            await page.keyboard.press(`${primary}+z`);
            expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe(deleted);
            await page.keyboard.press(`${primary}+Shift+z`);
            expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe(next);
            await expect(tree).toBeFocused();
        }
        for (let i = 0; i < 3; i++) await page.keyboard.press(`${primary}+z`);
        expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
        expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    });
}

test('pointer menu deletion selects next sibling and returns keyboard focus', async ({ page }) => {
    await page.goto('/');
    await page.locator('#primary [data-node-id="one"] .mindmap-label').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['two'], activeId: 'two' });
    await expect(page.locator('#primary .mindmap')).toBeFocused();
    await page.keyboard.press('Delete');
    expect(await page.evaluate(() => window.primary.getSelection().activeId)).toBe('three');
});
