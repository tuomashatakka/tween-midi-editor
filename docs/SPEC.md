# Tween MIDI Editor — Specification

## 1. Overview

Tween is a browser-first (optionally Electron-wrapped) MIDI piano-roll editor.
Its guiding principle is **strict separation of data and UI**: all application
state lives in Redux Toolkit slices and is mutated **only** through reducer
actions (or thunks composing them). React components are presentational, and the
`<canvas>` piano roll is a pure render of selector output. Musical data is stored
in **ticks** (PPQ = 960), never pixels — pixels are derived in the view layer from
the viewport's zoom/scroll state.

This document describes the **current MVP** and the **planned roadmap**. It is the
source of truth for scope; keep it updated as features land.

---

## 2. Current MVP

### 2.1 Domain model (`src/domain`)
- `Note { id, pitch (0–127), start (ticks), duration (ticks), velocity (0–127) }`.
  `end` is derived (`start + duration`), never stored.
- `PPQ = 960`; pure time math in `time.ts` (tick↔beat↔seconds, snapping, triplets,
  pitch→frequency, pitch names).
- Layout constants (keyboard width, ruler height, zoom bounds) in `constants.ts`.

### 2.2 State (`src/store/slices`)
- **notesSlice** — `createEntityAdapter<Note>`, the sole owner of note records.
  Actions: `addNote`/`addNotes`, `removeNote(s)`, `updateNote(s)`, `moveNotesBy`
  (relative, clamps pitch/start), `setNoteVelocity`. Wrapped in `redux-undo`.
- **selectionSlice** — `{ selectedIds }` with select/toggle/add/set/clear.
- **toolSlice** — active tool, grid snap, division, triplet, default note duration,
  `showWaveform`, `playOnDraw`.
- **transportSlice** — `isPlaying`, `bpm`, `positionTicks`, `loop`, `clipEndTicks`
  (the Ableton-style clip end marker; playback stops there when looping is off),
  `timeSignature`, `metronome`.
- **viewportSlice** — `pxPerTick`, `rowHeight`, `scrollTicks`, `scrollPitch`, size;
  zoom-to-cursor on both axes, pan.
- **projectSlice** — `fileName`, `dirty` (set by `projectMiddleware` on
  content-changing actions, cleared on save/load).

Cross-slice operations (delete, select-all, copy/cut/paste, duplicate, nudge,
transpose, undo/redo) are **thunks** in `src/thunks/editingThunks.ts` — never
inside reducers. MIDI import/export live in `src/thunks/projectThunks.ts`.

### 2.3 View layer (`src/view`)
- `coords.ts` — pure musical↔pixel transforms (`tickToX`, `xToTick`, `pitchToY`,
  `yToPitch`, `noteRect`, rect helpers).
- `hitTest.ts` — pure `hitTestNote` (body vs resize edge) and `notesInRect` (marquee).
- `theme.ts` — canvas palette.

### 2.4 Canvas piano roll (`src/components/PianoRoll`)
- Layered pure draw functions composed in one `requestAnimationFrame` loop
  (`useCanvasRenderer`): grid → notes → **waveform overlay** → marquee/draft overlay
  → ruler → keyboard → playhead.
- In-progress drags/resizes/marquees are held in a React ref and committed as a
  **single action on pointer-up**, so the store never churns per frame.

### 2.5 Tools, input & shortcuts
- Tools: **select** (move/resize/multi-select; dragging empty space rubber-band
  selects, Ableton-style), **draw** (pencil add/remove), **pan**.
- Icon toolbar (incl. Open/Save MIDI + file name/dirty indicator) + transport
  controls (play/stop, BPM, loop) + grid/snap/triplet + waveform & play-on-draw
  toggles.
- Ableton-grounded keymap (`src/keymap`): Draw `B`, Play/Stop `Space`, Delete,
  Select-all `Ctrl/Cmd+A`, Copy/Cut/Paste, Duplicate `Ctrl/Cmd+D`, Undo/Redo,
  nudge `Ctrl/Cmd+←/→`, transpose `↑/↓` (octave with `Shift`), grid `Ctrl/Cmd+1/2/3/4`,
  loop `Ctrl/Cmd+L`, zoom `+/-`, Open `Ctrl/Cmd+O`, Save `Ctrl/Cmd+S`.
- Wheel (native non-passive listener): plain wheel **zooms X** at the cursor;
  `Ctrl/Cmd+wheel` zooms X (covers trackpad pinch); `Alt+wheel` zooms Y;
  `Shift+wheel` pans; dominant horizontal deltas pan the timeline
  (`interactions/wheelIntent.ts`).
- **Touch**: one finger drives the active tool; two fingers pinch-zoom per axis
  and pan (`interactions/pinch.ts` + the `usePianoRollInteractions` router,
  which owns pointer routing by region: ruler / keyboard / grid).
- **Ruler**: lower band click/drag seeks (scrubs); upper band hosts the
  draggable loop brace (body moves, edges resize) and the clip-end marker
  (`src/view/rulerHitTest.ts`, wider grab tolerance for touch).

### 2.6 Audio (`src/audio`)
- `AudioEngine` owns the `AudioContext` and a lookahead scheduler (Chris Wilson
  pattern); `SynthVoice` is a sawtooth oscillator + gain envelope per note.
- `transportBridge` is a side-effect layer: transport state → engine; the engine
  reports the playhead back via throttled `setPosition` and reads notes on demand.
- **Click-to-preview**: clicking the left keyboard auditions a pitch; clicking a
  note in select mode auditions it. **Play-on-draw**: drawing a note plays it (toggle).
- **Waveform overlay** (Melodyne-style): a transparent per-note overlay drawn from
  the synth's envelope + sawtooth shape (`src/audio/waveform.ts`). It is a faithful
  *deterministic* picture of the tone (amplitude = velocity envelope; ripple density
  tracks pitch, clamped for legibility), not a live capture. Toggleable.

### 2.7 Tooling
- Vite + React 18 + TypeScript + Redux Toolkit. Vitest for tests. ESLint via
  `@tuomashatakka/eslint-config`. CI (typecheck/lint/test/build) + GitHub Pages
  deploy workflows. Optional Electron wrapper (`electron/`, `ELECTRON=1`).

---

## 3. Roadmap / Future Features

> These are planned, **not yet implemented**. Each should preserve the data/UI
> separation: new data lives in slices, mutated only via actions/thunks; the canvas
> and panels stay presentational.

### 3.1 MIDI file load & save — ✅ implemented
Shipped as designed (see §2.2/§2.5): a hand-rolled SMF reader/writer in
`src/midi/` (`smfParse.ts` handles type 0/1, running status, PPQ rescaling;
`smfEncode.ts` writes type 0) emits plain domain objects — the store never sees
raw MIDI bytes. `projectSlice` (file name, dirty flag) plus
`importMidiData`/`importMidiFile`/`exportMidi` thunks; toolbar buttons,
`Ctrl/Cmd+O`/`Ctrl/Cmd+S`, and drag-and-drop of `.mid` files onto the window.
Still open: native save dialog in the Electron wrapper (browser download is
used everywhere today).

### 3.2 Controllers, automation & messages
- **Per-note expression**: velocity already exists; add an editable **velocity lane**
  below the grid, plus **pitch bend** and **mod wheel** lanes.
- **Automation / curve editor**: an Ableton-style overlay for drawing breakpoint
  envelopes (linear + curved segments) over the timeline for any parameter. Model as
  `AutomationLane { target, points: { tick, value, curve }[] }`; a pure
  `sampleAutomation(lane, tick)` feeds both rendering and the audio engine.
- **CC & Program Change**: represent generic `ControlChange { tick, controller, value }`
  and `ProgramChange { tick, program }` events in their own slice/adapter; render in
  dedicated lanes; include them in import/export and outgoing MIDI.

### 3.3 MIDI state as a provider/manager (I/O)
- Introduce a **MIDI source/sink manager** abstraction (`src/midi/`) that normalizes
  incoming events into store actions and routes outgoing events to a chosen sink:
  - **Sources**: connected hardware via the **Web MIDI API** (`navigator.requestMIDIAccess`),
    or a loaded file/clip. A `MidiInputManager` subscribes to selected input ports and
    dispatches note/CC actions (used for live play and recording).
  - **Sinks**: the internal oscillator synth (current), a connected hardware/software
    **output port**, or file export. A `MidiOutputManager` translates transport-scheduled
    events into Web MIDI `send()` calls with proper timestamps.
  - Provider/manager pattern: a React context exposes available ports and the active
    in/out selection; the actual event flow stays in the side-effect layer (like the
    audio bridge), keeping React presentational. Device hot-plug updates port lists.

### 3.4 Recording, quantization & generators
- **Recording**: arm + record incoming MIDI (from §3.3) against the transport into
  notes, with count-in and optional loop overdub. A `recordingSlice` holds armed state;
  a record bridge converts live note-on/off into committed `addNotes`.
- **Quantization**: pure transforms over selected notes — snap starts (and optionally
  ends) to a grid, with **strength/swing** parameters. Implement as thunks over
  `updateNotes` so they are undoable and testable.
- **Generators**: tools that emit notes from rules — arpeggiator, chord/scale fill,
  randomizer/humanizer (timing & velocity jitter), Euclidean rhythms. Each is a pure
  function `generate(params) → Note[]` dispatched via `addNotes`.

### 3.5 Musical context (key, meter)
- **Scale / key**: project key + scale (`scaleSlice` or part of a `musicSlice`);
  highlight in-scale rows on the keyboard/grid, optional **scale-snap** for pitch edits,
  and scale-aware generators. Pure helpers `notesInScale(root, scale)` /
  `quantizePitchToScale`.
- **Meter**: editable time signature and **beats-per-bar**, tempo map (multiple tempo
  changes), and bar/beat-aware grid + ruler. Already partially present in
  `transportSlice`; extend with a tempo/meter map and surface UI controls.

### 3.6 Theming & configuration
- **Theming**: promote `view/theme.ts` to a runtime, swappable theme (light/dark +
  custom palettes) exposed via context/CSS variables; persist the choice.
- **Configuration**: a settings panel + persisted `settingsSlice` (localStorage, or a
  config file in Electron) for editor preferences — default note length, snap defaults,
  keymap overrides, audio (waveform type, master volume, latency), MIDI device defaults,
  and UI density. All preferences flow through actions like the rest of the app.

---

## 4. Non-goals (for now)
- Full DAW arrangement (multiple tracks/clips beyond a single piano-roll clip).
- VST/AU plugin hosting.
- Audio (sample) tracks — Tween is MIDI-only.
