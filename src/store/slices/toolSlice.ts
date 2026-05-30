import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_DIVISION, DEFAULT_NOTE_DURATION } from '@/domain/constants'
import type { GridDivision, Ticks, ToolKind } from '@/domain/types'


interface ToolState {
  active:              ToolKind
  snapEnabled:         boolean
  division:            GridDivision
  triplet:             boolean
  defaultNoteDuration: Ticks
  showWaveform:        boolean
  playOnDraw:          boolean
}

const initialState: ToolState = {
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
  name:     'tool',
  initialState,
  reducers: {
    setTool: (state, action: PayloadAction<ToolKind>) => {
      state.active = action.payload
    },
    toggleSnap: state => {
      state.snapEnabled = !state.snapEnabled
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
    setDefaultNoteDuration: (state, action: PayloadAction<Ticks>) => {
      state.defaultNoteDuration = Math.max(1, action.payload)
    },

    /** Toggle the Melodyne-style oscillator waveform overlay on notes. */
    toggleWaveform: state => {
      state.showWaveform = !state.showWaveform
    },

    /** Toggle audible preview of notes as they are drawn. */
    togglePlayOnDraw: state => {
      state.playOnDraw = !state.playOnDraw
    },
  },
})

export const {
  setTool,
  toggleSnap,
  setDivision,
  finerGrid,
  coarserGrid,
  toggleTriplet,
  setDefaultNoteDuration,
  toggleWaveform,
  togglePlayOnDraw,
} = toolSlice.actions

export default toolSlice.reducer
