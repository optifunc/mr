import type { NodeGeometry } from '../layout/layout';
/** A native text buffer over frozen scene geometry. It never writes document text. */
export class TextEditor {
    readonly textarea: HTMLTextAreaElement;
    private readonly label: HTMLElement;
    private readonly abort = new AbortController();
    private composing = false;
    private readonly resizeFrame: (width: number, height: number) => void;
    constructor(scene: HTMLElement, node: HTMLElement, text: string, limits: { width: number; height: number; geometry: NodeGeometry; compact: boolean; creation: boolean }, finish: (commit: boolean, focus: boolean) => void) {
        const doc = scene.ownerDocument;
        this.label = node.querySelector<HTMLElement>('.mindmap-label')!;
        const area = doc.createElement('textarea'); this.textarea = area;
        area.className = 'mindmap-editor'; area.value = text; area.wrap = 'off'; area.spellcheck = false;
        area.setAttribute('aria-label', 'Edit node label');
        const labelStyle = getComputedStyle(this.label), nodeStyle = getComputedStyle(node);
        const labelWidth = parseFloat(labelStyle.width), labelHeight = parseFloat(labelStyle.height);
        const measureText = (value: string): number => {
            const probe = this.label.cloneNode(false) as HTMLElement;
            probe.textContent = value;
            Object.assign(probe.style, { position: 'absolute', width: 'max-content', visibility: 'hidden' });
            scene.append(probe);
            const width = parseFloat(getComputedStyle(probe).width); probe.remove();
            return width;
        };
        const g = limits.geometry;
        // Leaf/collapsed frames must fit at least the rendered node. Provisional
        // parents with visible children retain their creation-width default.
        const preferredWidth = limits.compact ? Math.max(
            Math.ceil(measureText('MMMMMMMM')) + 6,
            node.getAttribute('aria-expanded') === 'true' ? 0 : g.box.width,
        ) : g.box.width;
        const checkbox = node.querySelector('input');
        const prefix = checkbox ? parseFloat(getComputedStyle(checkbox).width) + parseFloat(nodeStyle.columnGap) : 0;
        const inset = g.side === null ? (g.box.width - labelWidth - prefix) / 2 : parseFloat(nodeStyle.paddingLeft);
        const labelLeft = g.box.x + inset + prefix;
        const labelTop = g.box.y + parseFloat(nodeStyle.paddingTop) +
            (g.box.height - parseFloat(nodeStyle.paddingTop) - parseFloat(nodeStyle.paddingBottom) - labelHeight) / 2;
        const top = labelTop - 3;
        // Center the lower 1px painted frame on the branch stroke. Root has an ellipse,
        // so its editor keeps the label-sized vertical frame instead.
        const preferredHeight = g.side === null ? labelHeight + 6 : g.baseline + .5 - top;
        let width = 0, edited = false;
        this.resizeFrame = (maxWidth, maxHeight) => {
            width = Math.min(maxWidth, preferredWidth);
            const height = Math.min(maxHeight, preferredHeight);
            const left = !limits.compact ? g.box.x : g.side === 'left' ? labelLeft + labelWidth + 3 - width : labelLeft - 3;
            let paddingLeft = !limits.compact ? labelLeft - left - 1 :
                g.side === 'left' && !limits.creation ? Math.max(2, width - (edited ? measureText(area.value) : labelWidth) - 4) : 2;
            let paddingRight = !limits.compact ? Math.max(2, g.box.x + g.box.width - labelLeft - labelWidth - 1) : 2;
            // A tall root ellipse can have more alignment padding than a small
            // viewport can fit. Reduce it so CSS cannot enlarge the border box.
            if (!limits.compact && paddingLeft + paddingRight > width - 6) {
                const ratio = Math.max(0, width - 22) / (paddingLeft + paddingRight);
                paddingLeft *= ratio; paddingRight *= ratio;
            }
            // The frame is painted without a layout border; reserve its 1px in padding.
            Object.assign(area.style, {
                left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`,
                paddingLeft: `${paddingLeft + 1}px`,
                paddingRight: `${paddingRight + 1}px`,
                paddingBottom: `${Math.max(0, height - labelHeight - 4) + 1}px`,
                // Full-node and outward-growing left frames can include the checkbox
                // prefix. Keep it visible through padding while text stays opaque.
                ...(checkbox && (!limits.compact || g.side === 'left') ? { backgroundClip: 'content-box' } : {}),
            });
        };
        this.resize(limits.width, limits.height);
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
            edited = true;
            // Preserve the inward text edge on short left-side labels, including
            // multiline labels whose rows stay left-aligned. As text grows, use
            // the available width before native overflow scrolling takes over.
            if (limits.compact && !limits.creation && g.side === 'left') area.style.paddingLeft = `${Math.max(2, width - measureText(area.value) - 4) + 1}px`;
        }, options);
        doc.addEventListener('pointerdown', e => { if (!area.contains(e.target as Node)) finish(true, false); }, { ...options, capture: true });
        area.addEventListener('blur', () => finish(true, false), options);
        area.focus({ preventScroll: true }); area.select();
    }
    /** Resize only the frame: retain focus, selection, composition and native undo. */
    resize(width: number, height: number): void { this.resizeFrame(width, height); }
    destroy(): void { this.abort.abort(); this.label.style.visibility = ''; this.label.parentElement?.classList.remove('mindmap-editing'); this.textarea.remove(); }
}
