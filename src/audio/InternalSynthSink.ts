import { noteEnd, ticksToSeconds } from '@/domain/time'
import type { Note } from '@/domain/types'
import { SynthVoice } from './SynthVoice'
import type { PlaybackSink, ScheduleWindow } from './sink'


/**
 * The built-in oscillator synth as a playback sink — the behaviour that used to
 * live inline in `AudioEngine.scheduleRange`.
 */
export class InternalSynthSink implements PlaybackSink {
  private voices = new Set<SynthVoice>()

  constructor (
    private ctx: AudioContext,
    private destination: AudioNode,

    /** Lets routed-to-hardware tracks opt out, so they never sound twice. */
    private accepts: (note: Note) => boolean = () => true,
  ) {}

  scheduleWindow (window: ScheduleWindow) {
    const { fromTick, toTick, bpm, notes } = window
    if (toTick <= fromTick)
      return

    for (const note of notes) {
      if (note.start < fromTick || note.start >= toTick || !this.accepts(note))
        continue

      const when   = window.tickToCtxSec(note.start)
      const durSec = ticksToSeconds(noteEnd(note) - note.start, bpm)
      this.play(note.pitch, note.velocity, Math.max(when, window.ctxNow), durSec)
    }
  }

  /** Fire a voice immediately or at a scheduled time. */
  play (pitch: number, velocity: number, when: number, durationSec: number): SynthVoice {
    const voice = new SynthVoice(
      this.ctx,
      this.destination,
      pitch,
      velocity,
      when,
      durationSec,
      () => this.voices.delete(voice),
    )
    this.voices.add(voice)
    return voice
  }

  stopAll () {
    for (const voice of this.voices)
      voice.kill(this.ctx)
    this.voices.clear()
  }
}
