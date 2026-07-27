import { ticksPerBar, ticksPerBeat } from '@/domain/time'
import type { TimeSignature } from '@/domain/types'
import type { InternalSynthSink } from './InternalSynthSink'
import type { PlaybackSink, ScheduleWindow } from './sink'


const CLICK_SEC      = 0.03
const DOWNBEAT_PITCH = 96
const BEAT_PITCH     = 84

export interface MetronomeProviders {
  isEnabled:        () => boolean
  getTimeSignature: () => TimeSignature
}

/**
 * A click on every beat, accented on the downbeat. Rides the same schedule
 * window as the notes, so it stays locked to the transport, and exists mostly
 * so the count-in is audible — recording into silence is guesswork.
 */
export class MetronomeSink implements PlaybackSink {
  constructor (
    private synth: InternalSynthSink,
    private providers: MetronomeProviders,
  ) {}

  scheduleWindow (window: ScheduleWindow) {
    if (!this.providers.isEnabled())
      return

    const ts        = this.providers.getTimeSignature()
    const beat      = ticksPerBeat(ts)
    const bar       = ticksPerBar(ts)
    const firstBeat = Math.ceil(window.fromTick / beat) * beat

    for (let tick = firstBeat; tick < window.toTick; tick += beat) {
      const when  = Math.max(window.tickToCtxSec(tick), window.ctxNow)
      const pitch = tick % bar === 0 ? DOWNBEAT_PITCH : BEAT_PITCH
      this.synth.play(pitch, 70, when, CLICK_SEC)
    }
  }

  stopAll () {
    // Clicks are shorter than a scheduler pass; the synth sink's own stopAll
    // already kills anything still sounding.
  }
}
