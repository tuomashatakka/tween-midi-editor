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
- `Note { id, trackId, pitch (0–127), start (ticks), duration (ticks), velocity (0–127) }`.
  `end` is derived (`start + duration`), never stored.
- `Track { id, name, color, channel (0–15), muted, soloed, visible, locked }`.
  Device routing and record-arm are **not** on the track — they are
  machine-specific session state in `midiSlice`, keyed by track id.
- `PPQ = 960`; pure time math in `time.ts` (tick↔beat↔seconds, snapping, triplets,
  pitch→frequency, pitch names).
- Layout constants (keyboard width, ruler height, zoom bounds) in `constants.ts`.

### 2.2 State (`src/store/slices`)
- **notesSlice** — `createEntityAdapter<Note>`, the sole owner of note records.
  Actions: `addNote`/`addNotes`, `removeNote(s)`, `updateNote(s)`, `moveNotesBy`
  (relative, clamps pitch/start), `setNoteVelocity`.
- **tracksSlice** — `createEntityAdapter<Track>`; the adapter's `ids` array is
  the display and export order. Always at least one track.
- `notes` + `tracks` are combined into one **document** wrapped in `redux-undo`,
  so a track and its notes undo as a single step.
- **midiSlice / recordingSlice / syncSlice** — Web MIDI ports and per-track
  routing/arm, recorder session state, and external clock sync. All outside the
  undo history: undo must never re-route audio or re-arm a track.
- **selectionSlice** — `{ selectedIds, activeTrackId }` with select/toggle/add/
  set/clear plus `setActiveTrack`.
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
- `theme.ts` — canvas palette; `trackPalette.ts` — the categorical track colour
  series (index 0 is `theme.note`, and it excludes amber so the selection
  highlight stays unambiguous); `color.ts` — pure `darken`/`isHexColor`.

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

### 2.7 Tracks, MIDI I/O & Ableton sync
- **Tracks**: a togglable left drawer (`T`) lists them; each has a name, colour,
  MIDI channel, visibility, lock, mute/solo, record-arm and an output sink. The
  canvas colours notes per track and dims everything but the active one to 50%
  alpha. A track is editable when it is visible *and* either active or
  explicitly unlocked, so clicks fall through locked tracks to the grid.
- **MIDI files**: export writes **SMF type 1** — a conductor chunk holding
  tempo/meter, then one MTrk per track with its name and channel. Import splits
  incoming chunks/channels back into tracks (`src/midi/trackMapping.ts`).
- **Live MIDI I/O** (`src/midi/io`): Web MIDI ports are enumerated with hot-plug;
  permission is requested from a user gesture, never on load. Externally routed
  tracks play through `MidiNoteSink`, which rides the audio engine's lookahead
  window and converts to the `performance.now()` domain via
  `src/audio/clockDomain.ts`, so there is one clock and no drift.
- **Recording**: arm tracks in the drawer, then `R`/`F9`. `NoteRecorder` is pure
  and handles retriggers, unmatched note-offs, notes held at stop and loop-wrap
  splitting; each loop lap commits as its own undo step.
- **Ableton Live sync**: MIDI clock over a virtual port (IAC / loopMIDI), either
  **send** (`MidiClockSink` emits 24-PPQN pulses with future timestamps, so the
  driver does the timing) or **follow** (a software PLL: `clockFollower`
  estimates tempo from a median-filtered pulse window, `phaseCorrection` nudges
  the engine's anchor, and a large error triggers a relocate). While following,
  the external clock owns tempo and phase and the transport UI is disabled.
  Ableton Link is a non-goal — it needs native UDP peer discovery.

### 2.8 Tooling
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
`smfEncode.ts` writes type 1) emits plain domain objects — the store never sees
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

### 3.3 MIDI state as a provider/manager (I/O) — ✅ implemented
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

### 3.4 Recording, quantization & generators — recording ✅, generators open
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
- Full DAW arrangement (multiple *clips* and an arrangement view). Multiple
  tracks within the single piano-roll clip are supported — see §2.7.
- **Ableton Link.** Peer discovery is UDP, unreachable from a browser; sync goes
  over MIDI clock instead.
- VST/AU plugin hosting.
- Audio (sample) tracks — Tween is MIDI-only.
