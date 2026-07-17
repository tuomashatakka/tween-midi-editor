// Pure hit-testing for the timeline ruler: loop brace, clip-end marker, seek.
// The brace band is the upper half of the ruler; the lower half always seeks.

import { RULER_EDGE_TOL_PX, RULER_EDGE_TOL_TOUCH_PX } from '@/domain/constants'
import type { LoopRegion, Ticks } from '@/domain/types'
import { tickToX } from './coords'
import type { Viewport } from './coords'


export type RulerHit =
  | { kind: 'loop-start' } |
  { kind: 'loop-end' } |
  { kind: 'loop-body' } |
  { kind: 'clip-end' } |
  { kind: 'seek' }

export const BRACE_BAND_RATIO = 0.5

export function rulerHitTest (
  px: number,
  py: number,
  vp: Viewport,
  loop: LoopRegion,
  clipEndTicks: Ticks,
  pointerType: string,
): RulerHit {
  if (py >= vp.rulerHeight * BRACE_BAND_RATIO)
    return { kind: 'seek' }

  const tol       = pointerType === 'touch' ? RULER_EDGE_TOL_TOUCH_PX : RULER_EDGE_TOL_PX
  const startX    = tickToX(loop.startTicks, vp)
  const endX      = tickToX(loop.endTicks, vp)
  const clipEndX  = tickToX(clipEndTicks, vp)
  const distStart = Math.abs(px - startX)
  const distEnd   = Math.abs(px - endX)

  // Loop edges take priority; on a tiny loop prefer the nearer edge.
  if (distStart <= tol && distStart <= distEnd)
    return { kind: 'loop-start' }
  if (distEnd <= tol)
    return { kind: 'loop-end' }
  if (Math.abs(px - clipEndX) <= tol)
    return { kind: 'clip-end' }
  if (px >= startX && px <= endX)
    return { kind: 'loop-body' }
  return { kind: 'seek' }
}
