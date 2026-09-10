import { realpathSync, mkdtempSync, cpSync, writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { chromium, firefox, webkit, expect } from '@playwright/test';
const root = process.cwd(), evidence = resolve('docs/evidence/milestone-d/package');
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
const server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', consumer, '--host', '127.0.0.1', '--port', '5180', '--strictPort'], { stdio: 'pipe' });
const results = [];
try {
    for (let i = 0; i < 100; i++) {
        try { if ((await fetch('http://127.0.0.1:5180')).ok) break; } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
        const browser = await engine.launch();
        try {
            const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
            const errors = [], requests = [];
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
            expect(errors).toEqual([]); expect(requests.every(url => url.startsWith('http://127.0.0.1:5180/'))).toBe(true);
            results.push({ browser: name, version: browser.version(), passed: true, requests, errors });
        } finally { await browser.close(); }
    }
} finally {
    server.kill();
    writeFileSync(join(evidence, 'result.json'), JSON.stringify({ consumer, tarball, date: new Date().toISOString(), results, package: JSON.parse(readFileSync(join(consumer, 'node_modules/@mindmap/widget/package.json'), 'utf8')) }, null, 2) + '\n');
}
console.log(`Packaged consumer passed in ${results.length} engines. Isolated runnable source: ${consumer}`);
