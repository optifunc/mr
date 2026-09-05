import { expect, test } from 'vitest';
import { MindMapError } from '../../src/types';
test('initialization errors have stable codes', () => { const error = new MindMapError('INVALID_DOCUMENT', 'Invalid root'); expect(error).toBeInstanceOf(Error); expect(error.code).toBe('INVALID_DOCUMENT'); });
