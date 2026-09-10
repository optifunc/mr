import { MindMapEditor } from '@mindmap/widget';
import type { MindMapDocument, MindMapEditorEvents } from '@mindmap/widget';
import '@mindmap/widget/styles.css';
import './style.css';
const document: MindMapDocument = { root: { id: 'root', text: 'Consumer map', children: [
    { id: 'task', text: 'Packaged task', side: 'right', checked: false, children: [] },
    { id: 'url', text: 'https://example.com/', side: 'left', children: [] },
] } };
const host = window.document.querySelector<HTMLElement>('#first')!;
let first: MindMapEditor;
const mount = (): void => {
    first?.destroy(); first = new MindMapEditor(host, { document });
    first.setSelection(['task']);
    first.on('documentchange', (event: MindMapEditorEvents['documentchange']) => {
        window.document.querySelector('#events')!.textContent = JSON.stringify(event, null, 2);
    });
    first.on('linkopen', event => event.preventDefault());
    Object.assign(window, { consumer: first });
};
mount();
const second = new MindMapEditor(window.document.querySelector('#second')!, { document, readonly: true });
Object.assign(window, { consumerReadonly: second });
window.document.querySelector('#destroy')!.addEventListener('click', () => first.destroy());
window.document.querySelector('#mount')!.addEventListener('click', mount);
window.document.querySelector('#undo')!.addEventListener('click', () => first.undo());
