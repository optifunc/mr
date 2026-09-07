/** A native text buffer over frozen scene geometry. It never writes document text. */
export class TextEditor {
    readonly textarea: HTMLTextAreaElement;
    private readonly label: HTMLElement;
    private readonly abort = new AbortController();
    private composing = false;
    constructor(scene: HTMLElement, node: HTMLElement, text: string, limits: { width: number; height: number }, finish: (commit: boolean, focus: boolean) => void) {
        const doc = scene.ownerDocument;
        this.label = node.querySelector<HTMLElement>('.mindmap-label')!;
        const area = doc.createElement('textarea'); this.textarea = area;
        area.className = 'mindmap-editor'; area.value = text; area.wrap = 'off'; area.spellcheck = false;
        area.setAttribute('aria-label', 'Edit node label');
        Object.assign(area.style, {
            left: `${parseFloat(node.style.left) + this.label.offsetLeft - 3}px`, top: `${parseFloat(node.style.top) + this.label.offsetTop - 3}px`,
            width: `${Math.min(limits.width, Math.max(50, parseFloat(getComputedStyle(this.label).width) + 6))}px`, height: `${Math.min(limits.height, Math.max(21, parseFloat(getComputedStyle(this.label).height) + 6))}px`,
        });
        this.label.style.visibility = 'hidden'; node.classList.add('mindmap-editing'); scene.append(area);
        const options = { signal: this.abort.signal };
        area.addEventListener('compositionstart', () => { this.composing = true; }, options);
        area.addEventListener('compositionend', () => { this.composing = false; }, options);
        area.addEventListener('keydown', e => {
            if (this.composing || e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false, true); }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); finish(true, true); }
            // Shift+Enter and all platform text shortcuts stay native.
        }, options);
        area.addEventListener('input', () => {
            area.style.height = '0px'; area.style.height = `${Math.min(limits.height, Math.max(21, area.scrollHeight + 2))}px`;
        }, options);
        doc.addEventListener('pointerdown', e => { if (!area.contains(e.target as Node)) finish(true, false); }, { ...options, capture: true });
        area.addEventListener('blur', () => finish(true, false), options);
        area.focus({ preventScroll: true }); area.select();
    }
    destroy(): void { this.abort.abort(); this.label.style.visibility = ''; this.label.parentElement?.classList.remove('mindmap-editing'); this.textarea.remove(); }
}
