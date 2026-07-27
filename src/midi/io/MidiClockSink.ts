import { ctxToPerf } from '@/audio/clockDomain'
import type { PlaybackSink, ScheduleWindow } from '@/audio/sink'
import { TICKS_PER_PULSE } from './clockFollower'
import { CLOCK_BYTE } from './messages'
import type { MidiOutputManager } from './MidiOutputManager'


export interface MidiClockSinkProviders {
  getPortId:   () => string | null
  getOffsetMs: () => number
}

/**
 * Emits 24-PPQN MIDI clock so Ableton Live can follow Tween.
 *
 * This is why sinks receive a window rather than notes: the clock ignores the
 * note list entirely and only cares which pulse boundaries fall inside it. Each
 * pulse carries an absolute future timestamp, so the driver does the timing and
 * the 25ms scheduler interval contributes no jitter at all — strictly better
 * than any setInterval-based ticker.
 */
export class MidiClockSink implements PlaybackSink {
  constructor (
    private output: MidiOutputManager,
    private providers: MidiClockSinkProviders,
  ) {}

  scheduleWindow (window: ScheduleWindow) {
    const portId = this.providers.getPortId()
    if (!portId)
      return

    const offset = this.providers.getOffsetMs()
    const first  = Math.ceil(window.fromTick / TICKS_PER_PULSE) * TICKS_PER_PULSE

    for (let tick = first; tick < window.toTick; tick += TICKS_PER_PULSE) {
      const when = Math.max(window.tickToCtxSec(tick), window.ctxNow)
      this.output.send(portId, [ CLOCK_BYTE ], ctxToPerf(when, window.clock) + offset)
    }
  }

  stopAll () {
    // Transport edges (start/continue/stop) are sent by MidiClockBridge, which
    // sees the state transitions; there is nothing queued to unwind here.
  }
}
