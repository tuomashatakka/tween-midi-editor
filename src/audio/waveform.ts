// Pure helpers describing the oscillator's output shape for the Melodyne-style
// waveform overlay. These mirror the SynthVoice envelope and the sawtooth tone,
// so the overlay is a faithful (deterministic) picture of what is heard — not a
// live capture. No DOM/audio APIs, so it is unit-testable.

import { pitchToFrequency, ticksToSeconds } from '@/domain/time'
import type { Note } from '@/domain/types'

// Kept in sync with SynthVoice's envelope timing.
const ATTACK_SEC  = 0.005
const RELEASE_SEC = 0.06

/**
 * Normalized gain envelope (0..1) at a position `p` (0=note start, 1=note end)
 * for a note of `durationSec`, scaled by velocity. Quick attack, sustain, then
 * a short release ramp — the recognizable "audio blob" outline.
 */
export const envelopeAt = (p: number, durationSec: number, velocity: number): number => {
  if (p <= 0 || p >= 1)
    return 0

  const attack  = Math.min(0.4, ATTACK_SEC / Math.max(durationSec, 1e-4))
  const release = Math.min(0.5, RELEASE_SEC / Math.max(durationSec, 1e-4))
  const vel     = Math.max(0, Math.min(127, velocity)) / 127
  let level: number
  if (p < attack)
    level = p / attack
  else if (p > 1 - release)
    level = (1 - p) / release
  else
    level = 1
  return level * vel
}

/** Sawtooth value in -1..1 at phase `ph` (cycles). Matches osc.type = 'sawtooth'. */
export const sawtoothAt = (ph: number): number => 2 * (ph - Math.floor(ph + 0.5))

/**
 * Number of waveform cycles to draw across a note. The true oscillator frequency
 * sets the trend (higher pitch ⇒ denser ripples) but it is clamped so a note
 * never renders denser than ~3px per cycle, which would alias into noise.
 */
export const visualCycleCount = (note: Note, bpm: number, widthPx: number): number => {
  const durationSec = ticksToSeconds(note.duration, bpm)
  const realCycles  = pitchToFrequency(note.pitch) * durationSec
  const maxByWidth  = Math.max(2, Math.floor(widthPx / 3))
  return Math.max(2, Math.min(Math.round(realCycles), maxByWidth))
}
