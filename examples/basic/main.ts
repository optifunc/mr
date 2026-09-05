import { MindMapEditor } from '../../src';
import './style.css';
document.body.innerHTML = '<h1>Mind map · milestone A</h1><p>Foundation checkpoint</p><main><div id="primary"></div><div id="secondary"></div></main>';
const map = { root: { id: 'root', text: 'New Mindmap', children: [] } };
const primary = new MindMapEditor(document.querySelector('#primary')!, { document: map });
const secondary = new MindMapEditor(document.querySelector('#secondary')!, { document: map });
Object.assign(window, { primary, secondary });
