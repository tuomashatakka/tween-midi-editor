import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { MidiPortInfo, TrackId } from '@/domain/types'
import { deleteTrackWithNotes, loadDocument } from '../documentActions'


/**
 * Web MIDI device state. Deliberately outside the undo history: port ids and
 * record arm are machine-specific session state, and undoing a note edit must
 * never re-route your audio or arm a track.
 *
 * Only serializable descriptors live here — the live `MIDIPort` objects stay in
 * the `midiAccess` registry, the same arrangement `src/audio/engine.ts` uses for
 * the AudioEngine.
 */
export type MidiSupport = 'unknown' | 'unsupported' | 'prompt' | 'granted' | 'denied'

export interface TrackRouting {

  /** null routes the track to the internal synth. */
  outputId: string | null
  armed:    boolean
}

export interface MidiState {
  support:       MidiSupport
  error:         string | null
  inputs:        MidiPortInfo[]
  outputs:       MidiPortInfo[]
  enabledInputs: string[]

  /** Echo live input to the armed tracks' sinks. */
  thru: boolean

  /** Input latency compensation in milliseconds, subtracted from recorded times. */
  recordLatencyMs: number

  routing: Record<TrackId, TrackRouting>
}

export const DEFAULT_ROUTING: TrackRouting = { outputId: null, armed: false }

export const initialMidiState: MidiState = {
  support:         'unknown',
  error:           null,
  inputs:          [],
  outputs:         [],
  enabledInputs:   [],
  thru:            true,
  recordLatencyMs: 0,
  routing:         {},
}

const routingFor = (state: MidiState, id: TrackId): TrackRouting => {
  state.routing[id] ??= { ...DEFAULT_ROUTING }
  return state.routing[id]
}

const midiSlice = createSlice({
  name:         'midi',
  initialState: initialMidiState,
  reducers:     {
    setMidiSupport: (state, action: PayloadAction<MidiSupport>) => {
      state.support = action.payload
      if (action.payload !== 'denied')
        state.error = null
    },
    setMidiError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },

    setPorts: (
      state,
      action: PayloadAction<{ inputs: MidiPortInfo[]; outputs: MidiPortInfo[] }>,
    ) => {
      state.inputs  = action.payload.inputs
      state.outputs = action.payload.outputs

      // Drop enabled inputs whose port has vanished entirely. A port that is
      // merely `connected: false` stays selected, so unplug/replug is seamless.
      const known         = new Set(action.payload.inputs.map(p => p.id))
      state.enabledInputs = state.enabledInputs.filter(id => known.has(id))
    },

    setEnabledInputs: (state, action: PayloadAction<string[]>) => {
      state.enabledInputs = [ ...new Set(action.payload) ]
    },
    toggleInput: (state, action: PayloadAction<string>) => {
      const id            = action.payload
      state.enabledInputs = state.enabledInputs.includes(id)
        ? state.enabledInputs.filter(x => x !== id)
        : [ ...state.enabledInputs, id ]
    },

    setThru: (state, action: PayloadAction<boolean>) => {
      state.thru = action.payload
    },
    setRecordLatencyMs: (state, action: PayloadAction<number>) => {
      state.recordLatencyMs = Math.max(-500, Math.min(500, Math.round(action.payload)))
    },

    setTrackOutput: (
      state,
      action: PayloadAction<{ id: TrackId; outputId: string | null }>,
    ) => {
      routingFor(state, action.payload.id).outputId = action.payload.outputId
    },
    setTrackArmed: (state, action: PayloadAction<{ id: TrackId; armed: boolean }>) => {
      routingFor(state, action.payload.id).armed = action.payload.armed
    },
    disarmAll: state => {
      for (const routing of Object.values(state.routing))
        routing.armed = false
    },
  },

  // Routing is keyed by track id, so it has to follow the document's track list.
  extraReducers: builder => {
    builder
      .addCase(deleteTrackWithNotes, (state, action) => {
        delete state.routing[action.payload.trackId]
      })
      .addCase(loadDocument, (state, action) => {
        const kept = new Set(action.payload.tracks.map(t => t.id))
        for (const id of Object.keys(state.routing))
          if (!kept.has(id))
            delete state.routing[id]
      })
  },
})

export const {
  setMidiSupport,
  setMidiError,
  setPorts,
  setEnabledInputs,
  toggleInput,
  setThru,
  setRecordLatencyMs,
  setTrackOutput,
  setTrackArmed,
  disarmAll,
} = midiSlice.actions

export default midiSlice.reducer
