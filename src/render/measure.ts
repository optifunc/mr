import type { Model, NodeRecord } from '../model/document';
import { visibleIds } from '../model/document';
import type { LayoutStyle, Size } from '../layout/layout';

function localSize(element: Element): Size {
    const css = getComputedStyle(element);
    const pixels = (value: string): number => Number.parseFloat(value) || 0;
    // Resolved CSS sizes retain fractions and are independent of ancestor
    // transforms. DOMRects are screen-space; offsetWidth/Height round to integers.
    const borderBox = css.boxSizing === 'border-box';
    return {
        width: pixels(css.width) + (borderBox ? 0 : pixels(css.paddingLeft) + pixels(css.paddingRight) + pixels(css.borderLeftWidth) + pixels(css.borderRightWidth)),
        height: pixels(css.height) + (borderBox ? 0 : pixels(css.paddingTop) + pixels(css.paddingBottom) + pixels(css.borderTopWidth) + pixels(css.borderBottomWidth)),
    };
}
export function labelElement(doc: Document, n: NodeRecord, root: boolean): HTMLDivElement {
    const element = doc.createElement('div');
    element.className = `mindmap-node${root ? ' mindmap-root-node' : ''}`;
    if (n.checked !== undefined) {
        const checkbox = doc.createElement('input');
        checkbox.className = 'mindmap-checkbox';
        checkbox.type = 'checkbox';
        checkbox.tabIndex = -1;
        checkbox.checked = n.checked;
        checkbox.setAttribute('aria-hidden', 'true');
        element.append(checkbox);
    }
    const label = doc.createElement('span');
    label.className = 'mindmap-label';
    label.textContent = n.text;
    element.append(label);
    return element;
}
export class Measurements {
    private readonly cache = new Map<string, Size>();
    private readonly element: HTMLDivElement;
    constructor(private readonly widget: HTMLElement) { this.element = widget.ownerDocument.createElement('div'); this.element.className = 'mindmap-measure'; this.element.setAttribute('aria-hidden', 'true'); this.element.inert = true; widget.append(this.element); }
    clear(): void { this.cache.clear(); }
    measure(model: Model): Map<string, Size> {
        const result = new Map<string, Size>();
        const pending = new Map<string, HTMLDivElement>();
        const keys = new Map<string, string>();
        const doc = this.widget.ownerDocument;
        for (const id of visibleIds(model)) {
            const n = model.nodes.get(id)!;
            const key = JSON.stringify([n.text, n.checked !== undefined, id === model.rootId]);
            keys.set(id, key);
            if (!this.cache.has(key) && !pending.has(key)) {
                const element = labelElement(doc, n, id === model.rootId);
                this.element.append(element);
                pending.set(key, element);
            }
        }
        // All DOM writes above; measure every new unique label before scene writes.
        for (const [key, element] of pending) {
            const box = localSize(element);
            let width = Math.max(1, box.width), height = Math.max(1, box.height);
            if (element.classList.contains('mindmap-root-node')) {
                const children = [...element.children].map(child => ({ ...localSize(child),
                    offsetY: Number.parseFloat(getComputedStyle(child).top) || 0 }));
                const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
                const contentWidth = children.reduce((sum, child) => sum + child.width, 0) + Math.max(0, children.length - 1) * gap;
                // Content is centered in the root; include optical checkbox lift
                // when finding the furthest vertical corner of the content.
                const contentHeight = Math.max(...children.map(child => child.height + 2 * Math.abs(child.offsetY)));
                // A padded rectangle alone does not guarantee its corners lie inside
                // an ellipse. Preserve the ordinary reference size, but grow for long
                // multiline labels and keep an empty root horizontally proportioned.
                height = Math.max(height, contentHeight * Math.SQRT2);
                const cornerWidth = contentWidth / Math.sqrt(1 - (contentHeight / height) ** 2);
                width = Math.max(width, height * 1.8, cornerWidth + 1);
            }
            this.cache.set(key, { width, height });
        }
        this.element.replaceChildren();
        for (const [id, key] of keys)
            result.set(id, this.cache.get(key)!);
        return result;
    }
    style(): LayoutStyle { const css = getComputedStyle(this.widget); const number = (key: string, fallback: number) => { const n = Number.parseFloat(css.getPropertyValue(key)); return Number.isFinite(n) && n >= 0 ? n : fallback; }; return { siblingGap: number('--mindmap-sibling-gap', 3), rootSiblingGap: number('--mindmap-root-sibling-gap', 4.5), branchGap: number('--mindmap-branch-gap', 20), rootGap: number('--mindmap-root-gap', 20), markerRadius: number('--mindmap-marker-radius', 2.5), chainRise: number('--mindmap-chain-rise', 1.5) }; }
    destroy(): void { this.element.remove(); this.cache.clear(); }
}
