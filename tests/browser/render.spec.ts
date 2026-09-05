import { expect, test } from '@playwright/test';
test('reference appearance and geometry evidence', async ({ page }, info) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const widget = page.locator('#primary .mindmap');
    await expect(widget.getByRole('treeitem')).toHaveCount(21);
    await expect(widget.locator('[data-node-id="hidden"]')).toHaveCount(0);
    await expect(widget.locator('circle')).toHaveCount(1);
    await expect(widget.locator('[data-node-id="one"]')).toHaveAttribute('aria-selected', 'true');
    const boxes = await widget.locator('.mindmap-nodes .mindmap-node').evaluateAll(elements => elements.map(e => { const r = e.getBoundingClientRect(); return { id: (e as HTMLElement).dataset.nodeId, x: r.x, y: r.y, w: r.width, h: r.height }; }));
    for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!, b = boxes[j]!;
            expect(a.x + a.w <= b.x + .01 || b.x + b.w <= a.x + .01 || a.y + a.h <= b.y + .01 || b.y + b.h <= a.y + .01, `${a.id} overlaps ${b.id}`).toBe(true);
        }
    // Keep the entire comparison inside the viewport before capturing either crop.
    // Firefox can retain a partial paint when successive locator captures scroll
    // a wider-than-body comparison in opposite directions.
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.locator('.comparison').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('.comparison').screenshot({ path: `docs/evidence/milestone-a/comparison-${info.project.name}.png` });
    await page.locator('#comparison-map').screenshot({ path: `docs/evidence/milestone-a/reference-${info.project.name}.png` });
    await page.locator('#secondary').screenshot({ path: `docs/evidence/milestone-a/geometry-${info.project.name}.png` });
    await page.getByRole('button', { name: 'Select One', exact: true }).click();
    await expect(widget).toBeFocused();
    await widget.screenshot({ path: `docs/evidence/milestone-a/focus-${info.project.name}.png` });
});
test('selection and checked state reuse geometry; structural changes relayout and undo', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => { const widget = document.querySelector('#secondary .mindmap')!; const count = () => widget.getAttribute('data-layout-count'); const item = widget.querySelector('[data-node-id="checked"]')!; const before = count(); const rect = item.getBoundingClientRect().toJSON(); window.secondary.setSelection(['checked']); const afterSelection = count(); window.secondary.execute({ type: 'toggleChecked', ids: ['checked'] }); const afterCheck = count(); const sameElement = item === widget.querySelector('[data-node-id="checked"]'); const checked = (item.querySelector('input') as HTMLInputElement).checked; const afterRect = item.getBoundingClientRect().toJSON(); window.secondary.execute({ type: 'removeCheckbox', ids: ['checked'] }); return { before, afterSelection, afterCheck, afterPresence: count(), sameElement, checked, rect, afterRect }; });
    expect(result.afterSelection).toBe(result.before);
    expect(result.afterCheck).toBe(result.before);
    expect(result.afterPresence).not.toBe(result.before);
    expect(result.sameElement).toBe(true);
    expect(result.checked).toBe(false);
    expect(result.afterRect).toEqual(result.rect);
    await page.getByRole('button', { name: 'Expand / collapse One' }).click();
    await expect(page.locator('#primary [data-node-id="a"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('#primary [data-node-id="a"]')).toHaveCount(1);
});
test('literal text, empty/multiline labels, theme refresh, font completion, resize, and lifecycle', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#secondary [data-node-id="html"] .mindmap-label')).toHaveText('<b>Plain text</b>');
    await expect(page.locator('#secondary b')).toHaveCount(0);
    const result = await page.evaluate(() => { const host = document.querySelector('#secondary') as HTMLElement; const widget = host.querySelector('.mindmap') as HTMLElement; const item = widget.querySelector('[data-node-id="multi"]')!; const box = item.getBoundingClientRect(); const empty = widget.querySelector('[data-node-id="empty"]')!.getBoundingClientRect(); const space = widget.querySelector('[data-node-id="space"] .mindmap-label')!.textContent; widget.style.setProperty('--mindmap-font-size', '20px'); widget.style.setProperty('--mindmap-line-height', '26px'); window.secondary.refreshLayout(); const changed = item.getBoundingClientRect(); return { h: box.height, emptyWidth: empty.width, space, changedWidth: changed.width, width: box.width }; });
    expect(result.h).toBeGreaterThan(24);
    expect(result.emptyWidth).toBeGreaterThan(0);
    expect(result.space).toBe('   ');
    expect(result.changedWidth).toBeGreaterThan(result.width);
    const before = await page.locator('#primary .mindmap').getAttribute('data-layout-count');
    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(page.locator('#primary .mindmap')).toHaveAttribute('data-layout-count', before!);
    const cleanup = await page.evaluate(() => { const primary = document.querySelector('#primary')!; const span = document.createElement('span'); span.textContent = 'Host content'; primary.append(span); const snapshot = window.secondary.getDocument(); window.primary.destroy(); window.primary.destroy(); window.primary.refreshLayout(); document.fonts.dispatchEvent(new Event('loadingdone')); return { owned: primary.querySelectorAll('.mindmap').length, preserved: primary.contains(span), secondary: window.secondary.getDocument(), snapshot }; });
    expect(cleanup.owned).toBe(0);
    expect(cleanup.preserved).toBe(true);
    expect(cleanup.secondary).toEqual(cleanup.snapshot);
});
test('replacement reconciles reused root IDs, namespaced DOM IDs, and optional checkboxes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => { const all = [...document.querySelectorAll('.mindmap-node[id]')].map(e => e.id); const a = window.primary; const old = a.getDocument().root; a.setDocument({ root: { id: 'one', text: 'Replacement root', checked: false, children: [{ id: old.id, text: 'Previous root', side: 'left', children: [] }] } }); const widget = document.querySelector('#primary .mindmap')!; return { all, paths: widget.querySelectorAll('path').length, nodes: widget.querySelectorAll('.mindmap-nodes .mindmap-node').length, rootClass: widget.querySelector('[data-node-id="one"]')!.classList.contains('mindmap-root-node'), childClass: widget.querySelector('[data-node-id="root"]')!.classList.contains('mindmap-root-node'), checked: widget.querySelector('[data-node-id="one"]')!.getAttribute('aria-checked') }; });
    expect(new Set(result.all).size).toBe(result.all.length);
    expect(result.paths).toBe(1);
    expect(result.nodes).toBe(2);
    expect(result.rootClass).toBe(true);
    expect(result.childClass).toBe(false);
    expect(result.checked).toBe('false');
});
test('checkbox accessibility state survives hidden-node removal and recreation',async({page})=>{
    await page.goto('/');
    await page.evaluate(()=>{window.secondary.execute({type:'collapse',targetId:'unchecked'});window.secondary.execute({type:'expand',targetId:'unchecked'});});
    await expect(page.locator('#secondary [data-node-id="nested"]')).toHaveAttribute('aria-checked','true');
    await expect(page.locator('#secondary [data-node-id="nested"] input')).toBeChecked();
});
test('root ellipse contains long multiline content and keeps an empty root horizontal',async({page},info)=>{
    await page.goto('/');await page.evaluate(()=>document.fonts.ready);
    await page.locator('#secondary').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const containment=await page.evaluate(()=>{
        window.secondary.execute({type:'setText',targetId:'root',text:Array(6).fill('A long root label').join('\n')});
        const root=document.querySelector('#secondary .mindmap-root-node')!;const box=root.getBoundingClientRect();const label=root.querySelector('.mindmap-label')!.getBoundingClientRect();
        const cx=box.x+box.width/2,cy=box.y+box.height/2;
        return {ratio:box.width/box.height,corners:[...root.children].flatMap(child=>{const rect=child.getBoundingClientRect();return [rect.left,rect.right].flatMap(x=>[rect.top,rect.bottom].map(y=>((x-cx)/(box.width/2))**2+((y-cy)/(box.height/2))**2));}),labelHeight:label.height};
    });
    expect(containment.ratio).toBeGreaterThan(1.7);expect(Math.max(...containment.corners)).toBeLessThanOrEqual(1);expect(containment.labelHeight).toBe(108);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('#secondary').screenshot({path:`docs/evidence/milestone-a/root-multiline-${info.project.name}.png`});
    const empty=await page.evaluate(()=>{window.secondary.execute({type:'setText',targetId:'root',text:''});const box=document.querySelector('#secondary .mindmap-root-node')!.getBoundingClientRect();return{width:box.width,height:box.height};});
    expect(empty.width).toBeGreaterThan(empty.height);
});
