import { expect, test } from '@playwright/test';
import type { MindMapEditor } from '../../src';

for (const platform of ['Win32', 'MacIntel']) {
    const primary = platform === 'MacIntel' ? 'Meta' : 'Control';
    test.describe(`one-point wheel zoom on ${platform}`, () => {
        test.beforeEach(async ({ page }) => {
            await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { value: platform }), platform);
            await page.goto('/');
            await page.evaluate(async () => {
                await document.fonts.ready;
                const previous = window.primary, Editor = previous.constructor as typeof MindMapEditor;
                const map = previous.getDocument(), host = document.querySelector<HTMLElement>('#primary')!;
                previous.destroy();
                window.primary = new Editor(host, { document: map, zoom: { default: 1.43, min: .3575, max: 5.72 } });
                window.primary.focus();
            });
        });

        test('pixel, line and page events use direction only at any starting zoom, preserving the pointer anchor', async ({ page }) => {
            const results = await page.evaluate(platform => {
                const editor = window.primary, element = document.querySelector<HTMLElement>('#primary .mindmap')!;
                const rect = element.getBoundingClientRect();
                const pointer = { clientX: rect.left + 30, clientY: rect.top + 40 };
                const original = editor.getDocument();
                let escaped = 0, contentEvents = 0;
                document.addEventListener('wheel', () => escaped++);
                editor.on('documentchange', () => contentEvents++);
                const fire = (deltaY: number, deltaMode: number, deltaX = 0) => {
                    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...pointer,
                        ctrlKey: platform === 'Win32', metaKey: platform === 'MacIntel', deltaY, deltaMode, deltaX });
                    element.dispatchEvent(event);
                    return event;
                };
                const checks = [];
                for (const start of [.715, 1.43, 4.29]) {
                    for (const [deltaY, deltaMode] of [[-.1, 0], [-1, 0], [-100, 0], [-120, 0], [-3, 1], [-1, 2]]) {
                        editor.setZoom(start);
                        const before = editor.getViewport();
                        const event = fire(deltaY!, deltaMode!);
                        // Some engines quantize synthetic event coordinates.
                        // Check the anchor actually delivered by the browser.
                        const x = (event.clientX - rect.left) * element.clientWidth / rect.width;
                        const y = (event.clientY - rect.top) * element.clientHeight / rect.height;
                        const after = editor.getViewport();
                        fire(-deltaY!, deltaMode!);
                        checks.push({ start, prevented: event.defaultPrevented, zoom: after.zoom, back: editor.getViewport().zoom,
                            beforeX: (x - before.x) / before.zoom, afterX: (x - after.x) / after.zoom,
                            beforeY: (y - before.y) / before.zoom, afterY: (y - after.y) / after.zoom });
                    }
                }
                editor.setZoom(1.43); const beforeZero = editor.getViewport();
                fire(0, 0); fire(0, 0, 120);
                const afterZero = editor.getViewport();
                for (let i = 0; i < 100; i++) fire(-120, 0);
                const repeated = editor.getViewport().zoom;
                for (let i = 0; i < 100; i++) fire(120, 0);
                return { checks, beforeZero, afterZero, repeated, reversed: editor.getViewport().zoom,
                    escaped, contentEvents, original, document: editor.getDocument(), undo: editor.canUndo() };
            }, platform);
            for (const check of results.checks) {
                expect(check.zoom).toBeCloseTo(check.start + .0143, 10);
                expect(check.back).toBe(check.start);
                expect(check.beforeX).toBeCloseTo(check.afterX, 10);
                expect(check.beforeY).toBeCloseTo(check.afterY, 10);
                expect(check.prevented).toBe(true);
            }
            expect(results.beforeZero).toEqual(results.afterZero);
            expect(results.repeated).toBe(2.86);
            expect(results.reversed).toBe(1.43);
            expect(results.escaped).toBe(0);
            expect(results.contentEvents).toBe(0);
            expect(results.document).toEqual(results.original);
            expect(results.undo).toBe(false);
        });

        test('trusted small and large wheel input each changes one displayed point', async ({ page }) => {
            await page.locator('#primary .mindmap').hover({ position: { x: 30, y: 40 } });
            for (const delta of [-1, -100, -120]) {
                await page.evaluate(() => window.primary.setZoom(1.43));
                await page.keyboard.down(primary); await page.mouse.wheel(0, delta); await page.keyboard.up(primary);
                await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).toBe(1.4443);
                await page.keyboard.down(primary); await page.mouse.wheel(0, -delta); await page.keyboard.up(primary);
                await expect.poll(() => page.evaluate(() => window.primary.getViewport().zoom)).toBe(1.43);
            }
        });
    });
}
