import { MindMapEditor } from '../../src';
import { referenceMap, reference100DpiMap, geometryMap, workloadMap } from '../../tests/fixtures/maps';
import './style.css';
const params = new URLSearchParams(location.search);
const workload = params.has('workload'), readonly = params.has('readonly');
document.body.innerHTML = `
<header><h1>Mind map <span>Milestone C · stage-7 review</span></h1>
<p>Clipboard, links and mouse restructuring are ready for review. The accepted default appearance is preserved.</p></header>
<main>
<section><h2>${workload ? '1,000 total / 500 visible nodes' : 'Live reference map'}</h2>
<div class="demo-actions"><button id="select">Select One</button><button id="collapse">Expand / collapse One</button><button id="undo">Undo</button><button id="reset">Reset map</button><a href="${workload ? '/' : '/?workload'}">${workload ? 'Reference fixture' : 'Workload fixture'}</a></div>
<div class="demo-actions"><button id="redo">Redo</button><button id="fit">Fit map</button><button id="zoom-out">−</button><button id="zoom-reset">100%</button><button id="zoom-in">+</button><button id="edit">Edit label</button><button id="block">Select B + C</button><button id="collapsed">Select collapsed node</button><button id="interleaved">Interleaved sides fixture</button><a href="/?readonly">Read-only demo</a><a href="/">Editable demo</a></div>
<div class="review-help"><p>Click a node to select it; click its sole selection again or press F2 to edit. Type to replace the active label. Enter adds a sibling, Shift+Enter adds one before it, Tab adds a child, and Shift+Tab inserts a parent. At the root, Shift+Tab adds a left branch. Enter commits; Shift+Enter adds a line; Escape cancels.</p>
<p>Arrows navigate. Shift+Arrow extends selection; Shift+click selects a range. Command on macOS (Ctrl elsewhere) + click toggles selection; + A selects all; + Up/Down moves and wraps a sibling block; + inward arrow promotes or flips it. Space collapses; Ctrl+Space toggles checkboxes on all platforms. Click a collapsed circle to expand its node. Drag empty canvas or use the wheel to pan; Shift+wheel pans horizontally; Command/Ctrl+wheel zooms at the pointer. Command/Ctrl + plus, minus, 0, Shift+0 zooms, resets, or fits.</p></div>
<div class="review-state"><span id="selection-state"></span><span id="history-state"></span><span id="viewport-state"></span><span>${readonly ? 'Read-only' : 'Editable'}</span></div>
<div id="primary"></div><details><summary>Recent events and committed changes</summary><pre id="events">Ready</pre></details></section>
<section><h2>Geometry and instance isolation</h2><p>Multiline, empty and whitespace labels, independent checkboxes, and literal HTML text. This second mount has its own history.</p><div id="secondary"></div></section>
<section><h2>Side-by-side visual comparison</h2><p>Windows FreeMind at 100% DPI and the current widget (12px Arial, 100% zoom), both displayed at native size. Both are aligned at the root for review. Milestone A default rendering is accepted; milestone B editing is accepted.</p>
<div class="comparison"><figure><figcaption>FreeMind · Windows, 100% DPI</figcaption><img width="605" height="324" src="/docs/free-mind-references/FreeMind-reference-100dpi.png" alt="Supplied FreeMind reference showing a two-sided map"></figure><figure><figcaption>Current widget · accepted default</figcaption><div id="comparison-map"></div></figure></div></section>
<section><h2>Inline editing reference</h2><p>The older editing reference is shown at half its supplied dimensions to compare with the accepted 12px default. Use “Open reference edit” to inspect the live thin-border textarea, then type multiple lines or cancel. Neighboring branches remain fixed while typing.</p><button id="reference-edit">Open reference edit</button><div class="edit-comparison"><figure><figcaption>Supplied FreeMind editing reference · 50%</figcaption><img src="/docs/free-mind-references/FreeMind-reference-editing.png" alt="FreeMind inline editing reference"></figure><figure><figcaption>Live editing fixture · 100%</figcaption><div id="editing-map"></div></figure></div></section>
<section><h2>Clipboard and restructuring exercises</h2><div class="demo-actions"><button id="clipboard-fixture">Load clipboard + links fixture</button><button id="copy">Copy selection</button><button id="cut">Cut selection</button><button id="paste">Paste into active node</button><button id="link">Open active link</button><button id="drag-reset">Reset drag comparison</button></div><p>Command/Ctrl+C, X and V use the system clipboard. Copy uses four spaces per level. Paste accepts tabs, two-space or four-space outlines, including mixed indentation; four spaces wins when ambiguous. Odd space counts and skipped levels report an error without changing the map. Copy mixed checkbox/multiline branches from the fixture and paste into another node. Undo and redo each operation once. Command/Ctrl+click opens a URL label; its branch line still toggles selection. The event panel above reports clipboard completion or errors.</p><p>Select B and C, then drag either label. The darkest edge shows the result: top inserts before, bottom after, and the outward edge adds children. Root halves choose the side. Top/bottom quarters win at corners. In the half nearest the parent, hover above the vertical midpoint to insert before or below it to insert after (mirrored on left branches). Valid drops use the regular arrow; invalid and ineffective moves show a prohibited cursor with no gradient. Escape cancels; the viewport pans near an edge. Drop into Collapsed node and expand its circle to find the moved children.</p></section>
<section><h2>Drag reference comparison</h2><p>Supplied drag reference at 50% beside the live 100% widget. B and C start selected. Drag C toward the right edge of N1 to reproduce the reference gradient. The red arrow/text in the reference are annotations, not widget UI.</p><div class="drag-comparison"><figure><figcaption>FreeMind drag reference · 50%</figcaption><img width="597" height="280" src="/docs/free-mind-references/FreeMind-reference-DnD.png" alt="FreeMind drag reference with B and C selected and outward gradient on N1"></figure><figure><figcaption>Live widget · drag B + C</figcaption><div id="drag-map"></div></figure></div></section>
<section><h2>Stage-7 review evidence</h2><p><a href="/docs/evidence/milestone-c/report.md">Milestone C report, screenshots and known gaps</a> · <a href="/docs/evidence/milestone-c/checks.txt">Build, type and unit results</a> · <a href="/docs/evidence/milestone-c/browser.txt">Full browser results</a> · <a href="/docs/acceptance.md">Product review exercises</a></p><p>Stage 7 is the current product checkpoint. Menus, packaged-consumer checks, actual stable browser and screen-reader checks, and final performance validation remain milestone D.</p></section>
</main>`;
const primary = new MindMapEditor(document.querySelector('#primary')!, { document: workload ? workloadMap() : referenceMap(), readonly });
const secondary = new MindMapEditor(document.querySelector('#secondary')!, { document: geometryMap() });
const comparison = new MindMapEditor(document.querySelector('#comparison-map')!, { document: reference100DpiMap() });
comparison.panTo(204, 159);
const editing = new MindMapEditor(document.querySelector('#editing-map')!, { document: reference100DpiMap() });
editing.panTo(224, 156);
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

const act = (id: string, action: () => void): void => { document.querySelector(`#${id}`)!.addEventListener('click', action); };
act('redo', () => { primary.redo(); primary.focus(); });
act('fit', () => { primary.fit(); primary.focus(); });
act('zoom-out', () => { primary.execute({ type: 'zoomOut' }); primary.focus(); });
act('zoom-in', () => { primary.execute({ type: 'zoomIn' }); primary.focus(); });
act('zoom-reset', () => { primary.setZoom(1); primary.focus(); });
act('edit', () => { primary.execute({ type: 'edit' }); });
act('block', () => { primary.setSelection(['b', 'c'], 'c'); primary.panToNode('b'); primary.focus(); });
act('collapsed', () => { primary.setSelection(['collapsed']); primary.panToNode('collapsed'); primary.focus(); });
act('interleaved', () => { const doc = referenceMap(); const [l1, l2, r1, r2, r3] = doc.root.children; doc.root.children = [r1!, l1!, r2!, l2!, r3!]; primary.setDocument(doc); primary.setSelection(['one', 'two'], 'two'); primary.fit(); primary.focus(); });
act('reference-edit', () => { editing.setDocument(reference100DpiMap()); editing.panTo(224, 156); editing.editNode('single'); });
const events: string[] = [];
const update = (): void => {
    const selection = primary.getSelection(), view = primary.getViewport();
    document.querySelector('#selection-state')!.textContent = `Selection: ${selection.ids.join(', ') || 'none'} · Active: ${selection.activeId ?? 'none'}`;
    document.querySelector('#history-state')!.textContent = `Undo: ${primary.canUndo() ? 'available' : 'empty'} · Redo: ${primary.canRedo() ? 'available' : 'empty'}`;
    document.querySelector('#viewport-state')!.textContent = `Zoom: ${Math.round(view.zoom * 100)}%`;
};
for (const type of ['documentchange', 'selectionchange', 'editstart', 'editcommit', 'editcancel', 'error', 'commandcomplete', 'linkopen'] as const) primary.on(type, event => {
    events.unshift(`${type} ${JSON.stringify(type === 'documentchange' ? { origin: event && 'origin' in event ? event.origin : '', command: 'command' in event ? event.command : '' } : event)}`);
    document.querySelector('#events')!.textContent = events.slice(0, 12).join('\n'); update();
});
primary.on('viewportchange', update); update();
if (workload) for (const id of ['block', 'collapsed']) (document.getElementById(id) as HTMLButtonElement).disabled = true;
Object.assign(window, { editing });

const dragDemo = new MindMapEditor(document.querySelector('#drag-map')!, { document: reference100DpiMap(), readonly });
const resetDrag = (): void => { dragDemo.setDocument(reference100DpiMap()); dragDemo.panTo(208, 134); dragDemo.setSelection(['b', 'c'], 'c'); };
resetDrag();
act('drag-reset', resetDrag);
for (const type of ['copy', 'cut', 'paste'] as const) act(type, () => { primary.execute({ type }); primary.focus(); });
act('link', () => { primary.execute({ type: 'openLink' }); primary.focus(); });
act('clipboard-fixture', () => {
    primary.setDocument({ root: { id: 'root', text: 'Clipboard + links', children: [
        { id: 'mixed', text: 'Release\nSecond line', checked: false, side: 'left', collapsed: true, children: [
            { id: 'done', text: 'Code complete', checked: true, children: [] },
            { id: 'escaped', text: '[x] literal marker\nBackslash \\ and tab\tend', children: [] },
            { id: 'empty', text: '', children: [] },
        ] },
        { id: 'destination', text: 'Paste here', side: 'right', children: [] },
        { id: 'url', text: 'https://example.com/', side: 'right', children: [] },
        { id: 'prose', text: 'See https://example.com/', side: 'right', children: [] },
    ] } });
    primary.setSelection(['mixed']); primary.fit(); primary.setZoom(Math.min(1, primary.getViewport().zoom)); primary.focus();
});
Object.assign(window, { dragDemo });
