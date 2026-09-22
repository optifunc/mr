import { expect, test } from '@playwright/test';
import type { MindMapEditor } from '../../src';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await document.fonts.ready;
    const previous = window.primary, Editor = previous.constructor as typeof MindMapEditor;
    const map = previous.getDocument(), host = document.querySelector<HTMLElement>('#primary')!;
    previous.destroy();
    window.primary = new Editor(host, { document: map, zoom: { min: .3575, max: 5.72, default: 1.43 } });
    window.primary.focus();
  });
});

test('custom initial/reset scale, keyboard/wheel limits and API applicability agree', async ({ page }) => {
  const primary = await page.evaluate(() => navigator.platform.includes('Mac') ? 'Meta' : 'Control');
  const before = await page.evaluate(() => window.primary.getDocument());
  expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1.43);
  expect(await page.evaluate(() => window.primary.canExecute({ type: 'resetZoom' }))).toBe(false);
  await page.keyboard.press(`${primary}+=`);
  expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBeCloseTo(1.716);
  await page.keyboard.press(`${primary}+0`);
  expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1.43);
  for (const [zoom, command, key, wheel] of [[5.72, 'zoomIn', '=', -100], [.3575, 'zoomOut', '-', 100]] as const) {
    await page.evaluate(zoom => { window.primary.setZoom(zoom); window.primary.focus(); }, zoom);
    expect(await page.evaluate(type => window.primary.canExecute({ type }), command)).toBe(false);
    await page.keyboard.press(`${primary}+${key}`);
    await page.locator('#primary .mindmap').hover({ position: { x: 20, y: 20 } });
    await page.keyboard.down(primary); await page.mouse.wheel(0, wheel); await page.keyboard.up(primary);
    // Flush wheel delivery before checking the no-op.
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(zoom);
  }
  expect(await page.evaluate(() => window.primary.getDocument())).toEqual(before);
  expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
  expect(await page.evaluate(() => window.secondary.getViewport().zoom)).toBe(1);
});

test('fit honors custom limits, including deferred fitting after a hidden mount', async ({ page }) => {
  for (const [text, expected] of [['x', 5.72], ['W'.repeat(10000), .3575]] as const) {
    await page.evaluate(text => {
      window.primary.setDocument({ root: { id: 'root', text, children: [] } });
      window.primary.fit();
    }, text);
    expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(expected);
  }
  await page.locator('#primary').evaluate(e => { e.style.display = 'none'; });
  await page.evaluate(() => window.primary.fit());
  await page.locator('#primary').evaluate(e => { e.style.display = ''; });
  await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).toBe(.3575);
  expect(await page.evaluate(() => window.primary.canExecute({ type: 'fit' }))).toBe(false);
});

test('the larger default preserves exact node geometry of an ordinary widget zoomed to 143%', async ({ page }) => {
  const boxes = await page.evaluate(() => {
    window.secondary.setDocument(window.primary.getDocument());
    window.secondary.setZoom(1.43);
    // Compare world geometry exactly. Screen-space DOMRects at different page
    // offsets introduce floating-point subtraction noise unrelated to sizing.
    return ['#primary', '#secondary'].map(selector => ({
      nodes: [...document.querySelectorAll<HTMLElement>(`${selector} .mindmap-node`)].map(node => ({
        id: node.dataset.nodeId, left: node.style.left, top: node.style.top,
        width: node.style.width, height: node.style.height,
      })),
      paths: [...document.querySelectorAll(`${selector} .mindmap-lines path`)].map(path => path.getAttribute('d')),
      zoom: selector === '#primary' ? window.primary.getViewport().zoom : window.secondary.getViewport().zoom,
    }));
  });
  expect(boxes[0]).toEqual(boxes[1]);
  await page.keyboard.press('F2');
  await expect(page.locator('#primary textarea')).toBeVisible();
  await page.locator('#primary textarea').fill('Larger default');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.primary.getDocument().root.text)).toBe('Larger default');
  expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1.43);
});
