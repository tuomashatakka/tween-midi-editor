import { describe, expect, it } from 'vitest'
import reducer, { panBy, zoomX, zoomY } from './viewportSlice'
import { KEYBOARD_WIDTH, RULER_HEIGHT } from '@/domain/constants'
import { tickToX, pitchToY } from '@/view/coords'
import type { Viewport } from '@/view/coords'


const toViewport = (s: ReturnType<typeof reducer>): Viewport => ({
  ...s,
  keyboardWidth: KEYBOARD_WIDTH,
  rulerHeight:   RULER_HEIGHT,
})

describe('viewportSlice', () => {
  it('zoomX keeps the anchor tick pixel-stable', () => {
    const before      = reducer(undefined, { type: '@@INIT' })
    const anchorTicks = before.scrollTicks + 500
    const xBefore     = tickToX(anchorTicks, toViewport(before))
    const after       = reducer(before, zoomX({ factor: 2, anchorTicks }))
    const xAfter      = tickToX(anchorTicks, toViewport(after))
    expect(after.pxPerTick).toBeCloseTo(before.pxPerTick * 2)
    expect(xAfter).toBeCloseTo(xBefore)
  })

  it('zoomY keeps the anchor pitch pixel-stable', () => {
    const before      = reducer(undefined, { type: '@@INIT' })
    const anchorPitch = before.scrollPitch - 10
    const yBefore     = pitchToY(anchorPitch, toViewport(before))
    const after       = reducer(before, zoomY({ factor: 1.5, anchorPitch }))
    const yAfter      = pitchToY(anchorPitch, toViewport(after))
    expect(yAfter).toBeCloseTo(yBefore)
  })

  it('panBy never scrolls past tick 0', () => {
    const before = reducer(undefined, { type: '@@INIT' })
    const after  = reducer(before, panBy({ dxPx: 100000, dyPx: 0 }))
    expect(after.scrollTicks).toBe(0)
  })

  it('zoomX never scrolls past tick 0 when zooming out near the origin', () => {
    const before = reducer(undefined, { type: '@@INIT' })
    // Zooming out anchored right of the origin would otherwise solve for a
    // negative scrollTicks and expose bars before 1.
    const after = reducer(before, zoomX({ factor: 0.25, anchorTicks: before.scrollTicks + 500 }))
    expect(after.scrollTicks).toBe(0)
  })
})
