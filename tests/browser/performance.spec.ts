import type { MindMapNode } from '../../src';
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { arch, cpus, platform, release, totalmem } from 'node:os';
import { profileWheel } from './helpers/profile-input';
import { profileProvenance } from './helpers/profile-provenance';
const evidence = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/performance';
mkdirSync(evidence, { recursive: true });
declare global { interface Window { mountDuration: number; perfSamples: Record<string, number[]> } }
test('release workload: cold/font load, relayout, actual input rendering opportunities and frame traces', async ({ page, browser }, info) => {
    const provenance = profileProvenance(info);
    await page.goto('/examples/performance/index.html'); await page.evaluate(() => document.fonts.ready);
    const cold = await page.evaluate(() => ({ mountMs: window.mountDuration, navigation: performance.getEntriesByType('navigation')[0]!.toJSON(), paints: performance.getEntriesByType('paint').map(e => e.toJSON()) }));
    const metrics = await page.evaluate(async () => {
        const tree = document.querySelector<HTMLElement>('.mindmap')!, editor = window.primary;
        const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const full: number[] = [], structural: number[] = [];
        const font = new FontFace('MindmapProfileArial', 'local(Arial)');
        const start = performance.now(); await font.load(); document.fonts.add(font);
        tree.style.setProperty('--mindmap-font-family', 'MindmapProfileArial'); editor.refreshLayout(); tree.getBoundingClientRect();
        const fontLoadAndRefreshMs = performance.now() - start;
        for (let i = 0; i < 35; i++) {
            await frame(); let start = performance.now(); editor.refreshLayout(); tree.getBoundingClientRect(); if (i >= 5) full.push(performance.now() - start);
            await frame(); start = performance.now(); editor.execute({ type: 'setText', targetId: 'branch-498', text: `Changed ${i % 2}` }); tree.getBoundingClientRect(); if (i >= 5) structural.push(performance.now() - start);
        }
        const snapshot = editor.getDocument(), stack: MindMapNode[] = [snapshot.root]; let total = 0;
        while (stack.length) { const n = stack.pop()!; total++; stack.push(...n.children); }
        editor.setSelection(['branch-498']); editor.panToNode('branch-498'); editor.focus();
        window.perfSamples = { pointerdown: [], keydown: [], wheel: [], pointerdownHandler: [], keydownHandler: [], wheelHandler: [], frames: [], documentEvents: [] };
        editor.on('documentchange', () => window.perfSamples.documentEvents!.push(1));
        // rAF then task observes a browser rendering opportunity, not physical display presentation.
        for (const type of ['pointerdown', 'keydown', 'wheel']) {
            let start = 0;
            tree.addEventListener(type, () => { start = performance.now(); const accepted = start; requestAnimationFrame(() => setTimeout(() => window.perfSamples[type]!.push(performance.now() - accepted), 0)); }, { capture: true });
            tree.addEventListener(type, () => { tree.getBoundingClientRect(); window.perfSamples[type + 'Handler']!.push(performance.now() - start); });
        }
        return { full, structural, fontLoadAndRefreshMs, total, visible: tree.querySelectorAll('.mindmap-nodes .mindmap-node').length, layoutCount: tree.dataset.layoutCount, font: getComputedStyle(tree).font };
    });
    expect(metrics.total).toBe(1000); expect(metrics.visible).toBe(500);
    const cdp = info.project.name === 'chromium' ? await page.context().newCDPSession(page) : undefined;
    if (cdp) await cdp.send('Tracing.start', { categories: 'devtools.timeline,benchmark,cc,input', transferMode: 'ReturnAsStream' });
    await page.evaluate(() => {
        let last = performance.now(), count = 0;
        const tick = (time: number): void => { window.perfSamples.frames!.push(time - last); last = time; if (++count < 240) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    });
    const tree = page.locator('.mindmap');
    // Alternate nodes that are already revealed so clicks exercise selection, not edit.
    await page.evaluate(() => { window.primary.setSelection(['branch-497']); window.primary.panToNode('branch-498'); });
    const nodeA = tree.locator('[data-node-id="branch-497"]'), nodeB = tree.locator('[data-node-id="branch-498"]');
    for (let i = 0; i < 30; i++) { await (i % 2 ? nodeA : nodeB).click(); await page.waitForTimeout(20); }
    for (let i = 0; i < 30; i++) { await page.keyboard.press(i % 2 ? 'ArrowDown' : 'ArrowUp'); await page.waitForTimeout(20); }
    await tree.hover();
    const pan = await profileWheel(page, 'pan', 30);
    const zoom = await profileWheel(page, 'zoom', 30);
    await page.waitForTimeout(100);
    if (cdp) {
        const complete = new Promise<{ stream: string }>(resolve => cdp.once('Tracing.tracingComplete', result => resolve({ stream: result.stream! })));
        await cdp.send('Tracing.end'); const { stream } = await complete;
        let data = '';
        for (;;) { const chunk = await cdp.send('IO.read', { handle: stream }); data += chunk.data; if (chunk.eof) break; }
        await cdp.send('IO.close', { handle: stream });
        // Retain frame/input/paint records and metadata; exclude large unrelated timeline detail.
        const trace = JSON.parse(data) as { traceEvents: { name: string; ph: string }[] };
        trace.traceEvents = trace.traceEvents.filter(e => e.ph === 'M' || /Frame|Paint|EventDispatch|Latency|Input|Animation/.test(e.name));
        writeFileSync(`${evidence}/frames-chromium.json.gz`, gzipSync(JSON.stringify(trace)));
    }
    const after = await page.evaluate(() => ({ samples: window.perfSamples, layoutCount: document.querySelector<HTMLElement>('.mindmap')!.dataset.layoutCount, visible: document.querySelectorAll('.mindmap-nodes .mindmap-node').length }));
    expect(after.layoutCount).toBe(metrics.layoutCount); expect(after.visible).toBe(500);
    expect(after.samples.documentEvents).toEqual([]);
    expect(after.samples.pointerdown).toHaveLength(30); expect(after.samples.keydown!.length).toBeGreaterThanOrEqual(30); expect(after.samples.wheel).toHaveLength(60);
    const summary = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1], samples: values }; };
    const finishedProvenance = profileProvenance(info);
    expect(finishedProvenance.sourceDigest).toBe(provenance.sourceDigest);
    expect(finishedProvenance.revision).toBe(provenance.revision);
    const report = { date: new Date().toISOString(), provenance, measurement: { warmups: 5, samples: 30 },
        browser: info.project.name, version: browser.version(), os: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryGB: Math.round(totalmem() / 2 ** 30) }, viewport: page.viewportSize(), deviceScaleFactor: await page.evaluate(() => devicePixelRatio), cold,
        input: { pan, zoom }, verification: { initialLayoutCount: metrics.layoutCount, finalLayoutCount: after.layoutCount, documentEvents: after.samples.documentEvents!.length, finalVisible: after.visible },
        total: metrics.total, visible: metrics.visible, font: metrics.font, fontLoadAndRefreshMs: metrics.fontLoadAndRefreshMs,
        fullMeasurementRelayoutMs: summary(metrics.full), structuralCommandMs: summary(metrics.structural),
        inputToRenderingOpportunityMs: Object.fromEntries(Object.entries(after.samples).filter(([k]) => ['pointerdown', 'keydown', 'wheel'].includes(k)).map(([key, values]) => [key, summary(values)])), synchronousInputHandlerMs: Object.fromEntries(Object.entries(after.samples).filter(([k]) => k.endsWith('Handler')).map(([key, values]) => [key, summary(values)])),
        panRenderingOpportunityMs: summary(after.samples.wheel!.slice(0, 30)), zoomRenderingOpportunityMs: summary(after.samples.wheel!.slice(30)), frameIntervalsMs: summary(after.samples.frames!),
        notes: '30 warmed relayout samples after 5 warmups. Full includes uncached measurement, layout, DOM and forced layout flush. Structural includes mutation/history, cached measurements, DOM and layout flush. Cold mount excludes module fetch; navigation/paint entries are separate. Font load uses local Arial via a newly loaded FontFace, not network. Trusted pointer/keyboard/wheel input to rAF+task measures a rendering opportunity, NOT physical presentation. Headless frame cadence is not a manual smoothness claim. Chromium trace retains actual frame/paint/input records. No hardware timing assertions. Selection/navigation/pan/zoom leave layout count and 500 rendered nodes unchanged.' };
    writeFileSync(`${evidence}/profile-${info.project.name}.json`, JSON.stringify(report, null, 2) + '\n');
    await tree.screenshot({ path: `${evidence}/workload-${info.project.name}.png` });
});
