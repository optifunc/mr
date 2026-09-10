import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const engines = ['chromium', 'firefox', 'webkit'];
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const requireValue = (condition, message) => { if (!condition) throw Error(`Invalid performance evidence: ${message}`); };
const text = value => String(value).replace(/[|\n\r]/g, ' ');
const number = value => value.toFixed(2);

export function metric(values) {
    requireValue(Array.isArray(values) && values.length > 0 && values.every(finite), 'missing, empty or non-finite samples');
    const sorted = [...values].sort((a, b) => a - b);
    return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
}
function checkedMetric(value) {
    const derived = metric(value?.samples);
    requireValue(value.median === derived.median && value.p95 === derived.p95, 'stored summary disagrees with raw samples');
    return derived;
}

export function summarizeProfiles(input) {
    requireValue(Array.isArray(input) && input.length === 3 && engines.every(name => input.filter(p => p.browser === name).length === 1), 'need one profile per engine');
    const profiles = engines.map(name => structuredClone(input.find(p => p.browser === name)));
    for (const p of profiles) {
        requireValue(Number.isFinite(Date.parse(p.date)), 'missing profile date');
        const s = p.provenance;
        requireValue(s && typeof s.runId === 'string' && s.runId && /^[a-f0-9]{40}$/.test(s.revision) && /^[a-f0-9]{64}$/.test(s.sourceDigest) && typeof s.sourceDirty === 'boolean', 'missing run/source provenance; reprofile legacy evidence');
        requireValue(Array.isArray(s.dirtyPaths) && Array.isArray(s.sourcePaths) && s.sourcePaths.length > 0, 'missing source manifest');
        requireValue(typeof s.headless === 'boolean' && Number.isInteger(s.workers) && s.workers > 0 && typeof s.concurrency === 'string', 'missing execution conditions');
        requireValue(p.os?.cpu && p.os.platform && p.os.release && p.os.arch && finite(p.os.memoryGB) && finite(p.os.logicalCpus) && p.version && p.font, 'missing environment');
        requireValue(finite(p.viewport?.width) && p.viewport.width > 0 && finite(p.viewport?.height) && p.viewport.height > 0 && finite(p.deviceScaleFactor) && p.deviceScaleFactor > 0, 'missing viewport/DPR');
        requireValue(finite(p.cold?.mountMs) && finite(p.fontLoadAndRefreshMs), 'invalid cold/font measurements');
        requireValue(Number.isInteger(p.measurement?.warmups) && p.measurement.warmups >= 0 && Number.isInteger(p.measurement?.samples) && p.measurement.samples > 0, 'missing measurement counts');
        requireValue(p.total === 1000 && p.visible === 500 && p.verification?.finalVisible === 500 && p.verification.documentEvents === 0 && p.verification.initialLayoutCount !== undefined && p.verification.initialLayoutCount === p.verification.finalLayoutCount, 'workload/render invariants did not pass');
        for (const kind of ['pan', 'zoom']) {
            const gesture = p.input?.[kind];
            requireValue(gesture && typeof gesture.platform === 'string' && gesture.platform && gesture.transitions?.length === p.measurement.samples, `missing verified ${kind} transitions`);
            const modifier = /Mac|iPhone|iPad/.test(gesture.platform) ? 'Meta' : 'Control';
            requireValue(gesture.modifier === (kind === 'zoom' ? modifier : null), 'wrong platform modifier');
            for (const { before, after, delta } of gesture.transitions) {
                requireValue(before && after && ['x', 'y', 'zoom'].every(key => Number.isFinite(before[key]) && Number.isFinite(after[key])) && Number.isFinite(delta) && delta !== 0, 'invalid viewport transition');
                requireValue(kind === 'pan'
                    ? before.zoom === after.zoom && before.x === after.x && Math.sign(after.y - before.y) === -Math.sign(delta)
                    : Math.sign(after.zoom - before.zoom) === -Math.sign(delta), `${kind} input did not perform its intended action`);
            }
        }
        p.full = checkedMetric(p.fullMeasurementRelayoutMs); p.structural = checkedMetric(p.structuralCommandMs);
        for (const value of [p.fullMeasurementRelayoutMs, p.structuralCommandMs, p.panRenderingOpportunityMs, p.zoomRenderingOpportunityMs]) requireValue(value?.samples?.length === p.measurement.samples, 'wrong sample count');
        p.pan = checkedMetric(p.panRenderingOpportunityMs); p.zoom = checkedMetric(p.zoomRenderingOpportunityMs); p.frames = checkedMetric(p.frameIntervalsMs);
        p.selection = checkedMetric(p.inputToRenderingOpportunityMs?.pointerdown); p.navigation = checkedMetric(p.inputToRenderingOpportunityMs?.keydown);
        p.handlers = ['pointerdownHandler', 'keydownHandler', 'wheelHandler'].map(key => checkedMetric(p.synchronousInputHandlerMs?.[key]));
    }
    const first = profiles[0], source = first.provenance;
    const compatibility = p => JSON.stringify([p.provenance.runId, p.provenance.revision, p.provenance.sourceDigest, p.provenance.sourceDirty, p.os, p.viewport, p.deviceScaleFactor, p.provenance.headless, p.provenance.workers, p.provenance.concurrency, p.measurement]);
    requireValue(profiles.every(p => compatibility(p) === compatibility(first)), 'profiles belong to different runs, sources or execution environments');
    const failures = profiles.filter(p => p.full.p95 > 100);
    const outcome = failures.length
        ? `**Full-relayout target: FAILED.** Above 100 ms: ${failures.map(p => `${p.browser} (${number(p.full.p95)} ms p95)`).join(', ')}.`
        : '**Full-relayout target: MET.** Every full-relayout p95 is at or below 100 ms on the recorded hardware.';
    const tails = profiles.filter(p => [p.selection, p.navigation, p.pan, p.zoom, p.frames].some(m => m.p95 > 1000 / 60));
    const pair = m => `${number(m.median)} / ${number(m.p95)}`;
    const report = `# Performance evidence

${outcome}

## Run and provenance

Run: \`${text(source.runId)}\`. Revision: \`${source.revision}\`.
Source dirty: **${source.sourceDirty}**. SHA-256 of the scoped source manifest:
\`${source.sourceDigest}\`. Full source paths and dirty paths are retained in each JSON.
Evidence files are outside that source scope.

Hardware: ${text(first.os.cpu)}, ${first.os.logicalCpus} logical CPUs, ${first.os.memoryGB} GB RAM;
${text(first.os.platform)} ${text(first.os.release)}, ${text(first.os.arch)}.
Headless: ${source.headless}; workers: ${source.workers}; viewport:
${first.viewport.width}×${first.viewport.height}; DPR: ${first.deviceScaleFactor}.
Other workload/concurrency: ${text(source.concurrency)}. This is a recorded operator
statement, not automatic detection of other applications or operating-system work.

| Engine | Version | Captured UTC | Browser channel | Navigator platform | Font |
|---|---|---|---|---|---|
${profiles.map(p => `| ${p.browser} | ${text(p.version)} | ${text(p.date)} | ${text(p.provenance.channel ?? 'bundled')} | ${text(p.input.zoom.platform)} | ${text(p.font)} |`).join('\n')}

## Relayout and cold load

Milliseconds; warmed median / p95 from ${first.measurement.samples} samples after
${first.measurement.warmups} warmups. Summaries are checked against raw samples.

| Engine | Cold mount + DOM flush | Local font load + refresh | Uncached full relayout | Cached structural command |
|---|---:|---:|---:|---:|
${profiles.map(p => `| ${p.browser} | ${number(p.cold.mountMs)} | ${number(p.fontLoadAndRefreshMs)} | ${pair(p.full)} | ${pair(p.structural)} |`).join('\n')}

Uncached refresh includes measurement, layout, DOM application and forced browser
layout. Structural commands also include mutation/history and use cached measurement.
Cold mount excludes module fetch; navigation/paint entries are separate. The FontFace
loads local Arial and refreshes geometry, rather than downloading a remote font.

## Verified input and frame opportunities

All three profiles verify 1,000 total / 500 visible nodes, unchanged layout/render
counts and no document events during input. Each pan changes translation without
changing zoom; each zoom uses the platform modifier and changes zoom in the expected
direction. Before/after viewport values for every wheel gesture are retained.

| Engine | Selection | Navigation | Pan | Zoom | Frame interval |
|---|---:|---:|---:|---:|---:|
${profiles.map(p => `| ${p.browser} | ${pair(p.selection)} | ${pair(p.navigation)} | ${pair(p.pan)} | ${pair(p.zoom)} | ${pair(p.frames)} |`).join('\n')}

${tails.length ? `Input/opportunity or frame p95 exceeds a nominal 16.67 ms frame in: ${tails.map(p => p.browser).join(', ')}.` : 'No recorded input/opportunity or frame p95 exceeds a nominal 16.67 ms frame.'}
These rAF-plus-task measurements identify rendering opportunities, not physical
input-to-display presentation. The keyboard array includes the modifier keydown.
Headless timing cannot establish manual smoothness or screen presentation.

| Engine | Selection handler | Navigation handler | Wheel handler |
|---|---:|---:|---:|
${profiles.map(p => `| ${p.browser} | ${p.handlers.map(pair).join(' | ')} |`).join('\n')}

## Evidence and reproduction

- [Chromium samples](profile-chromium.json), [Firefox samples](profile-firefox.json), [WebKit samples](profile-webkit.json)
- [Chromium view](workload-chromium.png), [Firefox view](workload-firefox.png), [WebKit view](workload-webkit.png)
- [Chromium frame/input/paint trace](frames-chromium.json.gz); decompress to JSON for DevTools.

Run \`pnpm dev --port 5173 --strictPort\`, then
\`MINDMAP_EVIDENCE=<new-directory> pnpm test:browser performance.spec.ts --workers=1\`.
Set \`MINDMAP_PROFILE_CONCURRENCY\` to an honest description of concurrent work;
otherwise it is recorded as unknown. The invocation supplies a shared run ID.
Generate with \`MINDMAP_EVIDENCE=<same-directory> node scripts/summarize-performance.mjs\`.
Incomplete, legacy, inconsistent or mixed-run evidence is rejected. A failed target
is reported as failed without introducing a hardware timing assertion into arbitrary CI.
Actual stable-browser, screen-reader, OS IME and physical-display release checks
remain separate; this report grants no release waiver.
`;
    return { report, targetMet: failures.length === 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const dir = process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/performance';
    try {
        const profiles = engines.map(name => JSON.parse(readFileSync(`${dir}/profile-${name}.json`, 'utf8')));
        const result = summarizeProfiles(profiles);
        writeFileSync(`${dir}/report.md`, result.report);
        console.log(`Performance report written; full-relayout target ${result.targetMet ? 'MET' : 'FAILED'}.`);
    } catch (error) {
        // A failed regeneration must not leave a previous passing report current.
        try { writeFileSync(`${dir}/report.md`, `# Performance evidence\n\n**Evidence INVALID / target unverified.**\n\n${text(error.message)}\n`); } catch {}
        console.error(error.message); process.exitCode = 1;
    }
}
