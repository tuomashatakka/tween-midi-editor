import { describe, expect, it } from 'vitest'
import {
  noteRect,
  pitchToY,
  rectsIntersect,
  tickToX,
  xToTick,
  yToPitch,
  type Viewport,
} from './coords'

const vp: Viewport = {
  pxPerTick: 0.1,
  rowHeight: 16,
  scrollTicks: 100,
  scrollPitch: 84,
  width: 800,
  height: 600,
  keyboardWidth: 64,
  rulerHeight: 28,
}

describe('coordinate transforms', () => {
  it('round-trips tick <-> x', () => {
    for (const t of [0, 100, 480, 1920]) {
      expect(xToTick(tickToX(t, vp), vp)).toBeCloseTo(t)
    }
  })

  it('round-trips pitch <-> y', () => {
    for (const p of [0, 36, 60, 84, 127]) {
      expect(yToPitch(pitchToY(p, vp), vp)).toBeCloseTo(p)
    }
  })

  it('places the keyboard origin at keyboardWidth for scrollTicks', () => {
    expect(tickToX(vp.scrollTicks, vp)).toBe(vp.keyboardWidth)
  })

  it('renders higher pitch higher up (smaller y)', () => {
    expect(pitchToY(72, vp)).toBeLessThan(pitchToY(60, vp))
  })

  it('builds a note rect spanning its lane and duration', () => {
    const r = noteRect({ id: 'a', pitch: 60, start: 100, duration: 480, velocity: 100 }, vp)
    expect(r.x).toBe(vp.keyboardWidth)
    expect(r.w).toBeCloseTo(480 * vp.pxPerTick)
    expect(r.h).toBe(vp.rowHeight)
  })

  it('detects rectangle intersection', () => {
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true)
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 })).toBe(false)
  })
})
