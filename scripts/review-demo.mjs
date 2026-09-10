import { chromium, firefox, webkit, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/demo'; mkdirSync(evidence, { recursive: true });
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto('http://127.0.0.1:5173/');
        await expect(page.getByRole('tree')).toHaveCount(5);
        await page.getByRole('button', { name: 'Inspect document snapshot' }).click();
        await expect(page.locator('#snapshot')).toContainText('New Mindmap');
        await expect(page.locator('#snapshot')).toBeVisible();
        const before = await page.evaluate(() => window.primary.getDocument());
        await page.getByRole('button', { name: 'Try invalid replacement' }).click();
        expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before);
        await expect(page.locator('#events')).toContainText('INVALID_DOCUMENT');
        const links = await page.locator('a').evaluateAll(links => [...new Set(links.map(a => a.href))]);
        const statuses = [];
        for (const url of links) { const response = await page.request.get(url); expect(response.ok(), url).toBe(true); statuses.push({ url, status: response.status() }); }
        await page.getByRole('heading', { name: 'Menus and host integration' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/review-${name}.png` });
        await page.goto('http://127.0.0.1:5173/examples/consumer/');
        await expect(page.getByRole('tree')).toHaveCount(2);
        await page.getByRole('button', { name: 'Destroy first map' }).click(); await expect(page.getByRole('tree')).toHaveCount(1);
        await page.getByRole('button', { name: 'Mount again' }).click(); await expect(page.getByRole('tree')).toHaveCount(2);
        expect(errors).toEqual([]);
        results.push({ browser: name, version: browser.version(), passed: true, statuses, errors });
    } finally { await browser.close(); }
}
writeFileSync(`${evidence}/smoke.json`, JSON.stringify({ date: new Date().toISOString(), results }, null, 2) + '\n');
console.log('Review demo and evidence links passed in all 3 engines.');
