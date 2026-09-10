import { expect, test } from '@playwright/test';
import { profileWheel } from './helpers/profile-input';

for (const platform of ['MacIntel', 'Win32', 'Linux x86_64']) test(`profiler measures pan and zoom on ${platform}`, async ({ page }) => {
    await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { get: () => platform }), platform);
    await page.goto('/examples/performance/');
    await page.locator('.mindmap').hover();
    const pan = await profileWheel(page, 'pan', 2);
    const zoom = await profileWheel(page, 'zoom', 2);
    expect(pan.platform).toBe(platform);
    expect(zoom.modifier).toBe(platform === 'MacIntel' ? 'Meta' : 'Control');
    expect(zoom.transitions).toHaveLength(2);
});
