import { expect, test } from '@playwright/test';
import type { MindMapEditor } from '../../src';
import { invalidCommands } from '../fixtures/invalid-commands';
import type { MindMapCommand } from '../../src';
declare global {
    interface Window {
        primary: MindMapEditor;
        secondary: MindMapEditor;
        comparison: MindMapEditor;
    }
}
test('malformed JavaScript commands reject atomically with stable errors', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const results = await page.evaluate(cases => {
        const a = window.primary, original = a.getDocument();
        return cases.map(({ value }) => {
            a.setDocument(original);
            a.execute({ type: 'setText', targetId: 'one', text: 'first' });
            a.execute({ type: 'setText', targetId: 'one', text: 'second' });
            a.undo();
            a.setSelection(['two', 'three'], 'three');
            const state = () => ({ document: a.getDocument(), selection: a.getSelection(),
                dom: document.querySelector('#primary')!.innerHTML, undo: a.canUndo(), redo: a.canRedo() });
            const before = state(), events: string[] = [];
            const off = [a.on('documentchange', () => events.push('documentchange')),
                a.on('selectionchange', () => events.push('selectionchange')), a.on('error', e => events.push(e.code))];
            const applicable = a.canExecute(value as MindMapCommand), returned = a.execute(value as MindMapCommand);
            const after = state();
            off.forEach(unsubscribe => unsubscribe());
            const oneText = () => a.getDocument().root.children.find(n => n.id === 'one')!.text;
            a.redo(); const redone = oneText(); a.undo(); a.undo(); const undone = oneText();
            return { applicable, returned, before, after, events, redone, undone };
        });
    }, invalidCommands);
    results.forEach((result, index) => {
        expect(result.applicable, invalidCommands[index]!.name).toBe(false);
        expect(result.returned).toBe(false);
        expect(result.after).toEqual(result.before);
        expect(result.events).toEqual([invalidCommands[index]!.code]);
        expect(result.redone).toBe('second');
        expect(result.undone).toBe('One');
    });
});
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
    // Provisional creation selects immediately; its document event waits for commit.
    expect(result.events.slice(0, 3)).toEqual(['selection', 'document:api', 'New Mindmap']);
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
        // A public content command finishes the provisional creation before running.
        a.execute({ type: 'setText', targetId: 'root', text: a.getDocument().root.text });
        return { events, text: a.getDocument().root.text };
    });
    expect(result.events).toEqual(['selection', 'error', 'New Mindmap', 'error', 'Queued']);
    expect(result.text).toBe('Queued');
});

test('reentrant branches drain FIFO and preserve event batches despite callback errors', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
        const a = window.primary, events: string[] = [], errors: string[] = [];
        const set = (text: string) => a.execute({ type: 'setText', targetId: 'root', text });
        a.on('error', e => { errors.push(e.code); });
        a.on('documentchange', e => {
            const text = e.document.root.text;
            events.push(`first:${text}`);
            if (text === 'A') { set('B'); set('C'); }
            if (text === 'B') { set('D'); throw new Error('host failure'); }
        });
        a.on('documentchange', e => events.push(`second:${e.document.root.text}`));
        set('A');
        const finalText = a.getDocument().root.text;
        a.undo(); const undone = a.getDocument().root.text;
        return { finalText, undone, events, errors };
    });
    expect(result.events.slice(0, 8)).toEqual(['first:A', 'second:A', 'first:B', 'second:B',
        'first:C', 'second:C', 'first:D', 'second:D']);
    expect(result.finalText).toBe('D');
    expect(result.undone).toBe('C');
    expect(result.errors).toEqual(['HOST_CALLBACK']);
});

test('destroy during a queue drain discards pending work and remaining notifications', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
        const a = window.primary, events: string[] = [];
        const set = (text: string) => a.execute({ type: 'setText', targetId: 'root', text });
        a.on('documentchange', e => {
            events.push(e.document.root.text);
            if (e.document.root.text === 'A') { set('B'); set('C'); }
            if (e.document.root.text === 'B') { set('D'); a.destroy(); }
        });
        a.on('documentchange', e => events.push(`second:${e.document.root.text}`));
        set('A');
        return { events, text: a.getDocument().root.text, mounted: !!document.querySelector('#primary .mindmap') };
    });
    expect(result).toEqual({ events: ['A', 'second:A', 'B'], text: 'B', mounted: false });
});

test('long reentrant chains do not depend on the JavaScript call stack', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
        const a = window.primary;
        let count = 0;
        const errors: string[] = [];
        a.on('error', e => errors.push(e.code));
        a.on('selectionchange', () => {
            count++;
            if (count < 3000) a.setSelection([count % 2 ? 'one' : 'two']);
        });
        a.setSelection(['two']);
        return { count, errors };
    });
    expect(result.errors).toEqual([]);
    expect(result.count).toBe(3000);
});
