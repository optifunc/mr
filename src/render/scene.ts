import type { Model } from '../model/document';
import type { Selection } from '../types';
import type { Layout } from '../layout/layout';
import { layout } from '../layout/layout';
import { Measurements, labelElement } from './measure';
import { labelUrl } from '../interaction/links';
const NS = 'http://www.w3.org/2000/svg';
let instance = 0;
export class Scene {
    readonly scene: HTMLDivElement;
    private readonly svg: SVGSVGElement;
    private readonly labels: HTMLDivElement;
    private readonly measurements: Measurements;
    private readonly elements = new Map<string, HTMLDivElement>();
    private readonly paths = new Map<string, SVGPathElement>();
    private readonly markers = new Map<string, SVGCircleElement>();
    private readonly ellipse: SVGEllipseElement;
    private readonly prefix = `mindmap-${++instance}`;
    private readonly groups = new Map<string, HTMLDivElement>();
    private serial = 0;
    private readonly ids = new Map<string, string>();
    geometry: Layout | undefined;
    layoutCount = 0;
    private selected = new Set<string>();
    private activeId: string | undefined;
    private previousModel: Model | undefined;
    constructor(private readonly widget: HTMLElement) { const doc = widget.ownerDocument; this.scene = doc.createElement('div'); this.scene.className = 'mindmap-scene'; this.svg = doc.createElementNS(NS, 'svg'); this.svg.classList.add('mindmap-lines'); this.svg.setAttribute('aria-hidden', 'true'); this.labels = doc.createElement('div'); this.labels.className = 'mindmap-nodes'; this.ellipse = doc.createElementNS(NS, 'ellipse'); this.svg.append(this.ellipse); this.scene.append(this.svg, this.labels); widget.append(this.scene); this.measurements = new Measurements(widget); }
    refresh(): void { this.measurements.clear(); }
    nodeElement(id: string): HTMLDivElement | undefined { return this.elements.get(id); }
    center(): void { this.scene.style.transform = `translate(${this.widget.clientWidth / 2}px, ${this.widget.clientHeight / 2}px)`; }
    render(model: Model, selection: Selection, geometry: boolean): Layout {
        if (geometry || !this.geometry) {
            this.geometry = layout(model, this.measurements.measure(model), this.measurements.style());
            this.layoutCount++;
            const live = new Set(this.geometry.nodes.keys());
            for (const [id, element] of this.elements)
                if (!live.has(id)) {
                    element.remove();
                    this.elements.delete(id);
                    this.ids.delete(id);
                    this.groups.get(id)?.remove(); this.groups.delete(id);
                    this.paths.get(id)?.remove();
                    this.paths.delete(id);
                    this.markers.get(id)?.remove();
                    this.markers.delete(id);
                }
            const root = this.geometry.nodes.get(model.rootId)!;
            this.ellipse.setAttribute('cx', '0');
            this.ellipse.setAttribute('cy', '0');
            this.ellipse.setAttribute('rx', String(root.box.width / 2));
            this.ellipse.setAttribute('ry', String(root.box.height / 2));
            for (const g of this.geometry.nodes.values()) {
                const n = model.nodes.get(g.id)!;
                let element = this.elements.get(g.id);
                if (!element) {
                    element = labelElement(this.widget.ownerDocument, n, g.id === model.rootId);
                    this.elements.set(g.id, element);
                    this.labels.append(element);
                    if (!this.ids.has(g.id))
                        this.ids.set(g.id, `${this.prefix}-node-${this.serial++}`);
                    element.id = this.ids.get(g.id)!;
                    element.dataset.nodeId = g.id;
                }
                element.classList.toggle('mindmap-root-node', g.id === model.rootId);
                const oldCheckbox = element.querySelector('input');
                if ((oldCheckbox !== null) !== (n.checked !== undefined))
                    element.replaceChildren(...labelElement(this.widget.ownerDocument, n, g.id === model.rootId).childNodes);
                const label = element.querySelector<HTMLElement>('.mindmap-label')!;
                const link = !!labelUrl(n.text);
                label.textContent = n.text;
                label.classList.toggle('mindmap-link', link);
                Object.assign(element.style, { left: `${g.box.x}px`, top: `${g.box.y}px`, width: `${g.box.width}px`, height: `${g.box.height}px` });
                element.setAttribute('aria-selected', String(selection.ids.includes(n.id)));
                element.setAttribute('role', 'treeitem');
                element.setAttribute('aria-label', n.text || 'Empty label');
                element.setAttribute('aria-level', String(g.depth));
                const siblings = n.parent ? model.nodes.get(n.parent)!.children : [n.id];
                element.setAttribute('aria-posinset', String(siblings.indexOf(n.id) + 1));
                element.setAttribute('aria-setsize', String(siblings.length));
                if (n.children.length)
                    element.setAttribute('aria-expanded', String(!n.collapsed));
                else
                    element.removeAttribute('aria-expanded');
                let path = this.paths.get(n.id);
                const d = this.geometry.paths.get(n.id);
                if (d) {
                    if (!path) {
                        path = this.widget.ownerDocument.createElementNS(NS, 'path');
                        this.paths.set(n.id, path);
                        this.svg.append(path);
                    }
                    path.setAttribute('d', d);
                }
                else if (path) {
                    path.remove();
                    this.paths.delete(n.id);
                }
                let marker = this.markers.get(n.id);
                if (g.marker) {
                    if (!marker) {
                        marker = this.widget.ownerDocument.createElementNS(NS, 'circle');
                        this.markers.set(n.id, marker);
                        this.svg.append(marker);
                    }
                    marker.setAttribute('cx', String(g.marker.x));
                    marker.setAttribute('cy', String(g.marker.y));
                    marker.setAttribute('r', String(g.marker.radius));
                }
                else if (marker) {
                    marker.remove();
                    this.markers.delete(n.id);
                }
            }
            // Explicit ownership supplies hierarchy while every label stays absolutely positioned.
            for (const g of this.geometry.nodes.values()) {
                const n = model.nodes.get(g.id)!;
                const children = n.children.filter(id => live.has(id));
                const element = this.elements.get(g.id)!;
                if (children.length) {
                    let group = this.groups.get(n.id);
                    if (!group) {
                        group = this.widget.ownerDocument.createElement('div');
                        group.id = `${element.id}-group`; group.setAttribute('role', 'group');
                        this.groups.set(n.id, group); this.labels.append(group);
                    }
                    group.setAttribute('aria-owns', children.map(id => this.ids.get(id)!).join(' '));
                    element.setAttribute('aria-owns', group.id);
                } else {
                    element.removeAttribute('aria-owns');
                    this.groups.get(n.id)?.remove(); this.groups.delete(n.id);
                }
            }
            this.widget.dataset.layoutCount = String(this.layoutCount);
        }
        // Checked-state updates reuse geometry and existing DOM controls.
        if (geometry || model !== this.previousModel)
            for (const [id, element] of this.elements) {
                const n = model.nodes.get(id)!;
                if (!geometry && n === this.previousModel?.nodes.get(id))
                    continue;
                const checkbox = element.querySelector('input');
                if (checkbox) {
                    checkbox.checked = n.checked!;
                    element.setAttribute('aria-checked', String(n.checked));
                }
                else
                    element.removeAttribute('aria-checked');
            }
        const next = new Set(selection.ids);
        const affected = new Set([...this.selected, ...next, ...(this.activeId ? [this.activeId] : []), ...(selection.activeId ? [selection.activeId] : [])]);
        for (const id of affected) {
            const element = this.elements.get(id);
            if (element) {
                element.classList.toggle('mindmap-selected', next.has(id));
                element.classList.toggle('mindmap-active', id === selection.activeId);
                element.setAttribute('aria-selected', String(next.has(id)));
            }
        }
        this.previousModel = model;
        this.selected = next;
        this.activeId = selection.activeId;
        if (selection.activeId && this.ids.has(selection.activeId))
            this.widget.setAttribute('aria-activedescendant', this.ids.get(selection.activeId)!);
        else
            this.widget.removeAttribute('aria-activedescendant');
        return this.geometry;
    }
    destroy(): void { this.measurements.destroy(); this.scene.remove(); this.elements.clear(); this.paths.clear(); this.markers.clear(); this.ids.clear(); this.groups.clear(); }
}
