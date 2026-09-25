# MIT licensing — 2026-09-25

Owner authorized MIT for both Willow and this widget, including distributed code.
Baseline widget revision: `c8f363d06fc92c199ee7603491977ab1368456db` plus local
licensing changes. No commit or publication has been made.

- Added [LICENSE](../../../LICENSE), `license: MIT` package metadata and README guidance.
- Vite keeps legal comments and emits the full MIT notice in built JavaScript.
  The initial banner-only attempt was stripped by Vite's default legal-comment
  setting; explicitly retaining legal comments fixed the artifact check.
- `pnpm build`, `pnpm typecheck`, and all 195 unit tests passed.
- `pnpm pack --pack-destination <temporary-directory>` passed. Inspected the actual
  tarball: `package/LICENSE` matches the repository license, package metadata is
  MIT, and `package/dist/mindmap.js` contains the complete notice.
- The package has no production dependencies. Third-party reference screenshots
  are excluded from the package and are not relicensed by this change.

No interaction, layout, document or API implementation changed. Browser/manual
product acceptance was not repeated for this licensing-only change; prior
acceptance and limitations remain in effect. The parent Willow package passed
its fresh native desktop smoke with this widget build.

Before publishing a new Willow release, commit and publish these widget changes,
then update the parent gitlink to that available commit. Those actions were not
authorized in this task. Next product task is the Willow A2 positioning work.
