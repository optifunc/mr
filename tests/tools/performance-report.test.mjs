import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { metric, summarizeProfiles } from '../../scripts/summarize-performance.mjs';

function profiles() {
    const sample = () => ({ median: 10, p95: 10, samples: Array(30).fill(10) });
    return ['chromium', 'firefox', 'webkit'].map(browser => ({
        browser, version: 'test-version', date: '2026-09-10T00:00:00Z',
        provenance: { runId: 'test-run', revision: 'a'.repeat(40), sourceDigest: 'b'.repeat(64), sourceDirty: true, dirtyPaths: ['M src/editor.ts'], sourcePaths: ['src/editor.ts'], headless: false, workers: 2, concurrency: 'not recorded', channel: null },
        os: { cpu: 'Test CPU', logicalCpus: 8, memoryGB: 16, platform: 'linux', release: 'test', arch: 'x64' },
        viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, font: '12px Arial',
        cold: { mountMs: 20 }, fontLoadAndRefreshMs: 5, measurement: { warmups: 5, samples: 30 },
        total: 1000, visible: 500, verification: { initialLayoutCount: '1', finalLayoutCount: '1', finalVisible: 500, documentEvents: 0 },
        input: Object.fromEntries(['pan', 'zoom'].map(kind => [kind, { platform: 'Win32', modifier: kind === 'zoom' ? 'Control' : null,
            transitions: Array.from({ length: 30 }, () => ({ before: { x: 0, y: 0, zoom: 1 }, after: { x: 0, y: kind === 'pan' ? 10 : 0, zoom: kind === 'zoom' ? 1.1 : 1 }, delta: -10 })) }])),
        fullMeasurementRelayoutMs: sample(), structuralCommandMs: sample(), panRenderingOpportunityMs: sample(), zoomRenderingOpportunityMs: sample(), frameIntervalsMs: sample(),
        inputToRenderingOpportunityMs: { pointerdown: sample(), keydown: sample() },
        synchronousInputHandlerMs: { pointerdownHandler: sample(), keydownHandler: sample(), wheelHandler: sample() },
    }));
}

test('passing report derives provenance and conditions from profiles', () => {
    const input = profiles(), before = structuredClone(input), result = summarizeProfiles(input);
    assert.equal(result.targetMet, true); assert.match(result.report, /target: MET/);
    for (const value of ['a'.repeat(40), 'test-run', '1200×900', 'DPR: 2', 'Headless: false', 'workers: 2', 'not recorded']) assert.ok(result.report.includes(value));
    assert.ok(!result.report.includes('de15b91')); assert.deepEqual(input, before);
});
test('150 ms raw p95 produces an explicit failed target, without a passing claim', () => {
    const input = profiles(), samples = Array(30).fill(150);
    input[0].fullMeasurementRelayoutMs = { ...metric(samples), samples };
    const result = summarizeProfiles(input);
    assert.equal(result.targetMet, false); assert.match(result.report, /FAILED.*chromium \(150.00 ms p95\)/);
    assert.ok(!result.report.includes('target: MET'));
});
test('100 ms is within the target; fabricated summaries are rejected', () => {
    const input = profiles(), samples = Array(30).fill(100);
    input[0].fullMeasurementRelayoutMs = { ...metric(samples), samples };
    assert.equal(summarizeProfiles(input).targetMet, true);
    input[0].fullMeasurementRelayoutMs.p95 = 150;
    assert.throws(() => summarizeProfiles(input), /summary disagrees/);
});
for (const samples of [[], [NaN], [Infinity], [-1]]) test(`invalid raw samples are rejected: ${String(samples)}`, () => {
    const input = profiles(); input[0].fullMeasurementRelayoutMs.samples = samples;
    assert.throws(() => summarizeProfiles(input), /samples/);
});
test('missing engine, legacy provenance and mixed runs/sources/settings are rejected', () => {
    assert.throws(() => summarizeProfiles(profiles().slice(1)), /one profile per engine/);
    const legacy = profiles(); delete legacy[0].provenance;
    assert.throws(() => summarizeProfiles(legacy), /provenance/);
    for (const change of [p => p.provenance.runId = 'another', p => p.provenance.revision = 'c'.repeat(40), p => p.provenance.sourceDigest = 'd'.repeat(64), p => p.viewport.width = 800]) {
        const input = profiles(); change(input[1]);
        assert.throws(() => summarizeProfiles(input), /different runs/);
    }
});
test('pan masquerading as zoom, wrong modifier and failed layout invariants cannot pass', () => {
    for (const change of [p => p.input.zoom.transitions[0].after.zoom = 1, p => p.input.zoom.modifier = 'Meta', p => p.verification.finalLayoutCount = '2']) {
        const input = profiles(); change(input[0]); assert.throws(() => summarizeProfiles(input), /Invalid performance evidence/);
    }
});
test('CLI fails invalid regeneration and replaces stale passing text with unverified status', t => {
    const directory = mkdtempSync(join(tmpdir(), 'profile-report-test-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const input = profiles(); delete input[0].provenance;
    for (const p of input) writeFileSync(join(directory, `profile-${p.browser}.json`), JSON.stringify(p));
    writeFileSync(join(directory, 'report.md'), 'Previous passing claim');
    const result = spawnSync(process.execPath, [resolve('scripts/summarize-performance.mjs')], { encoding: 'utf8', env: { ...process.env, MINDMAP_EVIDENCE: directory } });
    assert.equal(result.status, 1);
    const report = readFileSync(join(directory, 'report.md'), 'utf8');
    assert.match(report, /INVALID \/ target unverified/); assert.ok(!report.includes('Previous passing claim'));
});
