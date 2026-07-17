import { describe, expect, it } from 'vitest'
import { pinchDelta } from './pinch'
import type { PinchPair } from './pinch'


const pair = (ax: number, ay: number, bx: number, by: number): PinchPair => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
})

describe('pinchDelta', () => {
  it('doubling the horizontal spread doubles factorX', () => {
    const d = pinchDelta(pair(100, 0, 200, 0), pair(50, 0, 250, 0))
    expect(d.factorX).toBeCloseTo(2)
    expect(d.factorY).toBe(1) // vertical spread stays in the dead zone
  })

  it('halving the vertical spread gives factorY 0.5', () => {
    const d = pinchDelta(pair(0, 100, 0, 300), pair(0, 150, 0, 250))
    expect(d.factorY).toBeCloseTo(0.5)
    expect(d.factorX).toBe(1)
  })

  it('applies a dead zone when fingers are nearly stacked on an axis', () => {
    // 10px -> 20px horizontal spread is a 2x ratio but under the threshold.
    const d = pinchDelta(pair(100, 0, 110, 0), pair(100, 0, 120, 0))
    expect(d.factorX).toBe(1)
  })

  it('clamps a single event factor to at most 2 and at least 0.5', () => {
    const explode = pinchDelta(pair(0, 0, 30, 0), pair(0, 0, 300, 0))
    expect(explode.factorX).toBe(2)

    const collapse = pinchDelta(pair(0, 0, 300, 0), pair(0, 0, 30, 0))
    expect(collapse.factorX).toBe(0.5)
  })

  it('reports centroid and its movement', () => {
    const d = pinchDelta(pair(0, 0, 100, 100), pair(20, 10, 120, 110))
    expect(d.centroid).toEqual({ x: 70, y: 60 })
    expect(d.dxPx).toBeCloseTo(20)
    expect(d.dyPx).toBeCloseTo(10)
  })

  it('is symmetric under swapping the two pointers', () => {
    const d1 = pinchDelta(pair(100, 0, 200, 50), pair(80, 0, 220, 60))
    const d2 = pinchDelta(pair(200, 50, 100, 0), pair(220, 60, 80, 0))
    expect(d1.factorX).toBeCloseTo(d2.factorX)
    expect(d1.factorY).toBeCloseTo(d2.factorY)
    expect(d1.dxPx).toBeCloseTo(d2.dxPx)
    expect(d1.dyPx).toBeCloseTo(d2.dyPx)
  })
})
