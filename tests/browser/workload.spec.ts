import type { MindMapNode } from '../../src/types';
import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { cpus, platform, release, arch, totalmem } from 'node:os';
test('workload early full-relayout diagnostic', async ({ page, browser }, info) => {
    await page.goto('/?workload');
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(async () => {
        const widget = document.querySelector('#primary .mindmap')!;
        const count = widget.querySelectorAll('.mindmap-nodes .mindmap-node').length;
        const documentSnapshot = window.primary.getDocument();
        let total = 0;
        const stack: MindMapNode[] = [documentSnapshot.root];
        while (stack.length) {
            const n = stack.pop()!;
            total++;
            stack.push(...n.children);
        }
        const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const full: number[] = [], selection: number[] = [], cached: number[] = [];
        await frame();
        const coldStart = performance.now();
        window.primary.refreshLayout();
        widget.getBoundingClientRect();
        const cold = performance.now() - coldStart;
        for (let i = 0; i < 30; i++) {
            await frame();
            let start = performance.now();
            window.primary.refreshLayout();
            widget.getBoundingClientRect();
            full.push(performance.now() - start);
            await frame();
            start = performance.now();
            window.primary.execute({ type: 'setText', targetId: 'branch-498', text: `Changed ${i % 2}` });
            widget.getBoundingClientRect();
            cached.push(performance.now() - start);
            await frame();
            start = performance.now();
            window.primary.setSelection([`branch-${i}`]);
            widget.querySelector(`[data-node-id="branch-${i}"]`)!.getBoundingClientRect();
            selection.push(performance.now() - start);
        }
        const summary = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)]!, p95: sorted[Math.ceil(sorted.length * .95) - 1]!, samples: values }; };
        return { total, visible: count, coldMeasurementRefreshMs: cold, fullMeasurementRefreshMs: summary(full), cachedStructuralCommandMs: summary(cached), selectionSynchronousMs: summary(selection), font: getComputedStyle(widget).font, deviceScale: devicePixelRatio, viewport: { width: innerWidth, height: innerHeight } };
    });
    expect(result.total).toBe(1000);
    expect(result.visible).toBe(500);
    const report = { date: new Date().toISOString(), browser: info.project.name, version: browser.version(), os: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryGB: Math.round(totalmem() / 2 ** 30) }, ...result, notes: 'Early diagnostic; timings include synchronous DOM/layout flush, not presentation. No hardware-specific pass threshold. Cold is first explicit font-ready cache invalidation, not initial navigation/font load. Final input-to-paint, frame traces, and cold/font-load profiling remain stage 9.' };
    writeFileSync(`docs/evidence/milestone-a/spacing/workload-${info.project.name}.json`, JSON.stringify(report, null, 2) + '\n');
    await page.locator('#primary').screenshot({ path: `docs/evidence/milestone-a/spacing/workload-${info.project.name}.png` });
});
