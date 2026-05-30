// Pure musical-time helpers. No React, no DOM, no store — fully unit-testable.

import { PPQ } from './constants'
import type { Note, Ticks, TimeSignature } from './types'

export const noteEnd = (n: Note): Ticks => n.start + n.duration

/** Ticks per beat, where a "beat" is one denominator unit of the time signature. */
export const ticksPerBeat = (ts: TimeSignature): Ticks => (PPQ * 4) / ts.denominator

export const ticksPerBar = (ts: TimeSignature): Ticks =>
  ticksPerBeat(ts) * ts.numerator

/** Length in ticks of a 1/division note, optionally a triplet. */
export const divisionTicks = (division: number, triplet = false): Ticks => {
  const base = (PPQ * 4) / division
  return triplet ? (base * 2) / 3 : base
}

/** Snap a tick value to the nearest grid step. */
export const snapTicks = (
  t: Ticks,
  division: number,
  triplet = false,
): Ticks => {
  const step = divisionTicks(division, triplet)
  if (step <= 0) return t
  return Math.round(t / step) * step
}

/** Snap a tick value down to the grid step at or before it (for note placement). */
export const floorToGrid = (
  t: Ticks,
  division: number,
  triplet = false,
): Ticks => {
  const step = divisionTicks(division, triplet)
  if (step <= 0) return t
  return Math.floor(t / step) * step
}

export const ticksToSeconds = (ticks: Ticks, bpm: number): number =>
  (ticks / PPQ) * (60 / bpm)

export const secondsToTicks = (seconds: number, bpm: number): Ticks =>
  (seconds * bpm * PPQ) / 60

/** MIDI note number -> frequency in Hz (A4 = 69 = 440Hz). */
export const pitchToFrequency = (pitch: number): number =>
  440 * Math.pow(2, (pitch - 69) / 12)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Human-readable note name, e.g. 60 -> "C4". */
export const pitchName = (pitch: number): string => {
  const name = NOTE_NAMES[((pitch % 12) + 12) % 12]
  const octave = Math.floor(pitch / 12) - 1
  return `${name}${octave}`
}

export const isBlackKey = (pitch: number): boolean => {
  const n = ((pitch % 12) + 12) % 12
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10
}
