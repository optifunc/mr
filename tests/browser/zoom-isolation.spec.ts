import { expect, test } from '@playwright/test';

for (const platform of ['Win32', 'MacIntel']) {
    const primary = platform === 'MacIntel' ? 'Meta' : 'Control';
    test.describe(`zoom event ownership on ${platform}`, () => {
        test.beforeEach(async ({ page }) => {
            await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { value: platform }), platform);
            await page.goto('/');
            await page.evaluate(async () => {
                await document.fonts.ready;
                const escaped: string[] = [];
                Object.assign(window, { escaped });
                document.addEventListener('keydown', e => {
                    if ((e.ctrlKey || e.metaKey) && !['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) escaped.push(`key:${e.key}`);
                });
                window.addEventListener('wheel', () => escaped.push('wheel'));
                window.primary.setZoom(1); window.primary.focus();
            });
        });

        test('zoom/reset/fit and clamped no-ops do not reach host handlers or affect another map', async ({ page }) => {
            const before = await page.evaluate(() => ({ doc: window.primary.getDocument(), other: window.secondary.getViewport() }));
            for (const key of ['=', 'Shift+=', 'NumpadAdd']) {
                await page.keyboard.press(`${primary}+${key}`);
            }
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBeCloseTo(1.2 ** 3);
            await page.keyboard.press(`${primary}+-`);
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBeCloseTo(1.2 ** 2);
            await page.keyboard.press(`${primary}+0`);
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1);
            await page.keyboard.press(`${primary}+0`); // Already reset is still owned.
            const fit = await page.evaluate(() => { window.primary.fit(); const v = window.primary.getViewport(); window.primary.setZoom(.25); return v; });
            await page.keyboard.press(`${primary}+Shift+Digit0`);
            expect(await page.evaluate(() => window.primary.getViewport())).toEqual(fit);
            await page.evaluate(() => window.primary.setZoom(4));
            await page.keyboard.press(`${primary}+=`);
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(4);
            await page.evaluate(() => window.primary.setZoom(.25));
            await page.keyboard.press(`${primary}+-`);
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(.25);
            expect(await page.evaluate(() => (window as unknown as { escaped: string[] }).escaped)).toEqual([]);
            expect(await page.evaluate(() => ({ doc: window.primary.getDocument(), other: window.secondary.getViewport() }))).toEqual(before);
            expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
            await page.keyboard.press(`${primary}+k`);
            expect(await page.evaluate(() => (window as unknown as { escaped: string[] }).escaped)).toEqual(['key:k']);
        });

        test('pointer zoom and wheel panning stay inside the canvas; outside input still bubbles', async ({ page }) => {
            await page.locator('#primary .mindmap').hover({ position: { x: 20, y: 20 } });
            await page.keyboard.down(primary); await page.mouse.wheel(0, -100); await page.keyboard.up(primary);
            await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).toBeCloseTo(1.01);
            const view = await page.evaluate(() => window.primary.getViewport());
            await page.mouse.wheel(0, 50);
            await expect.poll(() => page.evaluate(() => window.primary.getViewport().y)).toBeCloseTo(view.y - 50);
            await page.keyboard.down('Shift'); await page.mouse.wheel(0, 40); await page.keyboard.up('Shift');
            await expect.poll(() => page.evaluate(() => window.primary.getViewport().x)).toBeCloseTo(view.x - 40);
            expect(await page.evaluate(() => (window as unknown as { escaped: string[] }).escaped)).toEqual([]);
            await page.evaluate(() => { const input = document.createElement('input'); input.id = 'outside-zoom'; input.style.cssText = 'position:fixed;top:0;left:0;z-index:9999'; document.body.append(input); });
            await page.locator('#outside-zoom').focus(); await page.keyboard.press(`${primary}+=`);
            await page.locator('#outside-zoom').hover(); await page.mouse.wheel(0, 30);
            await expect.poll(() => page.evaluate(() => (window as unknown as { escaped: string[] }).escaped)).toEqual(['key:=', 'wheel']);
        });

        test('read-only maps still own zoom without editing their document', async ({ page }) => {
            await page.goto('/?readonly');
            await page.evaluate(async () => {
                await document.fonts.ready; window.primary.focus();
                Object.assign(window, { escaped: [] });
                document.addEventListener('keydown', e => { if (e.key === '=') (window as unknown as { escaped: string[] }).escaped.push('zoom'); });
                window.addEventListener('wheel', () => (window as unknown as { escaped: string[] }).escaped.push('wheel'));
            });
            const before = await page.evaluate(() => window.primary.getDocument());
            await page.keyboard.press(`${primary}+=`);
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1.2);
            await page.locator('#primary .mindmap').hover({ position: { x: 20, y: 20 } });
            await page.keyboard.down(primary); await page.mouse.wheel(0, -100); await page.keyboard.up(primary);
            await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).toBeGreaterThan(1.2);
            expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before);
            expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
            expect(await page.evaluate(() => (window as unknown as { escaped: string[] }).escaped)).toEqual([]);
        });

        test('inline text editing and menu navigation retain their existing input routing', async ({ page }) => {
            await page.evaluate(() => { window.primary.setSelection(['root']); window.primary.focus(); });
            await page.keyboard.press('F2');
            const editor = page.locator('#primary textarea'); await editor.fill('Uncommitted label');
            await page.keyboard.press(`${primary}+=`);
            expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1);
            await expect(editor).toHaveValue('Uncommitted label');
            expect(await page.evaluate(() => (window as unknown as { escaped: string[] }).escaped)).toEqual(['key:=']);
            await page.keyboard.press('Escape'); await expect(editor).toHaveCount(0);
            await page.keyboard.press('Shift+F10');
            await expect(page.locator('#primary [role=menu]')).toBeVisible();
            await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
            await expect(page.locator('#primary [role=menu]')).toHaveCount(0);
            await expect(page.locator('#primary .mindmap')).toBeFocused();
        });
    });
}
