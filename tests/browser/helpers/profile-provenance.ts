import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { TestInfo } from '@playwright/test';

export function profileProvenance(info: TestInfo) {
    const scope = ['src', 'scripts', 'tests', 'examples', 'package.json', 'pnpm-lock.yaml', 'playwright.config.ts', 'tsconfig.json'];
    const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
    const paths = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...scope).split('\0').filter(Boolean))].sort();
    const hash = createHash('sha256');
    for (const path of paths) { hash.update(path + '\0'); try { hash.update(readFileSync(path)); } catch { hash.update('<deleted>'); } hash.update('\0'); }
    const dirty = git('status', '--porcelain', '--', ...scope);
    return {
        runId: process.env.MINDMAP_PROFILE_RUN_ID!, revision: git('rev-parse', 'HEAD'), sourceDigest: hash.digest('hex'),
        sourceDirty: !!dirty, dirtyPaths: dirty.split('\n').filter(Boolean), sourcePaths: paths,
        workers: info.config.workers, headless: info.project.use.headless ?? true,
        channel: info.project.use.channel ?? null,
        concurrency: process.env.MINDMAP_PROFILE_CONCURRENCY ?? 'not recorded',
    };
}
