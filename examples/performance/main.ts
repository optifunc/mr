import { MindMapEditor } from '../../src';
import { workloadMap } from '../../tests/fixtures/maps';
const start = performance.now();
const editor = new MindMapEditor(document.querySelector('#map')!, { document: workloadMap() });
document.querySelector('#map')!.getBoundingClientRect();
Object.assign(window, { primary: editor, mountDuration: performance.now() - start });
