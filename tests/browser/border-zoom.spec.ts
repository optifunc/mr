import { test, expect } from '@playwright/test';

for (const uiZoom of [.9, .8, .67]) test(`fractional UI scale ${uiZoom} preserves editor and checkbox frames`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async uiZoom => {
        await document.fonts.ready;
        document.querySelector<HTMLElement>('#primary')!.style.zoom = String(uiZoom);
        window.primary.setDocument({ root: { id: 'root', text: 'Borders', children: [
            { id: 'left', text: 'Checkbox with a left editor', checked: true, side: 'left', children: [] },
            { id: 'right', text: 'Unchecked item', checked: false, side: 'right', children: [] },
        ] } });
    }, uiZoom);
    for (const zoom of [1, 2]) {
        await page.evaluate(zoom => { window.primary.setZoom(zoom);window.primary.panToNode('left');window.primary.setSelection(['left']);window.primary.focus(); }, zoom);
        await page.keyboard.press('F2');await page.keyboard.press('ArrowLeft');
        const editor=page.locator('#primary textarea');await expect(editor).toBeFocused();
        const state=await editor.evaluate(e=>{
            const s=getComputedStyle(e),label=document.querySelector('#primary [data-node-id="left"] .mindmap-label')!.getBoundingClientRect();
            const box=e.getBoundingClientRect(),c=document.querySelector('#primary [data-node-id="right"] input')!;
            return {border:s.borderTopWidth,frame:s.boxShadow,clip:s.backgroundClip,paddingLeft:parseFloat(s.paddingLeft),paddingTop:parseFloat(s.paddingTop),scrollLeft:e.scrollLeft,scrollTop:e.scrollTop,box:box.toJSON(),label:label.toJSON(),checkbox:getComputedStyle(c).boxShadow,checkboxWidth:parseFloat(getComputedStyle(c).width)};
        });
        // A painted 1px frame must retain its CSS width at fractional host scale.
        expect(state.frame).toContain('1px inset');expect(state.checkbox).toContain('1px inset');expect(state.border).toBe('0px');
        // Fractional CSS zoom quantizes layout to subpixels (up to 1/64 physical px).
        expect(Math.abs(state.checkboxWidth-13)*uiZoom).toBeLessThanOrEqual(1/64);expect(state.clip).toBe('content-box');
        expect(Math.abs(state.box.y+(state.paddingTop-state.scrollTop)*zoom*uiZoom-state.label.y)).toBeLessThan(.15);
        expect(Math.abs(state.box.x+(state.paddingLeft-state.scrollLeft)*zoom*uiZoom-state.label.x)).toBeLessThan(.8);
        await expect(page.locator('#primary [data-node-id="left"] input')).toBeChecked();
        await editor.fill('Temporary change');await page.keyboard.press('Escape');
        expect(await page.evaluate(()=>window.primary.getDocument().root.children[0]!.text)).toBe('Checkbox with a left editor');
    }
});

test('forced colors retains visible native checkbox and editor frames', async ({ page }) => {
    await page.emulateMedia({forcedColors:'active'});await page.goto('/');
    await page.evaluate(()=>{window.primary.execute({type:'addCheckbox',ids:['a']});window.primary.setSelection(['a']);window.primary.focus();});
    await page.keyboard.press('F2');
    const frame=await page.locator('#primary textarea').evaluate(e=>({outline:getComputedStyle(e).outlineStyle,shadow:getComputedStyle(e).boxShadow}));
    expect(frame.outline).toBe('solid');expect(frame.shadow).toBe('none');
    expect(await page.locator('#primary [data-node-id="a"] input').evaluate(e=>getComputedStyle(e).appearance)).toBe('auto');
});
