# Stage-9 performance evidence

Reference hardware: Apple M2, 8 logical CPUs,
16 GB RAM, darwin 25.6.0,
arm64. Headless browsers, 1400×1000 viewport, DPR 1, local Arial.
Widget source is the final integration implementation at `de15b91`; the profiler
and fixtures are in the stage-9 evidence commit. No competing test command ran
during these final workload samples. Individual timestamps are retained in JSON.

All engines verified **1,000 total / 500 visible nodes**, with no hidden descendant
DOM. Actual selection/navigation/pan/zoom input leaves the layout counter and
render count unchanged and emits no document events. Source inspection confirms
selection and viewport paths do not call document snapshot creation.

## Measurement and relayout

All numbers are milliseconds. Warm entries show **median / p95** from 30 samples
after five warmups; cold/font-load values are individual measurements.

| Browser | Cold mount + DOM flush | Local font load + refresh | Uncached full relayout | Cached structural command |
|---|---:|---:|---:|---:|
| chromium 145.0.7632.6 | 20.50 | 15.10 | 6.50 / 7.10 | 6.00 / 7.50 |
| firefox 146.0.1 | 57.00 | 33.00 | 16.00 / 18.00 | 14.00 / 17.00 |
| webkit 26.0 | 35.00 | 37.00 | 16.00 / 17.00 | 14.00 / 15.00 |

Every full-relayout p95 is below the 100 ms target on this machine. Uncached refresh
includes text measurement, layout, DOM application and forced browser layout;
structural command also includes mutation/history and uses cached measurements.
Cold mount starts before the constructor after module fetch; navigation and first
paint entries are recorded separately in each JSON. Font load adds a new FontFace
backed by local Arial and refreshes geometry; it is not a remote-font download test.

## Actual input and frames

Trusted pointer clicks alternate revealed leaves (30), physical arrows navigate
(30), wheel pans (30), and modifier+wheel zooms (30). The key array also contains
the modifier keydown; raw samples are retained. Capture-phase event timestamps to
requestAnimationFrame followed by a task measure a **rendering opportunity**.
This is not physical input-to-display presentation, and does not prove a one-frame
physical response or manual pan/zoom smoothness.

| Browser | Selection opportunity | Navigation opportunity | Pan opportunity | Zoom opportunity | Frame interval |
|---|---:|---:|---:|---:|---:|
| chromium | 12.80 / 13.20 | 9.50 / 16.90 | 0.90 / 1.10 | 1.20 / 1.60 | 16.70 / 17.30 |
| firefox | 16.00 / 17.00 | 8.00 / 17.00 | 16.00 / 17.00 | 17.00 / 18.00 | 16.70 / 17.54 |
| webkit | 13.00 / 20.00 | 9.00 / 27.00 | 17.00 / 31.00 | 16.00 / 26.00 | 16.00 / 32.00 |

The warmed medians and tails must be read against each browser's frame cadence.
Some p95 input/opportunity and frame intervals exceed a nominal 16.67 ms frame.
This measured limit is not hidden or converted into a pass. To investigate, the
profiler also measures event-handler work through DOM/layout flush before returning:

| Browser | Selection handler | Navigation handler | Wheel handler |
|---|---:|---:|---:|
| chromium | 0.30 / 0.40 | 0.30 / 0.40 | 0.10 / 0.20 |
| firefox | 1.00 / 1.00 | 1.00 / 2.00 | 0.00 / 1.00 |
| webkit | 1.00 / 1.00 | 1.00 / 1.00 | 0.00 / 1.00 |

Handler work is substantially shorter than the observed opportunity tails. The
unchanged layout counter rules out unexpected tree relayout during these inputs.
This supports frame scheduling/presentation as a contributor, but does not establish
that every delay is external to the widget. No speculative virtualization or timing
assertion relaxation was introduced. A human display/frame review remains required.

[Compressed Chromium frame/input/paint trace](frames-chromium.json.gz) retains real
DevTools trace records and process/thread metadata, filtered to frames, paint,
input/latency, animation and EventDispatch. Decompress with `gzip -dc` to JSON
and load it into Chrome DevTools Performance. The trace is separate from the
cross-engine rendering-opportunity estimates. It is not a physical display trace.

## Reproduce and inspect

Run `pnpm dev --port 5173 --strictPort`, then
`pnpm test:browser tests/browser/performance.spec.ts --workers=1` for all engines.
`pnpm perf` runs Chromium alone. Run `node scripts/summarize-performance.mjs`
to regenerate this table; do not silently mix dates when comparing profiles.
The isolated fixture is `/examples/performance/`; the interactive demo workload
is `/?workload` and its earlier diagnostic remains `workload.spec.ts`.

- [Chromium samples](profile-chromium.json), [Firefox samples](profile-firefox.json), [WebKit samples](profile-webkit.json)
- [Chromium view](workload-chromium.png), [Firefox view](workload-firefox.png), [WebKit view](workload-webkit.png)
- [Final full browser gate](../browser.txt), [initial profiler errors](initial-browser.txt)

Initial profiler code had a shadowed DOM document variable and strict typing errors;
those were corrected before successful measurement. No timing assertions were
weakened or hardware-specific performance thresholds added. The release gap is
actual physical presentation and manual smoothness on reference hardware/current
stable applications, including the observed greater-than-one-frame tails.
