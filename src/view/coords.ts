// Pure musical <-> pixel coordinate transforms. No React, no DOM, no store.
// A `Viewport` is the viewportSlice state plus the layout constants.

import type { Note, Ticks } from '@/domain/types'


export interface Viewport {
  pxPerTick:     number
  rowHeight:     number
  scrollTicks:   Ticks
  scrollPitch:   number
  width:         number
  height:        number
  keyboardWidth: number
  rulerHeight:   number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const tickToX = (ticks: Ticks, vp: Viewport): number =>
  vp.keyboardWidth + (ticks - vp.scrollTicks) * vp.pxPerTick

export const xToTick = (px: number, vp: Viewport): Ticks =>
  vp.scrollTicks + (px - vp.keyboardWidth) / vp.pxPerTick

// Higher pitch renders higher up (smaller y).
export const pitchToY = (pitch: number, vp: Viewport): number =>
  vp.rulerHeight + (vp.scrollPitch - pitch) * vp.rowHeight

export const yToPitch = (py: number, vp: Viewport): number =>
  vp.scrollPitch - (py - vp.rulerHeight) / vp.rowHeight

/** Integer pitch lane at a given y (the row the cursor is over). */
export const yToPitchLane = (py: number, vp: Viewport): number =>
  Math.floor(yToPitch(py, vp))

export const noteRect = (note: Note, vp: Viewport): Rect => ({
  x: tickToX(note.start, vp),
  // The lane spans [pitch, pitch+1); its top is pitchToY(pitch+1).
  y: pitchToY(note.pitch + 1, vp),
  w: note.duration * vp.pxPerTick,
  h: vp.rowHeight,
})

export const pointInRect = (px: number, py: number, r: Rect): boolean =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h

/** Normalize a rectangle from two corner points. */
export const rectFromPoints = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Rect => ({
  x: Math.min(x1, x2),
  y: Math.min(y1, y2),
  w: Math.abs(x2 - x1),
  h: Math.abs(y2 - y1),
})

export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
