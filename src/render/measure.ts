import type { Model, NodeRecord } from '../model/document';
import { visibleIds } from '../model/document';
import type { LayoutStyle, Size } from '../layout/layout';
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
            const box = element.getBoundingClientRect();
            let width = Math.max(1, box.width), height = Math.max(1, box.height);
            if (element.classList.contains('mindmap-root-node')) {
                const children = [...element.children].map(child => child.getBoundingClientRect());
                const contentWidth = Math.max(...children.map(child => child.right)) - Math.min(...children.map(child => child.left));
                const contentHeight = Math.max(...children.map(child => child.height));
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
    style(): LayoutStyle { const css = getComputedStyle(this.widget); const number = (key: string, fallback: number) => { const n = Number.parseFloat(css.getPropertyValue(key)); return Number.isFinite(n) && n >= 0 ? n : fallback; }; return { siblingGap: number('--mindmap-sibling-gap', 4), branchGap: number('--mindmap-branch-gap', 24), rootGap: number('--mindmap-root-gap', 24), markerRadius: number('--mindmap-marker-radius', 3), chainRise: number('--mindmap-chain-rise', 2) }; }
    destroy(): void { this.element.remove(); this.cache.clear(); }
}
