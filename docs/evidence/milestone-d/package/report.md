# Separate packaged-consumer validation

`pnpm test:package` passed with the final widget implementation at `de15b91` and
stage-9 package metadata/example changes. [Commands/build/typecheck](checks.txt),
[run](run.txt), [result, exact tarball and temporary directory](result.json).

The script packs the real ESM/declarations/CSS, API documentation and consumer
example. A new temporary project installs that tarball with `pnpm install --offline
--ignore-scripts`; no source alias or repository workspace link supplies the widget.
TypeScript resolves the public declarations. Vite builds an ordinary production
HTML page, and a separate preview server serves the generated assets.

Chromium, Firefox and WebKit all passed: two isolated mounts, default CSS, menu
keyboard-to-edit, commit/undo, read-only protection, destroy/remount, preserved
caller-owned content, no runtime errors and only local asset requests. Screenshots
were inspected: [Chromium](consumer-chromium.png), [Firefox](consumer-firefox.png),
[WebKit](consumer-webkit.png). Runtime behavior uses the package exports throughout.

The first run failed when Vite received macOS's aliased `/var` temporary path.
Canonicalizing the directory through realpath corrected Rollup's asset path.
[Initial checks](initial-checks.txt), [initial run](initial-run.txt). The final
script records each command and exits on a failed build/type/install check; browser
assertions fail on incorrect behavior. Temporary consumers are retained for review.

For the convenient demo preview run `pnpm build`, `pnpm dev`, then visit
`/examples/consumer/`. That preview uses self-reference public exports; the separate
installation above is the evidence for the actual package boundary. The API-only
documentation follow-up after packing does not change runtime behavior or exports.
