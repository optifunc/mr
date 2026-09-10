import { expect, type Page } from '@playwright/test';

export async function profileWheel(page: Page, kind: 'pan' | 'zoom', count: number) {
    const platform = await page.evaluate(() => navigator.platform);
    const modifier = /Mac|iPhone|iPad/.test(platform) ? 'Meta' : 'Control';
    const transitions = [];
    if (kind === 'zoom') await page.keyboard.down(modifier);
    try {
        for (let i = 0; i < count; i++) {
            const delta = (i % 2 ? 1 : -1) * (kind === 'pan' ? 10 : 5);
            const before = await page.evaluate(() => window.primary.getViewport());
            await page.mouse.wheel(0, delta);
            await page.waitForTimeout(20);
            // Check each event: the alternating gesture ends near its starting view.
            await expect.poll(async () => {
                const after = await page.evaluate(() => window.primary.getViewport());
                return kind === 'pan' ? after.y !== before.y : after.zoom !== before.zoom;
            }).toBe(true);
            const after = await page.evaluate(() => window.primary.getViewport());
            if (kind === 'pan') {
                expect(after.zoom).toBe(before.zoom); expect(after.x).toBe(before.x);
                expect(Math.sign(after.y - before.y)).toBe(-Math.sign(delta));
            } else expect(Math.sign(after.zoom - before.zoom)).toBe(-Math.sign(delta));
            transitions.push({ before, after, delta });
        }
    } finally { if (kind === 'zoom') await page.keyboard.up(modifier); }
    return { platform, modifier: kind === 'zoom' ? modifier : null, transitions };
}
