// Pure quantization. Lives in `domain` rather than the MIDI layer because the
// same transform serves both recorded input and an editing action over a
// selection.

import { snapToStep } from './time'
import type { Note, Ticks } from './types'


/**
 * Pull a tick toward the grid. `strength` 0 leaves it alone, 1 snaps it hard,
 * and anything between moves it proportionally — the usual "quantize amount".
 */
export const quantizeTick = (
  tick: Ticks,
  stepTicks: Ticks,
  strength = 1,
): Ticks => {
  if (stepTicks <= 0)
    return Math.round(tick)

  const amount = Math.max(0, Math.min(1, strength))
  const target = snapToStep(tick, stepTicks)
  return Math.round(tick + (target - tick) * amount)
}

export interface QuantizeOptions {
  stepTicks: Ticks
  strength?: number

  /** Also quantize note ends, keeping at least one step of duration. */
  ends?: boolean
}

export const quantizeNotes = <T extends Omit<Note, 'id'>>(
  notes: T[],
  options: QuantizeOptions,
): T[] => {
  const { stepTicks, strength = 1, ends = false } = options
  if (stepTicks <= 0)
    return notes

  return notes.map(note => {
    const start = Math.max(0, quantizeTick(note.start, stepTicks, strength))
    if (!ends)
      return { ...note, start }

    const end = quantizeTick(note.start + note.duration, stepTicks, strength)
    return { ...note, start, duration: Math.max(stepTicks, end - start) }
  })
}
