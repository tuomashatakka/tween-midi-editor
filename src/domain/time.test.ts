import { describe, expect, it } from 'vitest'
import { PPQ } from './constants'
import {
  divisionTicks,
  pitchToFrequency,
  pitchName,
  secondsToTicks,
  snapTicks,
  ticksPerBar,
  ticksPerBeat,
  ticksToSeconds,
} from './time'


describe('time math', () => {
  it('computes ticks per beat/bar for 4/4', () => {
    expect(ticksPerBeat({ numerator: 4, denominator: 4 })).toBe(PPQ)
    expect(ticksPerBar({ numerator: 4, denominator: 4 })).toBe(PPQ * 4)
  })

  it('computes division ticks including triplets', () => {
    expect(divisionTicks(4)).toBe(PPQ) // quarter
    expect(divisionTicks(16)).toBe(PPQ / 4) // sixteenth
    expect(divisionTicks(8, true)).toBe(PPQ / 2 * (2 / 3)) // eighth triplet
  })

  it('snaps to the nearest grid step', () => {
    const step = divisionTicks(16)
    expect(snapTicks(step * 0.4, 16)).toBe(0)
    expect(snapTicks(step * 0.6, 16)).toBe(step)
    expect(snapTicks(step * 2.5, 16)).toBe(step * 3)
  })

  it('converts ticks to seconds and back across BPMs', () => {
    expect(ticksToSeconds(PPQ, 120)).toBeCloseTo(0.5) // 1 beat at 120bpm = 0.5s
    expect(ticksToSeconds(PPQ, 60)).toBeCloseTo(1)
    expect(secondsToTicks(0.5, 120)).toBeCloseTo(PPQ)
  })

  it('maps pitch to frequency (A4=440)', () => {
    expect(pitchToFrequency(69)).toBeCloseTo(440)
    expect(pitchToFrequency(81)).toBeCloseTo(880)
  })

  it('names pitches', () => {
    expect(pitchName(60)).toBe('C4')
    expect(pitchName(69)).toBe('A4')
  })
})
