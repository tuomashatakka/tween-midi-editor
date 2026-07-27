import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Ticks } from '@/domain/types'


export type RecordMode = 'overdub' | 'replace'

/**
 * Session state for the recorder. Not undoable — like `transport` — but the
 * notes a take produces are.
 */
export interface RecordingState {
  isRecording:   boolean
  countingIn:    boolean
  countInBars:   number
  mode:          RecordMode
  quantizeInput: boolean

  /** Where the take actually begins; events before it are the count-in. */
  punchInTicks: Ticks | null
}

export const initialRecordingState: RecordingState = {
  isRecording:   false,
  countingIn:    false,
  countInBars:   0,
  mode:          'overdub',
  quantizeInput: false,
  punchInTicks:  null,
}

const recordingSlice = createSlice({
  name:         'recording',
  initialState: initialRecordingState,
  reducers:     {
    startRecording: (
      state,
      action: PayloadAction<{ punchInTicks: Ticks; countingIn: boolean }>,
    ) => {
      state.isRecording  = true
      state.punchInTicks = action.payload.punchInTicks
      state.countingIn   = action.payload.countingIn
    },
    endCountIn: state => {
      state.countingIn = false
    },
    stopRecording: state => {
      state.isRecording  = false
      state.countingIn   = false
      state.punchInTicks = null
    },
    setCountInBars: (state, action: PayloadAction<number>) => {
      state.countInBars = Math.max(0, Math.min(2, Math.round(action.payload)))
    },
    setRecordMode: (state, action: PayloadAction<RecordMode>) => {
      state.mode = action.payload
    },
    setQuantizeInput: (state, action: PayloadAction<boolean>) => {
      state.quantizeInput = action.payload
    },
  },
})

export const {
  startRecording,
  endCountIn,
  stopRecording,
  setCountInBars,
  setRecordMode,
  setQuantizeInput,
} = recordingSlice.actions

export default recordingSlice.reducer
