# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

Tone Clock: a React (TypeScript, Vite) component showing the 12 pitch
classes as toggleable beads on a circle. Later to be wrapped as a Tauri
desktop app. See `README.md` and the roadmap in `docs/plan.md`.

Reference implementation (Java, Android), read-only:
- `../tone-circle-android/tone-circle-android/src/com/harmoneye/tonecircle/ToneCircleView.java`
- `../harmoneye/harmoneye-commons/src/main/java/com/harmoneye/music/`
  (`PitchClassSet`, `PitchClassNamer`, `PitchClassSetNamer`)
- `../harmoneye/harmoneye-commons/res/raw/chord_names.json`

## Workflow

- **Test-driven development**: write a failing test first, then the minimal
  implementation, then refactor. Every new behavior comes with tests.
- **Focused commits**: one logical change per commit (e.g. "add pitch class
  set transposition", "render beads as SVG"). Tests go in the same commit as
  the code they cover. Don't mix refactoring, formatting and features.
- Run `npm test -- --run` and `npm run build` before committing; both must pass.
- Keep `docs/plan.md` up to date: tick off finished steps.
- Explain the music theory reasoning behind features in
  `docs/music-theory.md`.

## Code conventions

- Keep music theory logic pure and UI-free in `src/music/`; the component in
  `src/components/ToneClock/` only renders and handles input.
- A pitch class set is an immutable 12-bit integer mask (bit `i` = pitch class
  `i`, 0 = C), matching the `index` of the Java `PitchClassSet`.
- Tests live next to the code as `*.test.ts(x)` (Vitest + Testing Library).
- Prefer accessible markup (roles, labels, keyboard support) — it also makes
  components easy to test.

## Commands

```sh
npm run dev           # dev server
npm test -- --run     # run tests once
npm run build         # type-check + production build
```
