# Deletion selection follow-up — 2026-09-12

Implemented the approved selection order: next surviving sibling, previous
surviving sibling, then parent only when none remain. Before this change, deleting
B from A/B/C selected One; it now selects C. Deleting C next selects A; deleting
A then selects One. Keyboard, menu, API deletion and cut use the same transaction.

Multi-selection anchors at the removed subtree containing the active node, skips
other deleted siblings, and normalizes overlapping ancestor/descendant targets.
Deleting elsewhere preserves a surviving active node. With no active selection,
the first normalized deletion root is the anchor. Sibling order follows the
document's children array, including branches on either side of the root.
Undo/redo restores both the document and selection in one step.

Tested state: working tree based on `17e0e84`, with the task changes committed
alongside this report. [SHA-256 source/test manifest](tested-files.json) identifies
the final implementation and tests. This follow-up awaits product review;
milestone D remains complete and accepted.

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm typecheck` | Passed | [log](typecheck.txt) |
| `pnpm build` | Passed | [log](build.txt) |
| `pnpm test` | 177 passed, including 14 new deletion cases | [log](unit.txt) |
| Focused browser coverage | 75 unique cases passed across Chromium, Firefox and WebKit after test corrections below; no skips | [initial](browser-initial.txt), [API cut](browser-cut.txt), [native cut](browser-native-cut.txt) |
| Screenshot inspection | Inspected all three images; C visibly selected, B absent, remaining labels/branches unclipped | Images below |
| `git diff --check` | Passed | Checked before commit |

Browser commands (run serially with `MINDMAP_EVIDENCE=docs/evidence/milestone-d/delete-selection`):

```sh
pnpm test:browser delete-selection.spec.ts clipboard.spec.ts menu.spec.ts checkpoint-b.spec.ts --grep 'delet|cut|menu' --workers=1
pnpm test:browser clipboard.spec.ts --grep 'cut selects the next sibling' --workers=1
pnpm test:browser clipboard.spec.ts --grep 'native keyboard cut selects' --workers=1
```

The initial run passed 69 cases and failed three instances of a new test that
incorrectly assumed native keyboard cut waits on `navigator.clipboard.writeText`.
Native cut instead uses the synchronous clipboard event. Split this into native
keyboard and deferred API cases. All three deferred API cases then passed; the
three native cases exposed another test mistake: the public origin is `user`,
not `keyboard`. Correcting that assertion made all three native cases pass.
Both failed runs are retained above. No production change, relaxed assertion,
skip or retry was used to address these test errors.

Coverage includes repeated actual Delete input with Mac and simulated Windows
modifier routing, focus/ARIA selection, undo/redo, subtree and group deletion,
pointer menu commands, native cut, delayed cut completion, preserved unrelated
selection, read-only/root protections and menu regressions.

## Visual evidence and demo

Screenshots show the live reference fixture at zoom 1 after clicking B and pressing
Delete. Each has a 1400×1000 viewport, DPR 1, macOS, Arial/Helvetica/sans-serif stack:
[Chromium 145.0.7632.6](next-sibling-chromium.png),
[Firefox 146.0.1](next-sibling-firefox.png),
[WebKit 26.0](next-sibling-webkit.png).
Per-engine environment details are in the adjacent `environment-*.json` files.
Selection moved from the parent to C as intended. No visual discrepancy was found;
these are review evidence, not replacement regression baselines.

Run `pnpm dev`, open http://127.0.0.1:5173/, and use the live reference map:

1. Click B; press Delete three times. Selection should be C, A, then One.
2. Undo three times with Command/Ctrl+Z; redo with Command/Ctrl+Shift+Z.
3. Reset the map. Right-click One and choose Delete; Two should be selected.
4. Reset, click B and use Command/Ctrl+X; C should be selected. Undo restores B.

The demo's review-evidence section links this report. No known defect remains in
this change's exercised scope. Full milestone/release gates, package/performance
reruns, installed-browser and manual assistive-technology checks were not run for
this focused selection change. Existing release gaps retain their recorded status
in [acceptance](../../../acceptance.md); simulated Windows routing is not an
actual Windows run.
