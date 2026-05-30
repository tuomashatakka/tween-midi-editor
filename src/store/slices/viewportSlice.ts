import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  DEFAULT_PX_PER_TICK,
  DEFAULT_ROW_HEIGHT,
  MAX_NOTE,
  MAX_PX_PER_TICK,
  MAX_ROW_HEIGHT,
  MIN_PX_PER_TICK,
  MIN_ROW_HEIGHT,
} from '@/domain/constants'
import type { Ticks } from '@/domain/types'


export interface ViewportState {
  pxPerTick:   number // horizontal zoom
  rowHeight:   number // vertical zoom (px per semitone)
  scrollTicks: Ticks // left edge of view, in ticks
  scrollPitch: number // top-most visible pitch (fractional allowed)
  width:       number // canvas CSS width
  height:      number // canvas CSS height
}

const initialState: ViewportState = {
  pxPerTick:   DEFAULT_PX_PER_TICK,
  rowHeight:   DEFAULT_ROW_HEIGHT,
  scrollTicks: 0,
  scrollPitch: 84, // top of view ~C6
  width:       800,
  height:      600,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const viewportSlice = createSlice({
  name:     'viewport',
  initialState,
  reducers: {

    /** Horizontal zoom that keeps `anchorTicks` stationary under the cursor. */
    zoomX: (
      state,
      action: PayloadAction<{ factor: number; anchorTicks: Ticks }>,
    ) => {
      const { factor, anchorTicks } = action.payload
      const next                    = clamp(state.pxPerTick * factor, MIN_PX_PER_TICK, MAX_PX_PER_TICK)
      // Keep the anchor pixel fixed: solve for new scrollTicks.
      state.scrollTicks =
        anchorTicks - (anchorTicks - state.scrollTicks) * state.pxPerTick / next
      state.pxPerTick = next
    },

    /** Vertical zoom that keeps `anchorPitch` stationary under the cursor. */
    zoomY: (
      state,
      action: PayloadAction<{ factor: number; anchorPitch: number }>,
    ) => {
      const { factor, anchorPitch } = action.payload
      const next                    = clamp(state.rowHeight * factor, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT)
      state.scrollPitch             =
        anchorPitch + (state.scrollPitch - anchorPitch) * state.rowHeight / next
      state.rowHeight = next
    },
    setScroll: (
      state,
      action: PayloadAction<{ scrollTicks?: number; scrollPitch?: number }>,
    ) => {
      if (action.payload.scrollTicks !== undefined)
        state.scrollTicks = Math.max(0, action.payload.scrollTicks)
      if (action.payload.scrollPitch !== undefined)
        state.scrollPitch = clamp(action.payload.scrollPitch, 0, MAX_NOTE)
    },

    /** Pan by a pixel delta (converted to ticks/pitch using current zoom). */
    panBy: (
      state,
      action: PayloadAction<{ dxPx: number; dyPx: number }>,
    ) => {
      const { dxPx, dyPx } = action.payload
      state.scrollTicks    = Math.max(0, state.scrollTicks - dxPx / state.pxPerTick)
      state.scrollPitch    = clamp(state.scrollPitch + dyPx / state.rowHeight, 0, MAX_NOTE)
    },
    setViewportSize: (
      state,
      action: PayloadAction<{ width: number; height: number }>,
    ) => {
      state.width  = action.payload.width
      state.height = action.payload.height
    },
  },
})

export const { zoomX, zoomY, setScroll, panBy, setViewportSize } =
  viewportSlice.actions

export default viewportSlice.reducer
