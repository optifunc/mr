# C review — clipboard space indentation

Approved on 2026-09-09, based on clean `4e46cea`. The commit containing this report
records the tested task changes. The prior drag corrections were accepted; this
clipboard extension remains at the stage-7 product review checkpoint.

Copy/cut now write four spaces per level. Paste accepts tabs and detects a single
space width across the whole input. Count spaces in each leading space/tab prefix
separately from tabs: all counts divisible by four choose four; otherwise all even
choose two. Odd counts reject. Each tab adds one level; mixed prefixes add both.
The first node must be unindented and depth may increase by at most one. Ambiguous
input chooses four without retrying another width after a depth error. Whitespace-only
lines participate and create empty labels at their indicated depth.

Literal leading label spaces are escaped by prefixing the first space with a
backslash (`\ `); additional spaces remain literal. This preserves whitespace-only
labels and exact copy/paste round trips while unescaped leading spaces now describe
hierarchy. Checkbox markers and other existing escapes retain their behavior.

## Review in the demo

Open http://127.0.0.1:5175/ or run `pnpm dev` and use its printed URL. Updated demo
help explains supported indentation. Copy this two-space outline, focus a node and
paste with Command/Ctrl+V:

```text
[ ] Parent
  [x] Child
    Grandchild
  Sibling
Other
```

Repeat using four spaces per level or tabs: the hierarchy should be identical.
Undo once, redo once, then copy the pasted selection into a plain-text editor:
its indentation should now be four spaces per level. For mixed input, use a tab
before Child, a tab plus two spaces before Grandchild, and two spaces before Sibling.
Try three spaces before a child to verify rejection without a partial paste.

## Verification

- Passed: typecheck, ESM/CSS/declaration build, **163 unit tests**. [Log](checks.txt).
- Passed: **79 browser cases**, with **2 existing permission-grant skips**.
  [Log](browser.txt). Native clipboard input/output passed in Chromium, Firefox and
  WebKit; the skipped asynchronous permission counterparts remain Chromium-only.
- Pre-change: **19 failed / 20 passed** against the new codec expectations.
  [Reproduction log](before-unit.txt). Final unit/browser runs had no failures.
- New pure coverage verifies late detection evidence, both mixed-prefix orders,
  four-space ambiguity, initial/depth/odd errors, whitespace-only lines, escaped
  leading spaces, checkboxes, multiline and literal backslashes. Existing collapsed
  descendants, selection order, deep paste, ID failures and undo/redo checks passed.
- New native browser cases copy text through a real textarea, paste by keyboard,
  verify hierarchy/checkboxes/leading spaces/empty labels, undo and redo exact IDs,
  and copy back to the textarea to check exact four-space output. API invalid-input
  cases verify unchanged document, selection, undo/redo and no completion event.
- Screenshots inspected: [two-space Chromium](indentation-two-chromium.png),
  [four-space Firefox](indentation-four-firefox.png),
  [mixed WebKit](indentation-mixed-webkit.png). All show the same expected hierarchy,
  multiline checkbox child and retained empty sibling. Images are review candidates.
- Exact input/output, pasted document and completion events:
  [two-space](indentation-two-chromium.json), [four-space](indentation-four-firefox.json),
  [mixed](indentation-mixed-webkit.json). Tab-only counterparts are also retained.

Commands:

```sh
pnpm typecheck
pnpm build
pnpm test
MINDMAP_EVIDENCE=docs/evidence/milestone-c/clipboard-indentation pnpm test:browser tests/browser/clipboard.spec.ts --workers=1
```

Environment: macOS, pinned Playwright 1.58.2 Chromium/Firefox/WebKit, 1400×1000
viewport, DPR 1, 12px Arial/15px line height. Earlier evidence and supplied/accepted
baselines are preserved. Whitespace, local evidence links and the live-demo HTTP
smoke passed. No known defect remains in this extension.

The full milestone/workload and exact default-image comparisons were not rerun for
this codec change. Existing actual-stable-browser, screen-reader/IME, packaged-consumer
and release performance checks remain outstanding in the [C report](../report.md).
Stages 8–9 were not started; no release gate is waived.
