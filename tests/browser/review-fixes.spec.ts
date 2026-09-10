import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-c/review-fixes';
const phase = process.env.REVIEW_BEFORE ? 'before' : 'after';
mkdirSync(evidence, { recursive: true });
const frames = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); await frames(page); });

for (const platform of ['MacIntel', 'Win32']) test(`physical fit shortcut on ${platform} actually fits and unshifted zero resets zoom`, async ({ page }, info) => {
    await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { value: platform }), platform); await page.reload(); await page.evaluate(() => document.fonts.ready); await frames(page);
    const before = await page.evaluate(() => ({ doc: window.primary.getDocument(), count: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }));
    const fitted = await page.evaluate(() => { window.primary.fit(); return window.primary.getViewport(); });
    await page.evaluate(() => { window.primary.setZoom(4); window.primary.panTo(-1000, -1000); window.primary.focus(); });
    const modifier = platform === 'MacIntel' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Shift+Digit0`);
    const actual = await page.evaluate(() => window.primary.getViewport());
    writeFileSync(`${evidence}/${phase}-fit-${platform}-${info.project.name}.json`, JSON.stringify({ expected: fitted, actual }, null, 2) + '\n');
    expect(actual).toEqual(fitted);
    const host = (await page.locator('#primary').boundingBox())!;
    for (const box of await page.locator('#primary .mindmap-node').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }))) {
        expect(box.x).toBeGreaterThanOrEqual(host.x); expect(box.y).toBeGreaterThanOrEqual(host.y); expect(box.right).toBeLessThanOrEqual(host.x + host.width); expect(box.bottom).toBeLessThanOrEqual(host.y + host.height);
    }
    await page.keyboard.press(`${modifier}+Digit0`); expect(await page.evaluate(() => window.primary.getViewport().zoom)).toBe(1);
    expect(await page.evaluate(() => ({ doc: window.primary.getDocument(), count: document.querySelector('#primary .mindmap')!.getAttribute('data-layout-count') }))).toEqual(before);
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});

for (const id of ['chain', 'c21', 'root']) for (const zoom of [1, 2]) test(`resize during ${id} edit at ${zoom} keeps buffer, caret, native undo and frozen geometry`, async ({ page }, info) => {
    await page.evaluate(({ id, zoom }) => {
        if (id !== 'chain') { const doc = window.primary.getDocument(); const n = id === 'root' ? doc.root : doc.root.children[1]!.children[0]!; n.text = 'Wide label '.repeat(12) + '\nrow'.repeat(20); window.primary.setDocument(doc); }
        window.primary.setZoom(zoom); window.primary.setSelection([id]); window.primary.focus();
    }, { id, zoom });
    const original = await page.evaluate(() => window.primary.getDocument());
    await page.keyboard.press('F2'); const area = page.locator('#primary textarea');
    await page.keyboard.press('ArrowRight'); await page.keyboard.type(' buffer');
    const saved = await area.evaluate(el => { const a = el as HTMLTextAreaElement; a.dataset.identity = 'retained'; return { value: a.value, start: a.selectionStart, end: a.selectionEnd }; });
    const frozen = await page.locator('#primary .mindmap-nodes').innerHTML(), count = await page.locator('#primary .mindmap').getAttribute('data-layout-count');
    for (const [width, height] of [[320, 240], [800, 500], [0, 0], [320, 240]]) {
        await page.evaluate(([width, height]) => { const host = document.querySelector<HTMLElement>('#primary')!; host.style.width = `${width}px`; host.style.height = `${height}px`; }, [width!, height!]); await frames(page);
        if (!width) continue;
        const host = (await page.locator('#primary').boundingBox())!, rect = (await area.boundingBox())!;
        if (width === 320) { await page.locator('#primary').screenshot({ path: `${evidence}/${phase}-resize-${id}-${zoom}-${info.project.name}.png` }); writeFileSync(`${evidence}/${phase}-resize-${id}-${zoom}-${info.project.name}.json`, JSON.stringify({ host, editor: rect, saved }, null, 2) + '\n'); }
        expect(rect.x).toBeGreaterThanOrEqual(host.x); expect(rect.y).toBeGreaterThanOrEqual(host.y);
        expect(rect.x + rect.width).toBeLessThanOrEqual(host.x + host.width); expect(rect.y + rect.height).toBeLessThanOrEqual(host.y + host.height);
        await expect(area).toBeFocused(); await expect(area).toHaveAttribute('data-identity', 'retained');
        expect(await area.evaluate(el => { const a = el as HTMLTextAreaElement; return { value: a.value, start: a.selectionStart, end: a.selectionEnd }; })).toEqual(saved);
        expect(await page.locator('#primary .mindmap-nodes').innerHTML()).toBe(frozen); expect(await page.locator('#primary .mindmap').getAttribute('data-layout-count')).toBe(count);
    }
    await page.keyboard.press('Meta+z'); expect(await area.inputValue()).not.toBe(saved.value); await page.keyboard.press('Meta+Shift+z'); await expect(area).toHaveValue(saved.value);
    await page.keyboard.type('!'); await expect(area).toHaveValue(saved.value + '!');
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(original); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    await page.keyboard.press('Escape'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(original);
});

test('resized provisional editor commits once and undo restores its creation', async ({ page }) => {
    const original = await page.evaluate(() => { window.primary.setSelection(['child1']); window.primary.focus(); return window.primary.getDocument(); });
    await page.keyboard.press('Tab'); await page.keyboard.type('New child');
    await page.evaluate(() => { const host = document.querySelector<HTMLElement>('#primary')!; host.style.width = '320px'; host.style.height = '240px'; }); await frames(page);
    await expect(page.locator('#primary textarea')).toBeFocused(); await expect(page.locator('#primary textarea')).toHaveValue('New child');
    await page.keyboard.press('Enter'); expect(await page.evaluate(() => window.primary.getDocument().root.children[0]!.children[0]!.text)).toBe('New child');
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(original); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});

for (const method of ['panTo', 'setZoom', 'fit', 'panToNode'] as const) test(`viewport listeners defer commands and ${method} until the entire batch ends`, async ({ page }, info) => {
    const result = await page.evaluate(async method => {
        const a = window.primary, events: string[] = [], observations: unknown[] = []; let first = true;
        a.setZoom(2); a.panTo(-1500, -1500); await new Promise<void>(r => requestAnimationFrame(() => r()));
        a.on('documentchange', () => events.push('document'));
        a.on('viewportchange', event => {
            events.push('first-start');
            if (first) { first = false; a.execute({ type: 'setText', targetId: 'a', text: 'Changed' });
                if (method === 'panTo') a.panTo(200, 300); if (method === 'setZoom') a.setZoom(1); if (method === 'fit') a.fit(); if (method === 'panToNode') a.panToNode('a');
                observations.push({ event, view: a.getViewport(), text: a.getDocument().root.children[2]!.children[0]!.text });
            }
            events.push('first-end');
        });
        a.on('viewportchange', event => { events.push('second'); if (observations.length === 1) observations.push({ event, view: a.getViewport(), text: a.getDocument().root.children[2]!.children[0]!.text }); });
        a.panTo(-1400, -1400); const initial = a.getViewport();
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
        return { events, observations, initial, final: a.getViewport() };
    }, method);
    writeFileSync(`${evidence}/${phase}-queue-${method}-${info.project.name}.json`, JSON.stringify(result, null, 2) + '\n');
    expect(result.events).toEqual(['first-start', 'first-end', 'second', 'document', 'first-start', 'first-end', 'second']);
    expect(result.observations).toEqual([0, 1].map(() => ({ event: { ...result.initial, origin: 'api' }, view: result.initial, text: 'A' })));
    expect(result.final).not.toEqual(result.initial);
});

test('viewport batches retain coalescing, detached payloads and exception isolation', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const a = window.primary, events: string[] = [], views: unknown[] = []; let once = true;
        a.on('error', () => events.push('error'));
        a.on('documentchange', () => events.push('document'));
        a.on('viewportchange', e => { if (once) { once = false; a.execute({ type: 'setText', targetId: 'a', text: 'Queued' }); e.x = 999; throw Error('listener'); } });
        a.on('viewportchange', e => { events.push('second'); views.push(e); });
        a.panTo(10, 20); a.panTo(30, 40); a.panTo(30, 40);
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return { events, views, viewport: a.getViewport() };
    });
    expect(result.events).toEqual(['error', 'second', 'document']); expect(result.views).toEqual([{ x: 30, y: 40, zoom: 1, origin: 'api' }]); expect(result.viewport).toEqual({ x: 30, y: 40, zoom: 1 });
});

test('destroy from viewport listener discards queued mutations and later notifications', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const a = window.primary, events: string[] = [], before = a.getDocument();
        a.on('documentchange', () => events.push('document'));
        a.on('viewportchange', () => { events.push('first'); a.execute({ type: 'setText', targetId: 'a', text: 'Discard' }); a.panTo(90, 90); a.destroy(); });
        a.on('viewportchange', () => events.push('second')); a.panTo(10, 20);
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return { events, before, after: a.getDocument() };
    });
    expect(result.events).toEqual(['first']); expect(result.after).toEqual(result.before);
});
