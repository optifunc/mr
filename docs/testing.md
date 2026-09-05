# Testing and demo

Use Node 22.12+ (verified with Node 24.2.0) and pnpm 10.28.1.

- `pnpm install --frozen-lockfile`: install pinned tools.
- `pnpm dev`: open http://127.0.0.1:5173 for the demo.
- `pnpm typecheck`: strict TypeScript checks for source, demo, and tests.
- `pnpm build`: ESM, declarations, and explicitly exported CSS in `dist/`.
- `pnpm test`: pure Vitest tests.
- `pnpm exec playwright install`: install Chromium, Firefox, and WebKit if absent.
- `pnpm test:browser`: run all three Playwright engines, start Vite automatically,
  capture screenshots under `docs/evidence/milestone-a/`, retain failure traces in
  ignored `test-results/`.

Stage 1 verified all commands above except browser installation (matching browser
binaries were already available). The sandbox blocks local server binding; browser
runs require execution with local server/browser permissions. Dependency download
also required network permissions. These are environment restrictions, not test failures.

Actual stable browser and screen-reader release checks remain scheduled for stage 9;
Playwright WebKit is not actual Safari verification.
