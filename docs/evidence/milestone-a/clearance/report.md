# Stage-3 descender clearance — 2026-09-07

The user approved restoring space beneath the text while retaining Arial and
tuning the gap above N1 separately. This correction is technically complete;
**visual acceptance is pending**. Tested working tree: the correction commit
containing this report, based on `0f6ab03`. No later milestone was started.

Run `pnpm dev` and open http://127.0.0.1:5173. Review the current comparison in
[Chromium](comparison-chromium.png), [Firefox](comparison-firefox.png), and
[WebKit](comparison-webkit.png), against the [previous candidate](../spacing/comparison-chromium.png).
Checkbox/multiline appearance: [before](../spacing/geometry-chromium.png),
[after](geometry-chromium.png), [Firefox](geometry-firefox.png),
[WebKit](geometry-webkit.png), and [multiline root](root-multiline-chromium.png).
All supplied references and previous evidence are unchanged.

## Correction and measurements

- Non-root label offset changes from 2px to 0.5px downward: text moves up 1.5px
  inside the same 20px single-line box. Padding is now 3px top / 2px bottom.
- Root-level subtree spacing increases from 3px to 4.5px, independently of the
  3px gap inside branches. This preserves the gap above N1 and the 23px A/B/C pitch.
  The setting applies structurally to both sides, without fixture-specific IDs.
- Root text/ellipse dimensions and the checkbox's 1px optical raise remain.
  Arial, #339933 checked fills, selection, and line stacking remain as before.

The first 1px trial still left Firefox with only one clear row beneath descenders.
An additional 0.5px lift gives two clear rows in all three engines. Measurements
now count **all nonwhite pixels** in the descender crop, rather than excluding faint
antialiasing as the previous spacing diagnostic did. Both dark-ink and complete
edge measurements are retained in [ink-spacing.json](ink-spacing.json).

| Blank pixel rows at native size | FreeMind | Previous Chromium / Firefox / WebKit | Current Chromium / Firefox / WebKit |
|---|---|---|---|
| In-place editing descenders to branch, including all faint edges | 2 | 1 / 0 / 1 | 2 / 2 / 2 |
| In-place editing branch to N1 dark ink | 11 | 11 / 11 / 11 | 11 / 11 / 11 |

Reproduce with `python3 docs/evidence/milestone-a/clearance/inspect-spacing.py`
(Pillow required). It asserts the improved clearance in every engine and the
preserved N1 gap; [output](ink-checks.txt). This is a targeted geometry/ink check,
not an approved screenshot regression baseline.

Java's `SansSerif` is a logical font. For ordinary Latin text the standard Windows
configuration maps it to Arial, supporting the existing widget font choice.
[OpenJDK Windows mapping](https://raw.githubusercontent.com/openjdk/jdk8u/master/jdk/src/windows/classes/sun/awt/windows/fontconfig.properties),
[Oracle logical-font configuration documentation](https://docs.oracle.com/javase/8/docs/technotes/guides/intl/fontconfig.html).
The exact Java installation on the reference machine was not inspected; the
mapping is an inference from standard defaults and the user's preferences report.

## Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed, ESM/declarations/exported CSS.
- `pnpm test`: passed, **56 unit tests**.
- `pnpm test:browser`: passed, **36 browser cases** across Chromium/Firefox/WebKit.
- Native pixel clearance assertions: passed in all three engines.
- `git diff --check` and staged whitespace check: passed.
- [Type/build/unit output](checks.txt), [browser output](browser-checks.txt).
- DOM spacing evidence: [Chromium](spacing-chromium.json),
  [Firefox](spacing-firefox.json), [WebKit](spacing-webkit.json).
- Appearance regression evidence: [Chromium](appearance-chromium.json),
  [Firefox](appearance-firefox.json), [WebKit](appearance-webkit.json).
- The 1,000-total/500-visible workload diagnostic reran:
  [Chromium](workload-chromium.json), [Firefox](workload-firefox.json),
  [WebKit](workload-webkit.json).

New unit checks verify independent root-group spacing on both sides, including
zero gap, parent centering, and unchanged inner spacing. Browser checks verify the
new theme property's effect through `refreshLayout`, unchanged A/B/C pitch, the
2px label-box clearance, and retained checkbox alignment. The former 0.5px clearance
assertion was updated to the newly authorized 2px inset; non-overlap, root
containment, line stacking, color, focus, and model assertions were not relaxed.
Final comparison and checkbox images in every engine and the Chromium multiline
root were opened and inspected.

Environment: macOS, Apple M2 / 16GB; exact browser/OS versions in workload JSON.
Comparison viewport 1440×1200, device scale 1, widget zoom 100%, Arial 12px/15px.
The native reference and CSS candidate panels are 605×324; Chromium/Firefox crop
rounding retains an additional bottom pixel. Root alignment is comparison-only.

## Remaining review limits

Font rasterization and some branch positions still differ from Windows FreeMind.
Consistent text positioning with sufficient descender clearance leaves ordinary
letters slightly farther from their lines: the Child2 dark-ink gap is 6 / 5 / 6
rows versus 4 in FreeMind. This tradeoff is recorded rather than moving individual
labels based on their characters. The screenshots remain candidates for review.

No unresolved stage-3 behavior failure is known. Stage-4/5 selection, navigation,
viewport, and editing remain next, after product review and authorization.
Clipboard/links/drag remain milestone C. Packaged consumer, actual stable browsers,
manual VoiceOver/NVDA, and final performance profiling are **not run**, still
required milestone-D gates. The workload evidence here is an early synchronous
diagnostic, not input-to-paint, frame, or cold-load release profiling.
