import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function identifyBuild(directory, metadata = {}) {
    const files = {};
    function visit(relative = '') {
        for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
            const path = relative ? `${relative}/${entry.name}` : entry.name;
            if (entry.isDirectory()) visit(path);
            else if (path !== 'mindmap-build.json') files[path] = digest(readFileSync(join(directory, path)));
        }
    }
    visit();
    const identity = { runId: randomUUID(), ...metadata, files };
    writeFileSync(join(directory, 'mindmap-build.json'), JSON.stringify(identity));
    return identity;
}

export async function verifyBuild(url, identity) {
    const read = async path => {
        const response = await fetch(new URL(path, `${url}/`), { cache: 'no-store', signal: AbortSignal.timeout(1000) });
        if (!response.ok) throw Error(`Build identity request failed: ${path} (${response.status})`);
        return Buffer.from(await response.arrayBuffer());
    };
    const manifest = JSON.parse((await read('mindmap-build.json')).toString());
    if (manifest.runId !== identity.runId) throw Error('Preview serves a different build/run');
    for (const [path, hash] of Object.entries(identity.files)) {
        if (digest(await read(path)) !== hash) throw Error(`Preview asset hash mismatch: ${path}`);
    }
}

/** Own the preview lifecycle; HTTP success alone cannot establish readiness. */
export async function startPreview({ command, args, cwd, url, identity, timeoutMs = 10000 }) {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let failure, output = '', closing = false;
    const exited = new Promise(resolve => {
        child.once('error', error => { failure = error; resolve(); });
        child.once('exit', (code, signal) => {
            if (!closing) failure = Error(`Preview exited (${code ?? signal})`);
            resolve();
        });
    });
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const assertRunning = () => { if (failure) throw Error(`${failure.message}\n${output}`); };
    const close = async () => {
        closing = true;
        if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
        child.kill();
        const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
        try { await exited; } finally { clearTimeout(timer); }
    };
    try {
        const deadline = Date.now() + timeoutMs;
        let ready = false;
        while (Date.now() < deadline) {
            assertRunning();
            let response;
            try { response = await fetch(url, { signal: AbortSignal.timeout(Math.min(1000, timeoutMs)), cache: 'no-store' }); } catch {}
            assertRunning();
            if (response?.ok) { await verifyBuild(url, identity); assertRunning(); ready = true; break; }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (!ready) throw Error(`Preview readiness timed out after ${timeoutMs} ms`);
        return { assertRunning, close, output: () => output };
    } catch (error) {
        await close();
        throw Error(`${error.message}\n${output}`);
    }
}
