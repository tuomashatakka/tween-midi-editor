import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import { KEYBOARD_WIDTH, RULER_HEIGHT } from '@/domain/constants'
import { divisionTicks } from '@/domain/time'
import type { Viewport } from '@/view/coords'


export const selectViewportState = (state: RootState) => state.viewport
export const selectActiveTool = (state: RootState) => state.tool.active
export const selectSnapEnabled = (state: RootState) => state.tool.snapEnabled
export const selectDivision = (state: RootState) => state.tool.division
export const selectTriplet = (state: RootState) => state.tool.triplet

/** Full viewport value object (slice state + layout constants) for coord transforms. */
export const selectViewport = createSelector(
  [ selectViewportState ],
  (vp): Viewport => ({
    ...vp,
    keyboardWidth: KEYBOARD_WIDTH,
    rulerHeight:   RULER_HEIGHT,
  }),
)

export const selectVisibleTickRange = createSelector(
  [ selectViewport ],
  vp => {
    const start = vp.scrollTicks
    const end   = vp.scrollTicks + (vp.width - vp.keyboardWidth) / vp.pxPerTick
    return { start, end }
  },
)

export const selectVisiblePitchRange = createSelector(
  [ selectViewport ],
  vp => {
    const top    = vp.scrollPitch
    const bottom = vp.scrollPitch - (vp.height - vp.rulerHeight) / vp.rowHeight
    return { lo: Math.floor(bottom), hi: Math.ceil(top) }
  },
)

/** Effective snap step in ticks (0 when snapping is disabled). */
export const selectEffectiveSnapTicks = createSelector(
  [ selectSnapEnabled, selectDivision, selectTriplet ],
  (enabled, division, triplet) =>
    enabled ? divisionTicks(division, triplet) : 0,
)
