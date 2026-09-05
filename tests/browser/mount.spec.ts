import { expect, test } from '@playwright/test';
test('two mounts own their DOM, focus, and teardown', async ({ page }, info) => {
  await page.goto('/'); await expect(page.getByRole('tree')).toHaveCount(2);
  await page.keyboard.press('Tab'); await expect(page.getByRole('tree').first()).toBeFocused();
  await page.screenshot({ path: `docs/evidence/milestone-a/stage1-${info.project.name}.png` });
  await page.evaluate(() => { (window as unknown as { primary: { destroy(): void } }).primary.destroy(); });
  await expect(page.getByRole('tree')).toHaveCount(1);
});
