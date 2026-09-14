import { test, expect, type Page } from '@playwright/test';

const node = (page: Page) => page.locator('#primary [data-node-id="a"]');
const tip = (page: Page) => page.locator('#primary [role="tooltip"]');
async function setup(page: Page, platform = 'MacIntel') {
    await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { value: platform }), platform);
    await page.clock.install();
    await page.goto('/');
    await page.evaluate(async () => { await document.fonts.ready; window.primary.execute({ type: 'setText', targetId: 'a', text: 'https://example.com' }); });
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.mouse.move(0, 0);
}

for (const platform of ['MacIntel', 'Win32', 'Linux x86_64']) {
    test(`one-second link hint resets on every entry on ${platform}`, async ({ page }) => {
        await setup(page, platform);
        const label = node(page).locator('.mindmap-label');
        await expect(label).not.toHaveAttribute('title');
        for (let entry = 0; entry < 3; entry++) {
            await node(page).hover();
            await page.clock.runFor(999); await expect(tip(page)).toBeHidden();
            await page.clock.runFor(1); await expect(tip(page)).toBeVisible();
            await expect(tip(page)).toHaveText(`${platform === 'MacIntel' ? 'Cmd' : 'Ctrl'}+click to open`);
            await expect(node(page)).toHaveAttribute('aria-describedby', await tip(page).getAttribute('id') as string);
            await page.mouse.move(0, 0); await expect(tip(page)).toBeHidden();
            await expect(node(page)).not.toHaveAttribute('aria-describedby');
        }
    });
}

test('early exit cancels the timer; movement inside the same node does not restart it', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => window.primary.execute({ type: 'addCheckbox', ids: ['a'] }));
    await node(page).locator('.mindmap-label').hover();await page.clock.runFor(500);
    await page.mouse.move(0, 0);await page.clock.runFor(1000);await expect(tip(page)).toBeHidden();
    await node(page).locator('.mindmap-label').hover();await page.clock.runFor(500);
    await node(page).locator('input').hover();await page.clock.runFor(499);await expect(tip(page)).toBeHidden();
    await page.clock.runFor(1);await expect(tip(page)).toBeVisible();
});

for (const action of ['edit', 'plain text', 'replace', 'zoom', 'destroy'] as const) {
    test(`${action} cancels a pending or visible hint`, async ({ page }) => {
        await setup(page);
        for (const elapsed of [500, 1000]) {
            await node(page).hover();await page.clock.runFor(elapsed);
            await page.evaluate(action => {
                if (action === 'edit') window.primary.editNode('a');
                if (action === 'plain text') window.primary.execute({ type: 'setText', targetId: 'a', text: 'Plain label' });
                if (action === 'replace') window.primary.setDocument(window.primary.getDocument());
                if (action === 'zoom') window.primary.setZoom(1.2);
                if (action === 'destroy') window.primary.destroy();
            }, action);
            await page.clock.runFor(2500);await expect(tip(page)).toBeHidden();
            if (action === 'destroy') break;
            if (action === 'edit') await page.keyboard.press('Escape');
            await page.mouse.move(0, 0);
            await page.evaluate(() => { window.primary.execute({ type: 'setText', targetId: 'a', text: 'https://example.com' });window.primary.setZoom(1); });
        }
    });
}

test('hint does not block modifier-click and stays inside the unscaled viewport', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => {
        window.primary.setZoom(2);
        window.primary.on('linkopen', e => { e.preventDefault();document.body.dataset.opened = e.url; });
    });
    await node(page).locator('.mindmap-label').hover();await page.clock.runFor(1000);
    await expect(tip(page)).toBeVisible();
    const outer = (await page.locator('#primary .mindmap').boundingBox())!, hint = (await tip(page).boundingBox())!;
    expect(hint.x).toBeGreaterThanOrEqual(outer.x);expect(hint.y).toBeGreaterThanOrEqual(outer.y);
    expect(hint.x + hint.width).toBeLessThanOrEqual(outer.x + outer.width);
    expect(hint.y + hint.height).toBeLessThanOrEqual(outer.y + outer.height);
    expect(await tip(page).evaluate(e => getComputedStyle(e).fontSize)).toBe('12px');
    await node(page).locator('.mindmap-label').click({ modifiers: ['Meta'] });
    await expect(page.locator('body')).toHaveAttribute('data-opened', 'https://example.com/');
    await expect(tip(page)).toBeHidden();
});
