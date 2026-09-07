import type { ErrorCode } from '../../src/types';

export const invalidCommands: { name: string; value: unknown; code: ErrorCode }[] = [
    ...[null, [], {}, { type: 7 }].map(value => ({ name: `command shape ${JSON.stringify(value)}`, value, code: 'INVALID_DOCUMENT' as const })),
    ...[{}, { text: undefined }, { text: null }, { text: 42 }].map(fields => ({
        name: `setText ${Object.hasOwn(fields, 'text') ? String(fields.text) : 'missing'}`,
        value: { type: 'setText', targetId: 'one', ...fields }, code: 'INVALID_DOCUMENT' as const,
    })),
    { name: 'invalid insertion text', value: { type: 'insertChild', targetId: 'one', text: null }, code: 'INVALID_DOCUMENT' },
    ...[undefined, null, {}, { targetId: 'root', position: 'child', side: 'invalid' },
        { targetId: 'root', position: 'child', side: null }, { targetId: 'three', position: 'invalid' },
        { targetId: 'root' }, { targetId: 4, position: 'child' }].map(destination => ({
        name: `move ${JSON.stringify(destination)}`, value: { type: 'move', ids: ['one'], destination }, code: 'INVALID_TARGET' as const,
    })),
    ...['one', null, ['one', 7], ['']].map(ids => ({ name: `ids ${JSON.stringify(ids)}`, value: { type: 'delete', ids }, code: 'INVALID_TARGET' as const })),
    { name: 'invalid target type', value: { type: 'setText', targetId: 7, text: 'changed' }, code: 'INVALID_TARGET' },
];
