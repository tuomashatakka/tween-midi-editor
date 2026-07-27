// Pure model of an incoming MIDI clock: tempo estimation and pulse counting.
// Following an external clock is the one place where a naive implementation
// visibly fails, so the maths lives here where it can be tested against
// synthetic pulse trains.

import { PPQ } from '@/domain/constants'
import type { Ticks } from '@/domain/types'
import { CLOCK_PPQN } from './messages'


/** Ticks advanced by one 0xF8 pulse. */
export const TICKS_PER_PULSE = PPQ / CLOCK_PPQN

/** One quarter note of history — long enough to be steady, short enough to track. */
const WINDOW = CLOCK_PPQN

const MIN_BPM = 20
const MAX_BPM = 300

/** Weight of each new reading in the smoothing filter. */
const EMA_ALPHA = 0.2

/** Maximum interquartile spread, relative to the median, that still counts as locked. */
const LOCK_TOLERANCE = 0.15

export interface FollowerState {
  pulses:       number
  startTick:    Ticks
  intervals:    number[]
  lastPerfMs:   number | null
  anchorPerfMs: number
  bpm:          number | null
}

export const createFollower = (startTick: Ticks, perfMs = 0): FollowerState => ({
  pulses:       0,
  startTick,
  intervals:    [],
  lastPerfMs:   null,
  anchorPerfMs: perfMs,
  bpm:          null,
})

/** Restart the pulse count at a new musical position, keeping the tempo estimate. */
export const resetFollower = (
  state: FollowerState,
  startTick: Ticks,
  perfMs: number,
): FollowerState => ({
  ...state,
  pulses:       0,
  startTick,
  lastPerfMs:   null,
  anchorPerfMs: perfMs,
})

const median = (values: number[]): number => {
  const sorted = [ ...values ].sort((a, b) => a - b)
  const mid    = sorted.length >> 1
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

const quantile = (sorted: number[], q: number): number =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)))]

/**
 * Tempo from inter-pulse intervals, via the **median** rather than the mean.
 * A single scheduler hiccup produces one 40ms interval among 20ms neighbours;
 * a mean would swing the displayed tempo visibly, a median ignores it.
 */
export const estimateBpm = (intervalsMs: number[]): number | null => {
  if (intervalsMs.length < WINDOW)
    return null

  const ms = median(intervalsMs)
  if (ms <= 0)
    return null

  const bpm = 60_000 / (ms * CLOCK_PPQN)
  return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm))
}

/** A full window whose spread is tight enough to trust. */
export const isLocked = (intervalsMs: number[]): boolean => {
  if (intervalsMs.length < WINDOW)
    return false

  const sorted = [ ...intervalsMs ].sort((a, b) => a - b)
  const mid    = median(sorted)
  if (mid <= 0)
    return false

  return (quantile(sorted, 0.75) - quantile(sorted, 0.25)) / mid <= LOCK_TOLERANCE
}

/** Fold one 0xF8 into the model. Pure: returns the next state. */
export const onClockPulse = (state: FollowerState, perfMs: number): FollowerState => {
  const pulses    = state.pulses + 1
  const intervals = state.lastPerfMs === null
    ? state.intervals
    : [ ...state.intervals, perfMs - state.lastPerfMs ].slice(-WINDOW)

  const raw = estimateBpm(intervals)
  const bpm = raw === null
    ? state.bpm
    // Median first, then a light EMA: the median rejects outliers, the EMA
    // keeps the number from flickering in the last decimal.
    : state.bpm === null ? raw : state.bpm + EMA_ALPHA * (raw - state.bpm)

  return { ...state, pulses, intervals, lastPerfMs: perfMs, bpm }
}

/** Musical position implied by the pulses counted so far. */
export const followerTick = (state: FollowerState): Ticks =>
  state.startTick + state.pulses * TICKS_PER_PULSE

/** Wall-clock instant the current pulse was expected at, given the estimate. */
export const expectedPerfMs = (state: FollowerState): number | null => {
  if (state.bpm === null)
    return null

  const pulseMs = 60_000 / (state.bpm * CLOCK_PPQN)
  return state.anchorPerfMs + state.pulses * pulseMs
}
