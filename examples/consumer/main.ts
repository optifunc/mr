import { ContextMenu, MindMapEditor, formatShortcut, getKeymapReference, isMacPlatform, shortcutGroups } from '@mindmap/widget';
import type { MindMapDocument, MindMapEditorEvents } from '@mindmap/widget';
import '@mindmap/widget/styles.css';
import './style.css';
const document: MindMapDocument = { root: { id: 'root', text: 'Consumer map', children: [
    { id: 'task', text: 'Packaged task', side: 'right', checked: false, children: [] },
    { id: 'url', text: 'https://example.com/', side: 'left', children: [] },
] } };
const host = window.document.querySelector<HTMLElement>('#first')!;
let first: MindMapEditor;
host.style.position = 'relative';
const menu = new ContextMenu(host, command => first.canExecute(command), command => { first.execute(command); });
const more = window.document.querySelector<HTMLButtonElement>('#commands')!;
const mount = (): void => {
    menu.close(); first?.destroy(); first = new MindMapEditor(host, { document });
    first.setSelection(['task']);
    first.on('documentchange', (event: MindMapEditorEvents['documentchange']) => {
        window.document.querySelector('#events')!.textContent = JSON.stringify(event, null, 2);
    });
    first.on('linkopen', event => event.preventDefault());
    for (const event of ['documentchange', 'selectionchange', 'viewportchange', 'editstart'] as const)
        first.on(event, () => menu.close());
    Object.assign(window, { consumer: first });
};
mount();
const second = new MindMapEditor(window.document.querySelector('#second')!, { document, readonly: true });
Object.assign(window, { consumerReadonly: second });
window.document.querySelector('#destroy')!.addEventListener('click', () => { menu.close(); first.destroy(); });
window.document.querySelector('#mount')!.addEventListener('click', mount);
window.document.querySelector('#undo')!.addEventListener('click', () => first.undo());
more.addEventListener('click', () => {
    const bounds = host.getBoundingClientRect(), anchor = more.getBoundingClientRect();
    menu.open([...first.getNodeMenuItems(), {
        label: 'Host action', separatorBefore: true, canExecute: () => true,
        action: () => { window.document.querySelector('#events')!.textContent = 'Host action completed'; },
    }], anchor.left - bounds.left, anchor.bottom - bounds.top, { returnFocus: more, label: 'Consumer commands' });
});
const reference = window.document.querySelector('#keymap')!;
const mac = isMacPlatform(navigator.platform);
for (const group of shortcutGroups) {
    const heading = window.document.createElement('h3'); heading.textContent = group; reference.append(heading);
    const list = window.document.createElement('dl'); reference.append(list);
    for (const action of getKeymapReference().filter(action => action.group === group)) {
        const label = window.document.createElement('dt'), keys = window.document.createElement('dd');
        label.textContent = action.label; keys.textContent = action.bindings.map(binding => formatShortcut(binding, mac)).join(' / ');
        keys.dataset.action = action.id; list.append(label, keys);
    }
}
