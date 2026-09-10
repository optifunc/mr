import { realpathSync, mkdtempSync, cpSync, writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { identifyBuild, startPreview, verifyBuild, digest } from './preview-server.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
const root = process.cwd(), evidence = resolve(process.env.MINDMAP_EVIDENCE ?? 'docs/evidence/milestone-d/package');
mkdirSync(evidence, { recursive: true });
const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'mindmap-consumer-')));
const logs = [];
function run(command, args, cwd = consumer) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
    logs.push(`$ ${command} ${args.join(' ')}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
    writeFileSync(join(evidence, 'checks.txt'), logs.join('\n').trim() + '\n');
    if (result.status !== 0) throw Error(`Failed: ${command} ${args.join(' ')}`);
}
run('pnpm', ['pack', '--pack-destination', consumer], root);
const tarball = readdirSync(consumer).find(file => file.endsWith('.tgz'));
run('tar', ['-tzf', join(consumer, tarball)]);
cpSync(resolve('examples/consumer'), consumer, { recursive: true });
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'isolated-mindmap-consumer', private: true, type: 'module', dependencies: { '@mindmap/widget': `file:./${tarball}` } }, null, 2));
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, lib: ['ES2022', 'DOM'] }, include: ['main.ts'] }));
run('pnpm', ['install', '--offline', '--ignore-scripts']);
run(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', join(consumer, 'tsconfig.json')]);
run(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build', consumer]);
const identity = identifyBuild(join(consumer, 'dist'), { tarballSha256: digest(readFileSync(join(consumer, tarball))) });
const url = 'http://127.0.0.1:5180';
const results = [];
let server, failure, passed = false;
try {
    server = await startPreview({ command: process.execPath, args: [resolve('node_modules/vite/bin/vite.js'), 'preview', consumer, '--host', '127.0.0.1', '--port', '5180', '--strictPort'], url, identity });
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
        server.assertRunning();
        await verifyBuild(url, identity);
        const browser = await engine.launch();
        try {
            const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
            const errors = [], requests = [], assets = [], assetChecks = [];
            page.on('response', response => {
                const path = new URL(response.url()).pathname.slice(1) || 'index.html';
                if (identity.files[path]) assetChecks.push(response.body().then(body => {
                    expect(digest(body), `Browser-loaded asset: ${path}`).toBe(identity.files[path]); assets.push(path);
                }).catch(error => { errors.push(error.message); }));
            });
            page.on('pageerror', e => errors.push(e.message)); page.on('request', r => requests.push(r.url()));
            await page.goto('http://127.0.0.1:5180');
            const tree = page.locator('#first .mindmap');
            await expect(page.getByRole('tree')).toHaveCount(2);
            await expect(tree).toHaveCSS('font-size', '12px');
            await tree.focus(); await page.keyboard.press('Shift+F10');
            await expect(tree.getByRole('menu')).toBeVisible();
            await page.keyboard.press('Enter'); await tree.locator('textarea').fill('Edited from package'); await page.keyboard.press('Enter');
            await expect(tree.getByText('Edited from package')).toBeVisible();
            await expect(page.locator('#second').getByText('Packaged task')).toBeVisible();
            await page.locator('#undo').click(); await expect(tree.getByText('Packaged task')).toBeVisible();
            await page.locator('#second .mindmap').focus(); await page.keyboard.press('F2'); await expect(page.locator('#second textarea')).toHaveCount(0);
            await page.screenshot({ path: join(evidence, `consumer-${name}.png`) });
            await tree.focus(); await page.keyboard.press('Shift+F10'); await page.locator('#destroy').click();
            await expect(page.locator('#first .mindmap')).toHaveCount(0); await expect(page.locator('#host-content')).toHaveText('Caller-owned content');
            await page.locator('#mount').click(); await expect(page.getByRole('tree')).toHaveCount(2);
            await Promise.all(assetChecks);
            expect(errors).toEqual([]); expect(requests.every(url => url.startsWith('http://127.0.0.1:5180/'))).toBe(true);
            for (const path of Object.keys(identity.files).filter(path => /\.(html|js|css)$/.test(path))) expect(assets, `Expected loaded asset: ${path}`).toContain(path);
            server.assertRunning();
            results.push({ browser: name, version: browser.version(), passed: true, runId: identity.runId, assets, requests, errors });
        } finally { await browser.close(); }
    }
    server.assertRunning(); passed = true;
} catch (error) {
    failure = error.message; throw error;
} finally {
    await server?.close();
    writeFileSync(join(evidence, 'preview.txt'), (server?.output() ?? failure ?? '').trim() + '\n');
    writeFileSync(join(evidence, 'result.json'), JSON.stringify({ passed, failure, identity, consumer, tarball, date: new Date().toISOString(), results, package: JSON.parse(readFileSync(join(consumer, 'node_modules/@mindmap/widget/package.json'), 'utf8')) }, null, 2) + '\n');
}
console.log(`Packaged consumer passed in ${results.length} engines. Isolated runnable source: ${consumer}`);
