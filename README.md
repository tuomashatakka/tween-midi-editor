# Tween MIDI Editor

A zoomable, canvas-based MVP MIDI piano-roll editor with Ableton-style tools and
Web Audio oscillator playback. Built with **Vite + React 18 + TypeScript + Redux Toolkit**.

## Architecture

Data and UI are strictly separated. All application data is mutated **only** through
Redux Toolkit slice actions; React components are presentational and the canvas is a
pure render of selector output.

- **Musical data model** — notes are stored in ticks (PPQ = 960), never pixels.
  Pixels are derived in the view layer from the viewport's zoom/scroll state.
- **Slices** (`src/store/slices`): `notes` (entity-adapter, the sole owner of notes),
  `selection`, `tool`, `transport`, `viewport`. Notes are wrapped with `redux-undo`.
- **Pure view layer** (`src/view`): `coords.ts` (musical ↔ pixel transforms) and
  `hitTest.ts` (note hit-testing / marquee), both fully unit-tested.
- **Canvas piano roll** (`src/components/PianoRoll`): layered pure draw functions
  (grid, notes, ruler, keyboard, playhead, overlay) driven by one rAF loop. In-progress
  drags are held in a ref and committed as a single action on pointer-up.
- **Audio engine** (`src/audio`): a Web Audio side-effect layer with a lookahead
  scheduler and per-note oscillator voices, driven by transport state in the store.

## Tools & shortcuts

Tools: **select** (move/resize/multi-select), **pan**, **draw** (pencil), **marquee**.

Ableton-inspired keymap: Draw `B`, Play/Stop `Space`, Delete, Select-all `Ctrl/Cmd+A`,
Copy/Cut/Paste `Ctrl/Cmd+C/X/V`, Duplicate `Ctrl/Cmd+D`, Undo/Redo `Ctrl/Cmd+Z` / `+Shift+Z`,
nudge `Ctrl/Cmd+←/→`, transpose `↑/↓` (octave with `Shift`), grid `Ctrl/Cmd+1/2/3/4`,
loop `Ctrl/Cmd+L`, zoom `+/-`. Mouse: wheel scrolls, `Ctrl/Cmd+wheel` zooms X, `Alt+wheel` zooms Y.

## Scripts

```bash
npm run dev          # start the Vite dev server (web app)
npm run build        # type-check + production build
npm run preview      # preview the production build
npm test             # run the Vitest suite
npm run electron:dev # run inside the optional Electron wrapper
```
