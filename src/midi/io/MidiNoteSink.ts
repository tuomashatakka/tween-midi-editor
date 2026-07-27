import { noteEnd } from '@/domain/time'
import { ctxToPerf } from '@/audio/clockDomain'
import type { PlaybackSink, ScheduleWindow } from '@/audio/sink'
import type { MidiOutputManager } from './MidiOutputManager'
import type { RoutingProvider } from './routing'


export interface MidiNoteSinkProviders {
  routing: RoutingProvider

  /** sync.offsetMs plus the AudioContext's output latency, in milliseconds. */
  getOffsetMs: () => number
}

/**
 * Plays externally-routed tracks through Web MIDI, riding the audio engine's
 * lookahead window. Both note-on and note-off are queued with absolute future
 * timestamps, so the driver — not JavaScript — does the timing, and a loop wrap
 * mid-note needs no special handling because the off was queued with the on.
 */
export class MidiNoteSink implements PlaybackSink {
  constructor (
    private output: MidiOutputManager,
    private providers: MidiNoteSinkProviders,
  ) {}

  scheduleWindow (window: ScheduleWindow) {
    const offset = this.providers.getOffsetMs()

    for (const note of window.notes) {
      if (note.start < window.fromTick || note.start >= window.toTick)
        continue

      const routing = this.providers.routing.getRouting(note.trackId)
      if (!routing.outputId)
        continue

      const channel = this.providers.routing.getChannel(note.trackId)
      const onSec   = Math.max(window.tickToCtxSec(note.start), window.ctxNow)
      const offSec  = Math.max(window.tickToCtxSec(noteEnd(note)), onSec)

      this.output.noteOn(
        routing.outputId,
        channel,
        note.pitch,
        note.velocity,
        ctxToPerf(onSec, window.clock) + offset,
      )
      this.output.noteOff(
        routing.outputId,
        channel,
        note.pitch,
        ctxToPerf(offSec, window.clock) + offset,
      )
    }
  }

  stopAll () {
    this.output.panic()
  }
}
