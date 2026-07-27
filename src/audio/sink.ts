import type { Note, Ticks } from '@/domain/types'
import type { ClockPair } from './clockDomain'


/**
 * One lookahead pass of the transport, handed to every registered sink.
 *
 * Sinks receive the whole *window* rather than individual notes because not
 * every sink is about notes: the MIDI clock sink ignores `notes` entirely and
 * only cares which 24-PPQN boundaries fall inside `[fromTick, toTick)`.
 */
export interface ScheduleWindow {
  fromTick: Ticks
  toTick:   Ticks
  bpm:      number
  notes:    Note[]

  /** The engine's tick→time mapping, bound to its current anchors. */
  tickToCtxSec: (tick: Ticks) => number

  ctxNow: number
  clock:  ClockPair

  /** True when the transport wraps to the loop start at `toTick`. */
  wrapped: boolean
}

/**
 * A destination for scheduled playback. Sharing the engine's single lookahead
 * clock is the whole point — a parallel scheduler would have to re-derive loop
 * wrap, clip end and bpm re-anchoring, and would drift against the audio.
 */
export interface PlaybackSink {
  scheduleWindow (window: ScheduleWindow): void

  /** Transport stopped, seeked, or panicked: drop and flush everything pending. */
  stopAll (): void
}
