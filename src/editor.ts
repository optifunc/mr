import type { MindMapEditorOptions } from './types';
export class MindMapEditor {
  private readonly element: HTMLDivElement;
  constructor(host: HTMLElement, options: MindMapEditorOptions) {
    this.element = host.ownerDocument.createElement('div');
    this.element.className = 'mindmap'; this.element.tabIndex = 0;
    this.element.setAttribute('role', 'tree'); this.element.setAttribute('aria-label', 'Mind map');
    this.element.textContent = options.document.root.text; host.append(this.element);
  }
  focus(): void { this.element.focus(); }
  destroy(): void { this.element.remove(); }
}
