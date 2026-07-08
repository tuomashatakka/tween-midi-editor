import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_DIVISION, DEFAULT_NOTE_DURATION } from '@/domain/constants'
import type { GridDivision, Ticks, ToolKind } from '@/domain/types'


export interface ToolState {
  active:              ToolKind
  snapEnabled:         boolean
  division:            GridDivision
  triplet:             boolean
  defaultNoteDuration: Ticks
  showWaveform:        boolean
  playOnDraw:          boolean
}

export const initialToolState: ToolState = {
  active:              'select',
  snapEnabled:         true,
  division:            DEFAULT_DIVISION,
  triplet:             false,
  defaultNoteDuration: DEFAULT_NOTE_DURATION,
  showWaveform:        true,
  playOnDraw:          true,
}

const DIVISIONS: GridDivision[] = [ 1, 2, 4, 8, 16, 32 ]

const toolSlice = createSlice({
  name:         'tool',
  initialState: initialToolState,
  reducers:     {
    setTool: (state, action: PayloadAction<ToolKind>) => {
      state.active = action.payload
    },
    toggleSnap: state => {
      state.snapEnabled = !state.snapEnabled
    },
    setSnapEnabled: (state, action: PayloadAction<boolean>) => {
      state.snapEnabled = action.payload
    },
    setDivision: (state, action: PayloadAction<GridDivision>) => {
      state.division = action.payload
    },

    /** Move to a finer (narrower) grid. */
    finerGrid: state => {
      const i = DIVISIONS.indexOf(state.division)
      if (i < DIVISIONS.length - 1)
        state.division = DIVISIONS[i + 1]
    },

    /** Move to a coarser (wider) grid. */
    coarserGrid: state => {
      const i = DIVISIONS.indexOf(state.division)
      if (i > 0)
        state.division = DIVISIONS[i - 1]
    },
    toggleTriplet: state => {
      state.triplet = !state.triplet
    },
    setTriplet: (state, action: PayloadAction<boolean>) => {
      state.triplet = action.payload
    },
    setDefaultNoteDuration: (state, action: PayloadAction<Ticks>) => {
      state.defaultNoteDuration = Math.max(1, action.payload)
    },

    /** Toggle the Melodyne-style oscillator waveform overlay on notes. */
    toggleWaveform: state => {
      state.showWaveform = !state.showWaveform
    },
    setShowWaveform: (state, action: PayloadAction<boolean>) => {
      state.showWaveform = action.payload
    },

    /** Toggle audible preview of notes as they are drawn. */
    togglePlayOnDraw: state => {
      state.playOnDraw = !state.playOnDraw
    },
    setPlayOnDraw: (state, action: PayloadAction<boolean>) => {
      state.playOnDraw = action.payload
    },
  },
})

export const {
  setTool,
  toggleSnap,
  setSnapEnabled,
  setDivision,
  finerGrid,
  coarserGrid,
  toggleTriplet,
  setTriplet,
  setDefaultNoteDuration,
  toggleWaveform,
  setShowWaveform,
  togglePlayOnDraw,
  setPlayOnDraw,
} = toolSlice.actions

export default toolSlice.reducer
