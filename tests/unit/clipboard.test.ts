import { describe, expect, it } from 'vitest';
import { parse, serialize } from '../../src/clipboard/codec';
import { Store } from '../../src/model/store';
import { validateDocument } from '../../src/model/document';
import { labelUrl } from '../../src/interaction/links';
import { node, referenceMap } from '../fixtures/maps';

describe('clipboard text contract', () => {
    it('normalizes ancestors, preserves hidden nodes and visual root sides', () => {
        const doc = referenceMap(), model = validateDocument(doc);
        expect(serialize(model, ['c', 'child1', 'one', 'a'])).toBe('Child 1\nOne\n\tA\n\tB\n\tC\n');
        expect(serialize(model, ['collapsed'])).toBe('Collapsed node\n\tHidden descendant\n');
        doc.root.children.reverse();
        expect(serialize(validateDocument(doc), ['root']).indexOf('Child2')).toBeLessThan(serialize(validateDocument(doc), ['root']).indexOf('Three'));
    });
    it('round trips checkboxes, exact marker literals, escapes, whitespace and final empty siblings', () => {
        const values = [node('1', '[x] literal'), { ...node('2', 'a\\b\tc\nd\n'), checked: false }, { ...node('3', ''), checked: true }, node('4', '    indented spaces'), node('5', '')];
        const model = validateDocument({ root: { ...node('root'), children: values.map(n => ({ ...n, side: 'right' })) } });
        const text = serialize(model, values.map(n => n.id));
        expect(text).toBe('\\[x] literal\n[ ] a\\\\b\\tc\\nd\\n\n[x] \n    indented spaces\n\n');
        expect(parse(text)).toEqual(values.map(({ id: _, ...n }) => n));
        expect(parse(text.replace(/\n/g, '\r\n'))).toEqual(parse(text));
    });
    it.each(['\tA', 'A\n\t\tB', 'A\n\tB\nC\n\t\tD'])('rejects invalid indentation atomically: %j', text => {
        expect(() => parse(text)).toThrow(expect.objectContaining({ code: 'CLIPBOARD_INDENTATION' }));
    });
    it('keeps unknown escapes and consumes only one final terminator', () => {
        expect(parse('')).toEqual([]);
        expect(parse('\n')).toEqual([{ text: '', children: [] }]);
        expect(parse('A\n\n')).toHaveLength(2);
        expect(parse('\\q\\\\n\n')[0]!.text).toBe('\\q\\n');
    });
    it('pastes one expanded forest with new IDs, destination sides, selection and one history entry', () => {
        let serial = 0;
        const store = new Store({ document: referenceMap(), createNodeId: () => `paste-${serial++}` });
        const before = store.getDocument();
        expect(store.paste('collapsed', parse('[x] Parent\n\tChild\\nline\nSibling\n'))).toBe(true);
        expect(store.model.nodes.get('collapsed')!.collapsed).toBe(false);
        expect(store.model.nodes.get('paste-0')).toMatchObject({ checked: true, children: ['paste-1'], parent: 'collapsed' });
        expect(store.model.nodes.get('paste-1')!.text).toBe('Child\nline');
        expect(store.selection.ids).toEqual(['paste-0', 'paste-2']);
        const after = store.getDocument();
        store.execute({ type: 'undo' }); expect(store.getDocument()).toEqual(before); expect(store.history.canUndo).toBe(false);
        store.execute({ type: 'redo' }); expect(store.getDocument()).toEqual(after);
        store.paste('root', parse('Right')); expect(store.model.nodes.get('paste-3')!.side).toBe('right');
        store.paste('child2', parse('Left')); expect(store.model.nodes.get('paste-4')!.side).toBeUndefined();
    });
    it.each(['collision', 'throw', 'invalid'])('rejects ID failure after partial preparation: %s', mode => {
        let calls = 0;
        const store = new Store({ document: referenceMap(), createNodeId: () => { if (++calls === 1) return 'fresh'; if (mode === 'throw') throw Error(); return mode === 'collision' ? 'fresh' : ''; } });
        const before = store.getDocument(), selection = store.selection;
        expect(() => store.paste('root', parse('A\n\tB'))).toThrow();
        expect(store.getDocument()).toEqual(before); expect(store.selection).toEqual(selection); expect(store.history.canUndo).toBe(false);
    });
    it('supports deep paste without recursion and rejects read-only mutation', () => {
        let i = 0; const store = new Store({ document: referenceMap(), createNodeId: () => `deep-${i++}` });
        store.paste('root', parse(Array.from({ length: 1200 }, (_, n) => '\t'.repeat(n) + n).join('\n')));
        expect(i).toBe(1200);
        expect(() => new Store({ document: referenceMap(), readonly: true }).paste('root', parse('A'))).toThrow(expect.objectContaining({ code: 'READ_ONLY' }));
    });
});
describe('whole label URLs', () => {
    it.each(['See https://example.com', 'https://example.com more', 'javascript:alert(1)', '//example.com', '/relative', 'https://', 'https://example.com\nline'])('rejects %j', text => expect(labelUrl(text)).toBeUndefined());
    it.each([' https://example.com/a?q=b#c ', 'http://localhost:8080', 'HTTPS://example.com'])('recognizes %j', text => expect(labelUrl(text)).toBe(new URL(text.trim()).href));
});
