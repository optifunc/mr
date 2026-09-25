# Mind map widget

Framework-independent TypeScript mind-map editor with HTML/SVG rendering, native
textarea editing, two-sided automatic layout, keyboard navigation, multi-selection,
clipboard outlines, drag/drop, checkboxes, links, undo/redo and an accessible menu.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

Open the URL printed by Vite. The stage-9 demo includes reference comparisons,
read-only and menu-disabled modes, host API exercises, an integration/cleanup
example, a deterministic workload, test results and known release gaps.

```ts
import { MindMapEditor } from '@mindmap/widget';
import '@mindmap/widget/styles.css';

const editor = new MindMapEditor(host, {
  document: { root: { id: 'root', text: 'Plan', children: [] } },
});
// Give host a measurable height. On host removal:
editor.destroy();
```

[API and theming](docs/api.md) · [Testing](docs/testing.md) ·
[Stage-9 review and remaining release checks](docs/evidence/milestone-d/report.md) ·
[Acceptance](docs/acceptance.md) · [Minimal consumer](examples/consumer/README.md)

Run `pnpm typecheck`, `pnpm test`, `pnpm test:browser --workers=1`,
`pnpm test:package`, and `pnpm perf`. Product acceptance and required manual/current
stable browser release validation remain separate from automated test passes.

## License

[MIT](LICENSE). The npm package includes the license; built JavaScript retains
the notice. Third-party reference screenshots under `docs/free-mind-references/`
are not relicensed and are excluded from the published package.
