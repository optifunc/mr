import { MindMapError } from '../types';
import type { MindMapCommand } from '../types';

/** TypeScript types do not protect JavaScript callers or deserialized commands. */
export function validateCommand(command: unknown): asserts command is MindMapCommand {
    if (!command || typeof command !== 'object' || Array.isArray(command) ||
        !('type' in command) || typeof command.type !== 'string')
        throw new MindMapError('INVALID_DOCUMENT', 'Expected a command object with a string type');
    const value = command as Record<string, unknown>;
    const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
    if (value.targetId !== undefined && !id(value.targetId))
        throw new MindMapError('INVALID_TARGET', 'targetId must be a nonempty string');
    if (value.ids !== undefined && (!Array.isArray(value.ids) || !value.ids.every(id)))
        throw new MindMapError('INVALID_TARGET', 'ids must be an array of nonempty strings');
    if (value.type === 'setText' ? typeof value.text !== 'string' :
        ['insertChild', 'insertBefore', 'insertAfter', 'insertParent'].includes(value.type as string) &&
        value.text !== undefined && typeof value.text !== 'string')
        throw new MindMapError('INVALID_DOCUMENT', 'Node text must be a string');
    if (value.type === 'move') {
        const destination = value.destination as Record<string, unknown> | undefined;
        if (!destination || typeof destination !== 'object' || Array.isArray(destination) ||
            !id(destination.targetId) || !['before', 'after', 'child'].includes(destination.position as string) ||
            destination.side !== undefined && destination.side !== 'left' && destination.side !== 'right')
            throw new MindMapError('INVALID_TARGET', 'Move needs a valid target, position, and optional left/right side');
    }
}
