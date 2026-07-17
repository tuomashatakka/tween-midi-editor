// Pure two-finger pinch math. No React, no DOM, no store.

import { PINCH_MIN_SPREAD_PX } from '@/domain/constants'


export interface PointerPt {
  x: number
  y: number
}

export interface PinchPair {
  a: PointerPt
  b: PointerPt
}

export interface PinchDelta {
  factorX:  number // ratio of horizontal spreads (1 = no zoom)
  factorY:  number // ratio of vertical spreads
  centroid: PointerPt // next centroid
  dxPx:     number // centroid movement prev -> next
  dyPx:     number
}

// Bounds a single event's zoom jump; absolute zoom limits live in the reducers.
const clampFactor = (f: number): number => Math.max(0.5, Math.min(2, f))

const axisFactor = (prevSpread: number, nextSpread: number): number => {
  // Dead zone: fingers nearly stacked on this axis carry no zoom intent and
  // would otherwise produce divide-by-near-zero blowups.
  if (Math.max(prevSpread, nextSpread) < PINCH_MIN_SPREAD_PX)
    return 1
  return clampFactor(nextSpread / Math.max(1, prevSpread))
}

export function pinchDelta (prev: PinchPair, next: PinchPair): PinchDelta {
  const factorX = axisFactor(Math.abs(prev.a.x - prev.b.x), Math.abs(next.a.x - next.b.x))
  const factorY = axisFactor(Math.abs(prev.a.y - prev.b.y), Math.abs(next.a.y - next.b.y))

  const prevCx   = (prev.a.x + prev.b.x) / 2
  const prevCy   = (prev.a.y + prev.b.y) / 2
  const centroid = { x: (next.a.x + next.b.x) / 2, y: (next.a.y + next.b.y) / 2 }

  return {
    factorX,
    factorY,
    centroid,
    dxPx: centroid.x - prevCx,
    dyPx: centroid.y - prevCy,
  }
}
