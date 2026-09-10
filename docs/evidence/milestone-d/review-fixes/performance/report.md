# Performance evidence

**Full-relayout target: MET.** Every full-relayout p95 is at or below 100 ms on the recorded hardware.

## Run and provenance

Run: `1bc18a33-0389-4432-8fac-e624b6bfae91`. Revision: `d134744aaa6f85f4be78893ea631ba8eb49745e1`.
Source dirty: **false**. SHA-256 of the scoped source manifest:
`06fa9c0631de3a86b8824f74fbf048aa3b6624b813020a4a5f0232f232b77aa1`. Full source paths and dirty paths are retained in each JSON.
Evidence files are outside that source scope.

Hardware: Apple M2, 8 logical CPUs, 16 GB RAM;
darwin 25.6.0, arm64.
Headless: true; workers: 1; viewport:
1400×1000; DPR: 1.
Other workload/concurrency: One Playwright worker; no other assistant-started test or build during profiling. Local Vite demo server running; other applications and OS load not measured.. This is a recorded operator
statement, not automatic detection of other applications or operating-system work.

| Engine | Version | Captured UTC | Browser channel | Navigator platform | Font |
|---|---|---|---|---|---|
| chromium | 145.0.7632.6 | 2026-09-10T13:15:32.879Z | bundled | MacIntel | 12px / 15px MindmapProfileArial |
| firefox | 146.0.1 | 2026-09-10T13:15:42.228Z | bundled | MacIntel | 12px / 15px MindmapProfileArial |
| webkit | 26.0 | 2026-09-10T13:15:51.839Z | bundled | MacIntel | 12px / 15px MindmapProfileArial |

## Relayout and cold load

Milliseconds; warmed median / p95 from 30 samples after
5 warmups. Summaries are checked against raw samples.

| Engine | Cold mount + DOM flush | Local font load + refresh | Uncached full relayout | Cached structural command |
|---|---:|---:|---:|---:|
| chromium | 29.50 | 16.80 | 6.80 / 7.80 | 6.10 / 7.40 |
| firefox | 34.00 | 20.00 | 9.00 / 11.00 | 8.00 / 9.00 |
| webkit | 41.00 | 28.00 | 12.00 / 13.00 | 11.00 / 11.00 |

Uncached refresh includes measurement, layout, DOM application and forced browser
layout. Structural commands also include mutation/history and use cached measurement.
Cold mount excludes module fetch; navigation/paint entries are separate. The FontFace
loads local Arial and refreshes geometry, rather than downloading a remote font.

## Verified input and frame opportunities

All three profiles verify 1,000 total / 500 visible nodes, unchanged layout/render
counts and no document events during input. Each pan changes translation without
changing zoom; each zoom uses the platform modifier and changes zoom in the expected
direction. Before/after viewport values for every wheel gesture are retained.

| Engine | Selection | Navigation | Pan | Zoom | Frame interval |
|---|---:|---:|---:|---:|---:|
| chromium | 12.80 / 13.30 | 9.90 / 17.20 | 0.80 / 1.10 | 1.00 / 1.30 | 16.70 / 17.30 |
| firefox | 16.00 / 17.00 | 6.00 / 17.00 | 12.00 / 17.00 | 9.00 / 17.00 | 16.66 / 17.36 |
| webkit | 12.00 / 22.00 | 11.00 / 25.00 | 14.00 / 30.00 | 11.00 / 21.00 | 16.00 / 29.00 |

Input/opportunity or frame p95 exceeds a nominal 16.67 ms frame in: chromium, firefox, webkit.
These rAF-plus-task measurements identify rendering opportunities, not physical
input-to-display presentation. The keyboard array includes the modifier keydown.
Headless timing cannot establish manual smoothness or screen presentation.

| Engine | Selection handler | Navigation handler | Wheel handler |
|---|---:|---:|---:|
| chromium | 0.30 / 0.40 | 0.20 / 0.50 | 0.10 / 0.20 |
| firefox | 1.00 / 2.00 | 1.00 / 2.00 | 0.00 / 1.00 |
| webkit | 1.00 / 1.00 | 0.00 / 1.00 | 0.00 / 1.00 |

## Evidence and reproduction

- [Chromium samples](profile-chromium.json), [Firefox samples](profile-firefox.json), [WebKit samples](profile-webkit.json)
- [Chromium view](workload-chromium.png), [Firefox view](workload-firefox.png), [WebKit view](workload-webkit.png)
- [Chromium frame/input/paint trace](frames-chromium.json.gz); decompress to JSON for DevTools.

Run `pnpm dev --port 5173 --strictPort`, then
`MINDMAP_EVIDENCE=<new-directory> pnpm test:browser performance.spec.ts --workers=1`.
Set `MINDMAP_PROFILE_CONCURRENCY` to an honest description of concurrent work;
otherwise it is recorded as unknown. The invocation supplies a shared run ID.
Generate with `MINDMAP_EVIDENCE=<same-directory> node scripts/summarize-performance.mjs`.
Incomplete, legacy, inconsistent or mixed-run evidence is rejected. A failed target
is reported as failed without introducing a hardware timing assertion into arbitrary CI.
Actual stable-browser, screen-reader, OS IME and physical-display release checks
remain separate; this report grants no release waiver.
