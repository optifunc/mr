import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
// Inherited by every worker/project in this invocation; partial reruns have a new ID.
process.env.MINDMAP_PROFILE_RUN_ID ??= randomUUID();
export default defineConfig({ testDir: 'tests/browser', fullyParallel: true, use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, trace: 'retain-on-failure' }, projects: process.env.MINDMAP_BROWSER_CHANNEL ? [{ name: 'chromium', use: { browserName: 'chromium', channel: process.env.MINDMAP_BROWSER_CHANNEL } }] : ['chromium', 'firefox', 'webkit'].map(name => ({ name, use: { browserName: name as 'chromium' | 'firefox' | 'webkit' } })), webServer: { command: 'pnpm dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI } });
