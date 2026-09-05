import { expect, test } from '@playwright/test';
import type { MindMapEditor } from '../../src';
declare global {
    interface Window {
        primary: MindMapEditor;
        secondary: MindMapEditor;
    }
}
test('model commands, event isolation, replacement, and independent histories', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
        const a = window.primary, b = window.secondary;
        const events: string[] = [];
        a.on('documentchange', e => { events.push(`document:${e.origin}`); e.document.root.text = 'host mutation'; });
        a.on('documentchange', e => { events.push(e.document.root.text); });
        a.on('selectionchange', () => events.push('selection'));
        const initialCount = a.getDocument().root.children.length;
        const secondaryCount = b.getDocument().root.children.length;
        a.execute({ type: 'insertChild', targetId: 'root', text: 'Child' });
        const after = a.getDocument();
        const untouched = b.getDocument();
        a.undo();
        a.redo();
        const beforeInvalid = a.getDocument();
        let error = '';
        a.on('error', e => { error = e.code; });
        a.setDocument({} as never);
        return { initialCount, secondaryCount, events, after, untouched, beforeInvalid, afterInvalid: a.getDocument(), error };
    });
    expect(result.after.root.children).toHaveLength(result.initialCount + 1);
    expect(result.untouched.root.children).toHaveLength(result.secondaryCount);
    expect(result.events.slice(0, 3)).toEqual(['document:api', 'New Mindmap', 'selection']);
    expect(result.error).toBe('INVALID_DOCUMENT');
    expect(result.afterInvalid).toEqual(result.beforeInvalid);
});
test('reentrant listeners run after the current event batch and exceptions are isolated', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
        const a = window.primary;
        const events: string[] = [];
        let queued = false;
        a.on('error', () => { events.push('error'); throw new Error('error callback'); });
        a.on('documentchange', () => { if (!queued) {
            queued = true;
            a.execute({ type: 'setText', targetId: 'root', text: 'Queued' });
        } throw new Error('callback'); });
        a.on('documentchange', e => events.push(e.document.root.text));
        a.on('selectionchange', () => events.push('selection'));
        a.execute({ type: 'insertChild' });
        return { events, text: a.getDocument().root.text };
    });
    expect(result.events).toEqual(['error', 'New Mindmap', 'selection', 'error', 'Queued']);
    expect(result.text).toBe('Queued');
});
