# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## What this is
Tween MIDI Editor — a browser-first (optionally Electron-wrapped) canvas piano-roll
MIDI editor. Stack: **Vite + React 18 + TypeScript + Redux Toolkit**, tested with
**Vitest**, linted with **@tuomashatakka/eslint-config**.

Read `docs/SPEC.md` for the full specification and roadmap, and `README.md` for a
quick tour.

## Core architectural rule — data/UI separation
- All application data lives in Redux Toolkit slices (`src/store/slices`) and is
  mutated **only** through reducer actions, or thunks composing them
  (`src/thunks`). Components never mutate state directly.
- React components are **presentational**: they read via selectors and dispatch
  actions. The `<canvas>` piano roll is a pure render of selector output.
- Musical data is stored in **ticks** (PPQ = 960), never pixels. Pixels are derived
  in the view layer (`src/view/coords.ts`) from `viewportSlice`.
- Cross-slice logic goes in thunks, not reducers. Snapping happens in the
  interaction layer before dispatch, keeping reducers pure and deterministic.
- Side effects (audio, future MIDI I/O) live in dedicated bridge layers that
  subscribe to the store — not in components.

## Layout
- `src/domain` — types, constants, pure time/music math.
- `src/store` — slices, selectors, typed hooks, store wiring (`redux-undo` on notes).
- `src/view` — pure coordinate transforms, hit-testing, theme.
- `src/audio` — `AudioEngine`, `SynthVoice`, transport bridge, waveform helpers,
  preview engine singleton.
- `src/components` — `Toolbar`, `TransportControls`, `PianoRoll/` (canvas, layers,
  interactions, renderer).
- `src/keymap` — declarative shortcut table + listener hook.
- `electron/` — optional thin desktop wrapper.

## Conventions
- Keep new state in slices; expose data via selectors (memoize with `createSelector`).
- Prefer pure, unit-tested functions for math/transform logic (see `*.test.ts`).
- Match the existing ESLint style; run `npm run lint -- --fix`. NOTE: the config's
  `omit` rule strips braces from single-statement `if`/`else-if` branches — for
  multi-branch logic prefer a `switch` to avoid it producing invalid syntax.

## Checks (must pass before committing)
```bash
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint .
npm test            # vitest run
npm run build       # tsc -b && vite build
```
CI runs all of these on pull requests; the deploy workflow publishes to GitHub Pages
on push to `master`.

## Scripts
- `npm run dev` — Vite dev server (web app).
- `npm run electron:dev` — run inside the Electron wrapper.
- `npm run preview` — preview a production build.
