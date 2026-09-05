# Implementation progress

Last updated: 2026-09-05

## Current state

**Milestone A (stages 1–3) is technically complete. Stopped at the requested stage-3
product checkpoint. User visual acceptance is pending.**

Runnable demo: `pnpm install --frozen-lockfile`, `pnpm dev`, then
http://127.0.0.1:5173. Live reference map, independent geometry mount, side-by-side
comparison, and `/?workload` diagnostic are included. [API checkpoint](api.md).

## Milestones

| Milestone | Stages | Technical status | User acceptance | Evidence |
|---|---|---|---|---|
| A: Foundation and appearance | 1–3 | Complete | Pending | [A](acceptance.md#milestone-a-stages-13) |
| B: Navigation and editing | 4–5 | Not started | Pending | [B](acceptance.md#milestone-b-stages-45) |
| C: Clipboard and dragging | 6–7 | Not started | Pending | [C](acceptance.md#milestone-c-stages-67) |
| D: Integration and release | 8–9 | Not started | Pending | [D](acceptance.md#milestone-d-stages-89) |

## Verification and revisions

- Stage 1: `7ea0658`, package/contracts and working three-browser harness.
- Stage 2: `a165cca`, validated model, atomic reducers, patch history, API/events.
- Stage 3: tested working tree based on `a165cca`; implementation/evidence commit
  is the next task commit. Final handover revision will be recorded after committing.
- Passed: strict typecheck, build (ESM/declarations/CSS), **54 unit tests**, and
  **30 browser cases** across Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0.
- Final comparison screenshots, geometry, focus, multiline root, and workload
  captures inspected. [Full evidence and known gaps](evidence/milestone-a/report.md).
- Early mixed-depth workload confirms exactly 1,000 total / 500 visible. Recorded
  relayout p95 is below 100 ms in all three engines; final profiling remains D.

## Decisions and corrections

- Inspected all three references; permanent fixture retains all 21 visible labels
  and a deterministic hidden child for the collapsed marker.
- Preserved pnpm, strict TypeScript, Vite, Vitest, Playwright, HTML/SVG, stage order,
  and the planned textarea. No stage-4+ interaction implementation was begun.
- Refined font/curves, added a 2px single-child rise with complete subtree bounds,
  and made empty/multiline root ellipses contain their labels and checkbox.
- Fixed collapse selection preservation, reused-root-ID reconciliation, and
  checkbox accessibility state after hidden DOM recreation.
- Model insertion currently commits final text; stage 5 will coordinate prepared
  patches with provisional creation and editing. This temporary checkpoint behavior
  is documented and does not replace the required full editing contract.
- Initial visual baselines remain unapproved. Font metrics/rasterization differences
  are explicit in the comparison report; supplied reference images are untouched.

## Review gaps and next action

No unresolved stage 1–3 behavioral test failure is known. Review the
[side-by-side candidate](evidence/milestone-a/comparison-chromium.png); confirm the
appearance or request corrections before screenshot baselines are approved.

After product feedback and authorization, implement stage 4 (selection/navigation
and viewport), then stage 5 (textarea and creation coordination). Clipboard, URLs,
and drag feedback remain C. Final menu/API, packaged consumer, actual stable
browsers, VoiceOver/NVDA, and full performance profiling remain required D gates.
Do not treat Playwright WebKit as actual Safari or preliminary ARIA as manual
accessibility acceptance. No later-stage or release check has been waived.
