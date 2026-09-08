import { MindMapError } from '../types';
export type ClipboardCommand = 'copy' | 'cut' | 'paste';

/** Native shortcuts use their clipboard event exclusively; API requests use promises. */
export class BrowserClipboard {
    private readonly abort = new AbortController();
    private pending = false;
    private destroyed = false;
    constructor(private readonly element: HTMLElement, request: (command: ClipboardCommand, data?: DataTransfer) => void) {
        for (const command of ['copy', 'cut', 'paste'] as const) element.addEventListener(command, event => {
            if ((event.target as HTMLElement).closest('textarea, input')) return;
            event.preventDefault(); request(command, event.clipboardData ?? undefined);
        }, { signal: this.abort.signal });
    }
    get busy(): boolean { return this.pending; }
    request(command: ClipboardCommand, text: string, data: DataTransfer | undefined,
        complete: (text: string) => void, fail: (error: unknown) => void): boolean {
        if (this.pending) throw new MindMapError('CLIPBOARD_BUSY', 'A clipboard request is already pending');
        this.pending = true;
        const success = (value: string): void => { this.pending = false; if (!this.destroyed) complete(value); };
        const failure = (error: unknown): void => {
            this.pending = false;
            if (!this.destroyed) fail(error instanceof MindMapError ? error : new MindMapError('CLIPBOARD_DENIED', 'Clipboard access was denied or failed'));
        };
        try {
            if (data) { if (command === 'paste') success(data.getData('text/plain')); else { data.setData('text/plain', text); success(text); } }
            else {
                const clipboard = this.element.ownerDocument.defaultView!.navigator.clipboard;
                if (!clipboard || typeof clipboard[command === 'paste' ? 'readText' : 'writeText'] !== 'function') throw new MindMapError('CLIPBOARD_UNAVAILABLE', 'Clipboard API is unavailable');
                const operation = command === 'paste' ? clipboard.readText() : clipboard.writeText(text).then(() => text);
                void operation.then(success, failure);
            }
        } catch (error) { failure(error); }
        return true;
    }
    destroy(): void { this.destroyed = true; this.abort.abort(); }
}
