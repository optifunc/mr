import { test, expect } from '@playwright/test';
import { referenceMap } from '../fixtures/maps';

declare global { interface Window { clip: { events: string[]; completions: unknown[]; writes: string[]; resolve: (text: string) => void; reject: () => void; opens: unknown[][] } } }
async function setup(page: import('@playwright/test').Page, mode: 'success' | 'deferred' | 'denied' | 'unavailable' = 'success', text = 'Pasted\n\t[x] Child\\nline\nSibling\n') {
    await page.evaluate(({ mode, text }) => {
        window.clip = { events: [], completions: [], writes: [], resolve: () => {}, reject: () => {}, opens: [] };
        const promise = () => mode === 'deferred' ? new Promise<string>((resolve, reject) => { window.clip.resolve = resolve; window.clip.reject = () => reject(Error('denied')); }) : mode === 'denied' ? Promise.reject(Error('denied')) : Promise.resolve(text);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'unavailable' ? undefined : { readText: promise, writeText: (text: string) => { window.clip.writes.push(text); return promise(); } } });
        window.primary.on('error', e => window.clip.events.push(e.code));
        window.primary.on('documentchange', e => window.clip.events.push(`document:${e.command ?? e.reason}`));
        window.primary.on('selectionchange', () => window.clip.events.push('selection'));
        window.primary.on('commandcomplete', e => { window.clip.events.push(`complete:${e.command}:${e.origin}`); window.clip.completions.push(e); });
        window.open = (...args: unknown[]) => { window.clip.opens.push(args); return null; };
        window.primary.focus();
    }, { mode, text });
}
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });
test('API paste/cut/copy settle once, retain IDs on redo and expose completion after document/selection', async ({ page }) => {
    await setup(page);
    expect(await page.evaluate(() => window.primary.execute({ type: 'paste', targetId: 'child2' }))).toBe(true);
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['document:paste', 'selection', 'complete:paste:api']);
    const pasted = await page.evaluate(() => window.primary.getDocument());
    expect(pasted.root.children[1]!.children.slice(-2).map(n => n.text)).toEqual(['Pasted', 'Sibling']);
    expect(pasted.root.children[1]!.children.at(-2)!.children[0]).toMatchObject({ text: 'Child\nline', checked: true });
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    await page.keyboard.press('Meta+Shift+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(pasted);
    await page.evaluate(() => window.primary.execute({ type: 'copy', ids: ['one', 'a', 'child1'] }));
    await expect.poll(() => page.evaluate(() => window.clip.writes.at(-1))).toBe('One\n\tA\n\tB\n\tC\nChild 1\n');
    await page.evaluate(() => window.primary.execute({ type: 'cut', ids: ['one', 'a'] }));
    await expect.poll(() => page.evaluate(() => window.primary.getDocument().root.children.some(n => n.id === 'one'))).toBe(false);
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(pasted);
});
for (const mode of ['denied', 'unavailable'] as const) test(`${mode} clipboard leaves document and history intact`, async ({ page }) => {
    await setup(page, mode);
    for (const type of ['copy', 'cut', 'paste'] as const) {
        expect(await page.evaluate(type => window.primary.execute({ type }), type)).toBe(true);
        await expect.poll(() => page.evaluate(() => window.clip.events.at(-1))).toBe(mode === 'denied' ? 'CLIPBOARD_DENIED' : 'CLIPBOARD_UNAVAILABLE');
    }
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
test('invalid indentation and generated-ID collision reject whole paste', async ({ page }) => {
    await setup(page, 'success', 'Good\n\t\tBad');
    await page.evaluate(() => window.primary.execute({ type: 'paste' }));
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['CLIPBOARD_INDENTATION']);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.evaluate(async () => { const path = '/src/index.ts'; const { MindMapEditor } = await import(/* @vite-ignore */ path); const doc = window.primary.getDocument(); window.primary.destroy(); let i = 0; window.primary = new MindMapEditor(document.querySelector('#primary')!, { document: doc, createNodeId: () => ++i === 1 ? 'new' : 'one' }); });
    await setup(page); await page.evaluate(() => window.primary.execute({ type: 'paste' }));
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['INVALID_ID']);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
for (const type of ['cut', 'paste'] as const) for (const change of ['edit', 'replace', 'interaction'] as const) test(`${type} rejects deferred completion after ${change}`, async ({ page }) => {
    await setup(page, 'deferred');
    expect(await page.evaluate(type => window.primary.execute({ type }), type)).toBe(true);
    expect(await page.evaluate(() => window.primary.canExecute({ type: 'copy' }))).toBe(false);
    expect(await page.evaluate(() => window.primary.execute({ type: 'copy' }))).toBe(false);
    await page.evaluate(change => { if (change === 'edit') { window.primary.execute({ type: 'setText', targetId: 'a', text: 'Changed' }); window.primary.undo(); } else if (change === 'replace') window.primary.setDocument(window.primary.getDocument()); else window.primary.editNode('a'); }, change);
    if (change === 'interaction') await page.keyboard.press('Escape');
    const before = await page.evaluate(() => ({ doc: window.primary.getDocument(), undo: window.primary.canUndo(), redo: window.primary.canRedo() }));
    await page.evaluate(() => window.clip.resolve('Late'));
    await expect.poll(() => page.evaluate(() => window.clip.events.at(-1))).toBe('CLIPBOARD_STALE');
    expect(await page.evaluate(() => ({ doc: window.primary.getDocument(), undo: window.primary.canUndo(), redo: window.primary.canRedo() }))).toEqual(before);
    expect(await page.evaluate(() => window.clip.completions)).toEqual([]);
});
test('pending requests keep captured selection/target; copy survives edits; destroy suppresses completion', async ({ page }) => {
    await setup(page, 'deferred'); await page.evaluate(() => { window.primary.execute({ type: 'paste' }); window.primary.setSelection(['child1']); window.primary.setZoom(1.5); window.clip.resolve('Captured'); });
    await expect.poll(() => page.evaluate(() => window.primary.getDocument().root.children.find(n => n.id === 'one')!.children.at(-1)!.text)).toBe('Captured');
    await setup(page, 'deferred'); await page.evaluate(() => { window.primary.execute({ type: 'copy', ids: ['a'] }); window.primary.execute({ type: 'setText', targetId: 'a', text: 'Changed' }); window.clip.resolve(''); });
    await expect.poll(() => page.evaluate(() => window.clip.events.at(-1))).toBe('complete:copy:api'); expect(await page.evaluate(() => window.clip.writes)).toEqual(['A\n']);
    await setup(page, 'deferred'); await page.evaluate(() => { window.primary.execute({ type: 'paste' }); window.primary.destroy(); window.clip.resolve('Never'); });
    await page.waitForTimeout(30); expect(await page.evaluate(() => window.clip.events)).toEqual([]);
});
test('native keyboard clipboard round trip works without duplicate API request and textarea keeps native routing', async ({ page }) => {
    await page.evaluate(() => { window.clip = { events: [], completions: [], writes: [], resolve: () => {}, reject: () => {}, opens: [] }; window.primary.on('commandcomplete', e => window.clip.events.push(e.command)); window.primary.focus(); });
    await page.keyboard.press('Meta+c');
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['copy']);
    await page.evaluate(() => window.primary.setSelection(['child1'])); await page.keyboard.press('Meta+v');
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['copy', 'paste']);
    expect(await page.evaluate(() => window.primary.getDocument().root.children[0]!.children[0]!.text)).toBe('One');
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.evaluate(() => window.primary.setSelection(['one'])); await page.keyboard.press('Meta+x');
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['copy', 'paste', 'cut']);
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.keyboard.press('F2'); await page.locator('#primary textarea').fill('Text clipboard'); await page.keyboard.press('Meta+a'); await page.keyboard.press('Meta+c'); await page.keyboard.press('Meta+v');
    expect(await page.evaluate(() => window.clip.events)).toEqual(['copy', 'paste', 'cut']); await expect(page.locator('#primary textarea')).toHaveValue('Text clipboard');
});
test('read-only permits copy/links but rejects cut/paste; root cannot be cut', async ({ page }) => {
    await page.goto('/?readonly'); await setup(page);
    expect(await page.evaluate(() => ['copy', 'cut', 'paste'].map(type => window.primary.execute({ type } as import('../../src/types').MindMapCommand)))).toEqual([true, false, false]);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
    await page.goto('/'); await setup(page); expect(await page.evaluate(() => window.primary.execute({ type: 'cut', ids: ['root', 'a'] }))).toBe(false); expect(await page.evaluate(() => window.clip.writes)).toEqual([]);
});
test('URL modifier label clicks open protected tabs; branch selection, cancellation, callback failure and reclassification', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { window.primary.execute({ type: 'setText', targetId: 'a', text: ' https://example.com/path ' }); window.primary.setSelection(['b']); });
    const label = page.locator('#primary [data-node-id="a"] .mindmap-label');
    await label.click({ modifiers: ['Meta'] }); expect(await page.evaluate(() => window.clip.opens)).toEqual([['https://example.com/path', '_blank', 'noopener,noreferrer']]);
    expect(await page.evaluate(() => window.primary.getSelection().ids)).toEqual(['b']); await expect(page.locator('#primary textarea')).toHaveCount(0);
    const box = (await page.locator('#primary [data-node-id="a"]').boundingBox())!;
    await page.keyboard.down('Meta'); await page.mouse.click(box.x + 1, box.y + box.height); await page.keyboard.up('Meta'); expect(await page.evaluate(() => window.primary.getSelection().ids)).toEqual(['b', 'a']);
    await page.evaluate(() => window.primary.on('linkopen', e => e.preventDefault())); await label.click({ modifiers: ['Meta'] }); expect(await page.evaluate(() => window.clip.opens.length)).toBe(1);
    await page.evaluate(() => window.primary.on('linkopen', () => { throw Error('policy'); })); await label.click({ modifiers: ['Meta'] }); expect(await page.evaluate(() => window.clip.events.at(-1))).toBe('HOST_CALLBACK');
    await page.evaluate(() => window.primary.undo()); await expect(label).not.toHaveClass(/mindmap-link/); await page.evaluate(() => window.primary.redo()); await expect(label).toHaveClass(/mindmap-link/);
    await page.evaluate(() => window.primary.execute({ type: 'setText', targetId: 'a', text: 'See https://example.com' })); await expect(label).not.toHaveClass(/mindmap-link/);
});

test('real asynchronous Clipboard API in a granted secure Chromium context', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Permission grants for asynchronous clipboard are Chromium-specific; native keyboard paths run in every engine.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(async () => { await navigator.clipboard.writeText('[x] Real API\\nsecond line\n'); window.primary.execute({ type: 'paste', targetId: 'root' }); });
    await expect.poll(() => page.evaluate(() => window.primary.getDocument().root.children.at(-1)!.text)).toBe('Real API\nsecond line');
    await page.evaluate(() => window.primary.execute({ type: 'copy' }));
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('[x] Real API\\nsecond line\n');
});

test('empty clipboard no-op, empty physical label and literal HTML are preserved', async ({ page }) => {
    await setup(page, 'success', ''); await page.evaluate(() => window.primary.execute({ type: 'paste' }));
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['complete:paste:api']); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    const count = await page.locator('#primary .mindmap-nodes .mindmap-node').count();
    await setup(page, 'success', '<img src=x onerror=alert(1)>\n\n'); await page.evaluate(() => window.primary.execute({ type: 'paste' }));
    await expect.poll(() => page.locator('#primary .mindmap-nodes .mindmap-node').count()).toBe(count + 2);
    const added = await page.evaluate(() => window.primary.getDocument().root.children.find(n => n.id === 'one')!.children.slice(-2));
    expect(added.map(n => n.text)).toEqual(['<img src=x onerror=alert(1)>', '']); await expect(page.locator('#primary img')).toHaveCount(0);
});
test('deferred cut deletes its captured sources after selection change and leaves clipboard errors isolated between mounts', async ({ page }) => {
    await setup(page, 'deferred'); await page.evaluate(() => { window.primary.execute({ type: 'cut', ids: ['one', 'a'] }); window.primary.setSelection(['child1']); window.secondary.execute({ type: 'setText', targetId: 'multi', text: 'Other instance' }); window.clip.resolve(''); });
    await expect.poll(() => page.evaluate(() => window.clip.events.at(-1))).toBe('complete:cut:api');
    expect(await page.evaluate(() => window.primary.getDocument().root.children.map(n => n.id))).toEqual(['child1', 'child2', 'two', 'three']);
    expect(await page.evaluate(() => window.clip.writes)).toEqual(['One\n\tA\n\tB\n\tC\n']);
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap());
});
test('URL press cancellation and read-only replacement/paste reclassification', async ({ page }) => {
    await setup(page, 'success', 'https://example.com/new\n'); await page.evaluate(() => window.primary.execute({ type: 'paste' }));
    const link = page.locator('#primary .mindmap-link'); await expect(link).toHaveCount(1);
    const box = (await link.boundingBox())!; await page.keyboard.down('Meta'); await page.mouse.move(box.x + 4, box.y + 4); await page.mouse.down(); await page.mouse.move(box.x + 14, box.y + 4); await page.mouse.up(); await page.keyboard.up('Meta'); expect(await page.evaluate(() => window.clip.opens)).toEqual([]);
    await page.goto('/?readonly'); await setup(page); await page.evaluate(() => { const doc = window.primary.getDocument(); doc.root.children[0]!.text = 'https://example.com/readonly'; window.primary.setDocument(doc); });
    await page.locator('#primary .mindmap-link').click({ modifiers: ['Meta'] }); expect(await page.evaluate(() => window.clip.opens)).toEqual([['https://example.com/readonly', '_blank', 'noopener,noreferrer']]); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});

test('review fixture real clipboard, multiline/checkbox paste, undo/redo and denial evidence', async ({ page }, info) => {
    const { writeFileSync } = await import('node:fs');
    await page.getByRole('button', { name: 'Load clipboard + links fixture' }).click();
    await page.keyboard.press('Meta+c');
    await page.locator('#primary [data-node-id="destination"] .mindmap-label').click(); await page.keyboard.press('Meta+v');
    await expect.poll(() => page.evaluate(() => window.primary.getDocument().root.children[1]!.children.length)).toBe(1);
    const doc = await page.evaluate(() => window.primary.getDocument());
    const pasted = doc.root.children[1]!.children[0]!;
    expect(pasted.text).toBe('Release\nSecond line'); expect(pasted.checked).toBe(false); expect(pasted.collapsed).toBeUndefined();
    expect(pasted.children.map(n => n.text)).toEqual(['Code complete', '[x] literal marker\nBackslash \\ and tab\tend', '']); expect(pasted.children[0]!.checked).toBe(true);
    await page.locator('#primary').screenshot({ path: `docs/evidence/milestone-c/stage7/clipboard-${info.project.name}.png` });
    await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
    await page.keyboard.press('Meta+Shift+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(doc);
    writeFileSync(`docs/evidence/milestone-c/stage7/clipboard-${info.project.name}.json`, JSON.stringify({ document: doc, selection: await page.evaluate(() => window.primary.getSelection()), clipboardPath: 'native Meta+C / Meta+V', undoRedo: 'exact document equality' }, null, 2) + '\n');
    await setup(page, 'denied'); await page.evaluate(() => window.primary.execute({ type: 'cut' }));
    await expect.poll(() => page.evaluate(() => window.clip.events)).toEqual(['CLIPBOARD_DENIED']);
    expect(await page.evaluate(() => window.primary.getDocument())).toEqual(doc);
    await page.locator('#primary').locator('..').locator('details').evaluate(el => (el as HTMLDetailsElement).open = true);
    await page.locator('#primary').locator('..').screenshot({ path: `docs/evidence/milestone-c/stage7/clipboard-denied-${info.project.name}.png` });
});

test('explicit hidden paste target keeps selection visible and completion identifies inserted roots', async ({ page }) => {
    await setup(page, 'success', 'Inserted');
    await page.evaluate(() => window.primary.execute({ type: 'paste', targetId: 'hidden' }));
    await expect.poll(() => page.evaluate(() => window.clip.events.at(-1))).toBe('complete:paste:api');
    expect(await page.evaluate(() => window.primary.getSelection())).toEqual({ ids: ['collapsed'], activeId: 'collapsed' });
    const completion = await page.evaluate(() => window.clip.completions[0]) as { ids: string[] };
    expect(completion.ids).toHaveLength(1); expect(completion.ids[0]).not.toBe('collapsed');
    await page.keyboard.press('Space'); await expect(page.locator(`#primary [data-node-id="${completion.ids[0]}"]`)).toBeVisible();
    await page.keyboard.press('Meta+z'); await page.keyboard.press('Meta+z'); expect(await page.evaluate(() => window.primary.getDocument())).toEqual(referenceMap()); expect(await page.evaluate(() => window.primary.canUndo())).toBe(false);
});
