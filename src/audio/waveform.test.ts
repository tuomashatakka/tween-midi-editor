import { describe, expect, it } from 'vitest'
import { envelopeAt, sawtoothAt, visualCycleCount } from './waveform'
import { PPQ } from '@/domain/constants'
import type { Note } from '@/domain/types'


describe('waveform helpers', () => {
  it('envelope is zero at the endpoints and peaks in the sustain', () => {
    expect(envelopeAt(0, 0.5, 127)).toBe(0)
    expect(envelopeAt(1, 0.5, 127)).toBe(0)
    expect(envelopeAt(0.5, 0.5, 127)).toBeCloseTo(1)
  })

  it('envelope scales with velocity', () => {
    expect(envelopeAt(0.5, 0.5, 64)).toBeCloseTo(64 / 127)
    expect(envelopeAt(0.5, 0.5, 0)).toBe(0)
  })

  it('sawtooth ranges within -1..1 and rises across a cycle', () => {
    expect(sawtoothAt(0)).toBeCloseTo(0)
    expect(sawtoothAt(0.25)).toBeCloseTo(0.5)
    expect(Math.abs(sawtoothAt(0.49))).toBeLessThanOrEqual(1)
  })

  it('visual cycle count is clamped by the available pixel width', () => {
    const note: Note = { id: 'a', pitch: 96, start: 0, duration: PPQ, velocity: 100 }
    // A high pitch over a quarter note has hundreds of real cycles, but a 30px
    // wide note can show at most ~10 (30/3) so it stays legible.
    expect(visualCycleCount(note, 120, 30)).toBe(10)
    // Never fewer than 2.
    expect(visualCycleCount({ ...note, pitch: 0, duration: 1 }, 120, 100)).toBeGreaterThanOrEqual(2)
  })
})
