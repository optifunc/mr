import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { legalComments: 'inline' },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'mindmap.js', cssFileName: 'mindmap' },
    rollupOptions: {
      output: { banner: `/*!\n${readFileSync(new URL('./LICENSE', import.meta.url), 'utf8')}*/` },
    },
  },
});
