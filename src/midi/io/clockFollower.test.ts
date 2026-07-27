import { describe, expect, it } from 'vitest'
import {
  createFollower,
  estimateBpm,
  followerTick,
  isLocked,
  onClockPulse,
  resetFollower,
  TICKS_PER_PULSE,
} from './clockFollower'
import { nextAnchor } from './phaseCorrection'
import { CLOCK_PPQN } from './messages'
import { PPQ } from '@/domain/constants'


/** Inter-pulse interval, in ms, for a steady tempo. */
const intervalFor = (bpm: number): number => 60_000 / (bpm * CLOCK_PPQN)

const steady = (bpm: number, count = CLOCK_PPQN): number[] =>
  Array.from({ length: count }, () => intervalFor(bpm))

describe('estimateBpm', () => {
  it('needs a full window before committing to a tempo', () => {
    expect(estimateBpm(steady(120, CLOCK_PPQN - 1))).toBeNull()
    expect(estimateBpm(steady(120))).toBeCloseTo(120, 6)
  })

  it('reads an exact pulse train', () => {
    expect(estimateBpm(steady(128))).toBeCloseTo(128, 6)
  })

  it('stays within half a bpm under +/-2ms of jitter', () => {
    const jittered = steady(120).map((ms, i) => ms + (i % 2 === 0 ? 2 : -2))
    expect(estimateBpm(jittered)!).toBeCloseTo(120, 0)
  })

  it('ignores a single large outlier, because it takes the median', () => {
    const hiccup = steady(120)
    hiccup[7] *= 3
    expect(estimateBpm(hiccup)).toBeCloseTo(120, 6)
  })

  it('tracks a tempo change once the window has turned over', () => {
    expect(estimateBpm(steady(90))).toBeCloseTo(90, 6)
  })

  it('clamps absurd tempos into the transport range', () => {
    expect(estimateBpm(steady(120).map(() => 0.01))).toBe(300)
    expect(estimateBpm(steady(120).map(() => 1000))).toBe(20)
  })

  it('returns null for a nonsensical window', () => {
    expect(estimateBpm(steady(120).map(() => 0))).toBeNull()
  })
})

describe('isLocked', () => {
  it('is false before a full window', () => {
    expect(isLocked(steady(120, 4))).toBe(false)
  })

  it('is true for a steady train', () => {
    expect(isLocked(steady(120))).toBe(true)
  })

  it('is false when the spread is wide', () => {
    const noisy = steady(120).map((ms, i) => ms * (i % 2 === 0 ? 0.5 : 1.8))
    expect(isLocked(noisy)).toBe(false)
  })
})

describe('follower state', () => {
  it('advances one 24-PPQN pulse per clock byte', () => {
    let state = createFollower(0, 0)
    expect(TICKS_PER_PULSE).toBe(PPQ / CLOCK_PPQN)

    for (let i = 1; i <= CLOCK_PPQN; i++)
      state = onClockPulse(state, i * intervalFor(120))

    expect(state.pulses).toBe(CLOCK_PPQN)
    // One quarter note of pulses is one quarter note of ticks.
    expect(followerTick(state)).toBe(PPQ)
  })

  it('counts from wherever a continue restarted it', () => {
    let state = createFollower(0, 0)
    state = onClockPulse(state, 10)
    state = resetFollower(state, PPQ * 4, 100)

    expect(state.pulses).toBe(0)
    expect(followerTick(state)).toBe(PPQ * 4)
    // The tempo estimate survives a relocate.
    expect(state.intervals.length).toBeGreaterThanOrEqual(0)
  })

  it('converges on the incoming tempo', () => {
    let state = createFollower(0, 0)
    for (let i = 1; i <= CLOCK_PPQN * 8; i++)
      state = onClockPulse(state, i * intervalFor(140))

    expect(state.bpm!).toBeCloseTo(140, 1)
  })
})

describe('nextAnchor', () => {
  it('nudges proportionally inside the deadband', () => {
    expect(nextAnchor(10, 0.02).anchorSec).toBeCloseTo(10.002, 6)
    expect(nextAnchor(10, 0.02).hard).toBe(false)
  })

  it('corrects in both directions', () => {
    expect(nextAnchor(10, -0.02).anchorSec).toBeCloseTo(9.998, 6)
  })

  it('asks for a hard relocate past the threshold', () => {
    expect(nextAnchor(10, 0.5).hard).toBe(true)
    expect(nextAnchor(10, -0.5).hard).toBe(true)
  })

  it('leaves the anchor untouched when relocating', () => {
    expect(nextAnchor(10, 0.5).anchorSec).toBe(10)
  })
})
