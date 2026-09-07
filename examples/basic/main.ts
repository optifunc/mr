import { MindMapEditor } from '../../src';
import { referenceMap, reference100DpiMap, geometryMap, workloadMap } from '../../tests/fixtures/maps';
import './style.css';
const workload = new URLSearchParams(location.search).has('workload');
document.body.innerHTML = `
<header><h1>Mind map <span>Milestone A · appearance review</span></h1>
<p>Reference fixture at 100%. Model commands are available through the demo buttons and public API. Mouse navigation and editing arrive in milestone B.</p></header>
<main>
<section><h2>${workload ? '1,000 total / 500 visible nodes' : 'Live reference map'}</h2>
<div class="demo-actions"><button id="select">Select One</button><button id="collapse">Expand / collapse One</button><button id="undo">Undo</button><button id="reset">Reset map</button><a href="${workload ? '/' : '/?workload'}">${workload ? 'Reference fixture' : 'Workload fixture'}</a></div>
<div id="primary"></div></section>
<section><h2>Geometry and instance isolation</h2><p>Multiline, empty and whitespace labels, independent checkboxes, and literal HTML text. This second mount has its own history.</p><div id="secondary"></div></section>
<section><h2>Side-by-side visual comparison</h2><p>Windows FreeMind at 100% DPI and the current widget (12px Arial, 100% zoom), both displayed at native size. Both are aligned at the root for review. Candidate rendering awaits acceptance.</p>
<div class="comparison"><figure><figcaption>FreeMind · Windows, 100% DPI</figcaption><img width="605" height="324" src="/docs/free-mind-references/FreeMind-reference-100dpi.png" alt="Supplied FreeMind reference showing a two-sided map"></figure><figure><figcaption>Current widget · candidate</figcaption><div id="comparison-map"></div></figure></div></section>
</main>`;
const primary = new MindMapEditor(document.querySelector('#primary')!, { document: workload ? workloadMap() : referenceMap() });
const secondary = new MindMapEditor(document.querySelector('#secondary')!, { document: geometryMap() });
const comparison = new MindMapEditor(document.querySelector('#comparison-map')!, { document: reference100DpiMap() });
primary.setSelection(workload ? ['root'] : ['one']);
secondary.setSelection(['multi', 'checked'], 'multi');
comparison.setSelection(['root']);
document.querySelector('#select')!.addEventListener('click', () => { primary.setSelection(['one']); primary.focus(); });
document.querySelector('#collapse')!.addEventListener('click', () => primary.execute({ type: 'toggleCollapse', targetId: 'one' }));
document.querySelector('#undo')!.addEventListener('click', () => primary.undo());
document.querySelector('#reset')!.addEventListener('click', () => { primary.setDocument(workload ? workloadMap() : referenceMap()); primary.setSelection(workload ? ['root'] : ['one']); });
if (workload)
    for (const id of ['select', 'collapse'])
        (document.getElementById(id) as HTMLButtonElement).disabled = true;
Object.assign(window, { primary, secondary, comparison });
