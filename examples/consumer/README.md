# Minimal consumer

`main.ts` imports only the public package and stylesheet. Give each host a measured
height; call `destroy()` when unmounting. The second instance is read-only.

**Consumer commands** demonstrates the public menu presenter with widget-derived
commands, an extra host action and focus return to its button. **Widget keymap
reference** renders all shortcut rows directly from exported widget metadata,
including alternate bindings and the label-editing section.

From the repository run `pnpm test:package`. It builds and packs the library, copies
this example into a new temporary directory, installs the tarball offline with
pnpm, checks its declarations, builds with Vite, and verifies the production page
in Chromium/Firefox/WebKit. `docs/evidence/milestone-d/package/result.json` records
the isolated directory. Run Vite against that directory to revisit the exact consumer.

After `pnpm build`, `pnpm dev` also serves `/examples/consumer/` as a convenient
review preview using the public self-reference exports. The automated isolated
installation is the package-boundary verification.
