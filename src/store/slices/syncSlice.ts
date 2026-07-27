import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'


export type ExternalSync = 'off' | 'follow' | 'send'
export type SyncStatus = 'idle' | 'waiting' | 'locked'

/**
 * Ableton Live sync over MIDI clock, routed through a virtual port (IAC on
 * macOS, loopMIDI on Windows).
 *
 * A slice of its own rather than fields on `transport`, because
 * `projectMiddleware` dirties the file on `transport/*` actions and a device
 * choice is a machine preference, not document content.
 */
export interface SyncState {
  mode:            ExternalSync
  clockInputId:    string | null
  clockInputName:  string | null
  clockOutputId:   string | null
  clockOutputName: string | null

  /** Trim applied to outgoing timestamps, in milliseconds. */
  offsetMs: number

  status:      SyncStatus
  externalBpm: number | null
}

export const initialSyncState: SyncState = {
  mode:            'off',
  clockInputId:    null,
  clockInputName:  null,
  clockOutputId:   null,
  clockOutputName: null,
  offsetMs:        0,
  status:          'idle',
  externalBpm:     null,
}

const syncSlice = createSlice({
  name:         'sync',
  initialState: initialSyncState,
  reducers:     {
    setSyncMode: (state, action: PayloadAction<ExternalSync>) => {
      state.mode = action.payload
      if (action.payload === 'off') {
        state.status      = 'idle'
        state.externalBpm = null
      }
    },

    // Port names are stored alongside ids: Web MIDI ids are stable per browser
    // profile but differ across machines, whereas "IAC Driver Bus 1" does not.
    setClockInput: (
      state,
      action: PayloadAction<{ id: string | null; name: string | null }>,
    ) => {
      state.clockInputId   = action.payload.id
      state.clockInputName = action.payload.name
    },
    setClockOutput: (
      state,
      action: PayloadAction<{ id: string | null; name: string | null }>,
    ) => {
      state.clockOutputId   = action.payload.id
      state.clockOutputName = action.payload.name
    },

    setSyncOffset: (state, action: PayloadAction<number>) => {
      state.offsetMs = Math.max(-100, Math.min(100, Math.round(action.payload)))
    },
    setSyncStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.status = action.payload
    },
    setExternalBpm: (state, action: PayloadAction<number | null>) => {
      state.externalBpm = action.payload
    },
  },
})

export const {
  setSyncMode,
  setClockInput,
  setClockOutput,
  setSyncOffset,
  setSyncStatus,
  setExternalBpm,
} = syncSlice.actions

export default syncSlice.reducer
