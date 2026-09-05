# Implementation progress

Last updated: 2026-09-05

## Current state

Milestone A is in progress. Stages 1–2 complete. Stage 2 adds iterative validation,
detached snapshots, indexed records, atomic structural/checkbox/collapse reducers,
patch history, read-only enforcement, and the model API/event facade. Build,
typecheck, 45 unit tests and 9 browser cases across three engines passed.
Next: stage 3 rendering, layout, and reference comparison.

## Milestones

| Milestone | Stages | Technical status | User acceptance | Evidence |
|---|---|---|---|---|
| A: Foundation and appearance | 1–3 | In progress | Pending | [A](acceptance.md#milestone-a-stages-13) |
| B: Navigation and editing | 4–5 | Not started | Pending | [B](acceptance.md#milestone-b-stages-45) |
| C: Clipboard and dragging | 6–7 | Not started | Pending | [C](acceptance.md#milestone-c-stages-67) |
| D: Integration and release | 8–9 | Not started | Pending | [D](acceptance.md#milestone-d-stages-89) |

## Decisions and deviations

- All three supplied reference images inspected before implementation.
- Keep stage order. User authorized stages 1–3 and coherent commits; stop after stage 3.
- Pinned compatible tool versions; preserve all agreed technology choices.
- Initial screenshot candidates remain unapproved pending actual user review.

## Verification and next action

See [testing commands](testing.md). Stage-1 screenshot:
[Chromium](evidence/milestone-a/stage1-chromium.png) (also Firefox and WebKit).
Tested working tree based on `79b9d86`, comprising the stage-1 scaffold.
Stage 2 tested working tree based on `7ea0658`. Creation reducers accept final text;
provisional creation/editor coordination remains stage 5. No stage 3–9 behavior
is claimed implemented. Release browser, accessibility,
packaged-consumer, and performance checks remain required at milestone D.
