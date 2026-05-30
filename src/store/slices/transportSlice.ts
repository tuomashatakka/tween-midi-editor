import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
} from '@/domain/constants'
import { ticksPerBar } from '@/domain/time'
import type { LoopRegion, Ticks, TimeSignature } from '@/domain/types'

interface TransportState {
  isPlaying: boolean
  bpm: number
  positionTicks: Ticks
  loop: LoopRegion
  timeSignature: TimeSignature
  metronome: boolean
}

const initialState: TransportState = {
  isPlaying: false,
  bpm: DEFAULT_BPM,
  positionTicks: 0,
  loop: {
    enabled: false,
    startTicks: 0,
    endTicks: ticksPerBar(DEFAULT_TIME_SIGNATURE) * 4,
  },
  timeSignature: DEFAULT_TIME_SIGNATURE,
  metronome: false,
}

const transportSlice = createSlice({
  name: 'transport',
  initialState,
  reducers: {
    play: (state) => {
      state.isPlaying = true
    },
    stop: (state) => {
      state.isPlaying = false
    },
    togglePlay: (state) => {
      state.isPlaying = !state.isPlaying
    },
    setBpm: (state, action: PayloadAction<number>) => {
      state.bpm = Math.max(20, Math.min(300, action.payload))
    },
    /** Authoritative playhead position; the audio engine writes this (throttled). */
    setPosition: (state, action: PayloadAction<Ticks>) => {
      state.positionTicks = Math.max(0, action.payload)
    },
    /** User-initiated jump (also resets playback anchor in the engine bridge). */
    seek: (state, action: PayloadAction<Ticks>) => {
      state.positionTicks = Math.max(0, action.payload)
    },
    setLoop: (state, action: PayloadAction<Partial<LoopRegion>>) => {
      state.loop = { ...state.loop, ...action.payload }
    },
    toggleLoop: (state) => {
      state.loop.enabled = !state.loop.enabled
    },
    setTimeSignature: (state, action: PayloadAction<TimeSignature>) => {
      state.timeSignature = action.payload
    },
    toggleMetronome: (state) => {
      state.metronome = !state.metronome
    },
  },
})

export const {
  play,
  stop,
  togglePlay,
  setBpm,
  setPosition,
  seek,
  setLoop,
  toggleLoop,
  setTimeSignature,
  toggleMetronome,
} = transportSlice.actions

export default transportSlice.reducer
