import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { identifyBuild, startPreview, verifyBuild } from '../../scripts/preview-server.mjs';

async function fixture(t) {
    const directory = mkdtempSync(join(tmpdir(), 'preview-test-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    writeFileSync(join(directory, 'index.html'), '<script src="app.js"></script>');
    writeFileSync(join(directory, 'app.js'), 'console.log("current build")');
    const identity = identifyBuild(directory);
    const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const code = `const http = require('node:http'), fs = require('node:fs');
        http.createServer((q,s) => { try { s.end(fs.readFileSync(${JSON.stringify(directory)} + (q.url === '/' ? '/index.html' : q.url))); } catch { s.writeHead(404).end(); } }).listen(${port}, '127.0.0.1');`;
    return { directory, identity, code, command: process.execPath, url: `http://127.0.0.1:${port}` };
}

test('rejects spawn errors and includes preview startup diagnostics', async t => {
    const f = await fixture(t);
    await assert.rejects(startPreview({ ...f, command: join(f.directory, 'missing'), args: [] }), /ENOENT/);
    await assert.rejects(startPreview({ ...f, args: ['-e', 'console.error("startup rejected"); process.exit(7)'] }), /startup rejected/);
});
test('readiness timeout fails even if the process stays alive', async t => {
    const f = await fixture(t);
    await assert.rejects(startPreview({ ...f, timeoutMs: 150, args: ['-e', 'setInterval(() => {}, 1000)'] }), /timed out/);
});
test('occupied port serving a previous consumer cannot pass or be killed by the gate', async t => {
    const f = await fixture(t);
    const previous = await startPreview({ ...f, args: ['-e', f.code] });
    t.after(() => previous.close());
    const identity = { ...f.identity, runId: 'different-current-run' };
    await assert.rejects(startPreview({ ...f, identity, args: ['-e', f.code] }), /different build|EADDRINUSE|Preview exited/);
    previous.assertRunning(); await verifyBuild(f.url, f.identity);
});
test('checks actual bytes even when the run identity matches', async t => {
    const f = await fixture(t);
    writeFileSync(join(f.directory, 'app.js'), 'console.log("stale build")');
    await assert.rejects(startPreview({ ...f, args: ['-e', f.code] }), /asset hash mismatch: app.js/);
});
test('verified preview passes, then detects a later unexpected exit', async t => {
    const f = await fixture(t);
    const preview = await startPreview({ ...f, args: ['-e', `${f.code} setTimeout(() => process.exit(9), 500);`] });
    t.after(() => preview.close());
    await verifyBuild(f.url, f.identity);
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.throws(() => preview.assertRunning(), /Preview exited \(9\)/);
});
