import { describe, expect, it } from 'vitest'
import { quantizeNotes, quantizeTick } from './quantize'
import { PPQ } from './constants'
import { divisionTicks } from './time'


const STEP = PPQ / 4 // a sixteenth

describe('quantizeTick', () => {
  it('leaves the tick alone at strength 0', () => {
    expect(quantizeTick(263, STEP, 0)).toBe(263)
  })

  it('snaps hard at strength 1', () => {
    expect(quantizeTick(263, STEP, 1)).toBe(240)
    expect(quantizeTick(130, STEP, 1)).toBe(240)
  })

  it('moves halfway at strength 0.5', () => {
    // 263 -> 240 is -23; half of that lands on 252 (rounded).
    expect(quantizeTick(263, STEP, 0.5)).toBe(252)
  })

  it('clamps strength outside 0..1', () => {
    expect(quantizeTick(263, STEP, 5)).toBe(240)
    expect(quantizeTick(263, STEP, -5)).toBe(263)
  })

  it('handles a triplet step', () => {
    const step = divisionTicks(8, true)
    expect(quantizeTick(step * 2 + 5, step)).toBe(step * 2)
  })

  it('is a plain round when the step is zero', () => {
    expect(quantizeTick(263.6, 0)).toBe(264)
  })
})

describe('quantizeNotes', () => {
  const notes = [
    { trackId: 't1', pitch: 60, start: 263, duration: 200, velocity: 100 },
    { trackId: 't1', pitch: 64, start: 13, duration: 500, velocity: 90 },
  ]

  it('quantizes starts and leaves durations alone by default', () => {
    expect(quantizeNotes(notes, { stepTicks: STEP })).toEqual([
      { trackId: 't1', pitch: 60, start: 240, duration: 200, velocity: 100 },
      { trackId: 't1', pitch: 64, start: 0, duration: 500, velocity: 90 },
    ])
  })

  it('quantizes ends when asked, keeping at least one step of duration', () => {
    const [ first ] = quantizeNotes(
      [{ trackId: 't1', pitch: 60, start: 250, duration: 4, velocity: 100 }],
      { stepTicks: STEP, ends: true },
    )
    expect(first.start).toBe(240)
    expect(first.duration).toBe(STEP)
  })

  it('never produces a negative start', () => {
    expect(quantizeNotes(
      [{ trackId: 't1', pitch: 60, start: 10, duration: 100, velocity: 100 }],
      { stepTicks: STEP },
    )[0].start).toBe(0)
  })

  it('passes notes through when the step is zero', () => {
    expect(quantizeNotes(notes, { stepTicks: 0 })).toBe(notes)
  })
})
