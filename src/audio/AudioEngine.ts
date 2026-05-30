import { secondsToTicks, ticksToSeconds, noteEnd } from '@/domain/time'
import type { LoopRegion, Note, Ticks } from '@/domain/types'
import { SynthVoice } from './SynthVoice'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SEC = 0.1
const START_DELAY_SEC = 0.06

export interface EngineProviders {
  getNotes: () => Note[]
  getBpm: () => number
  getLoop: () => LoopRegion
  onPosition: (ticks: Ticks) => void
}

/**
 * Web Audio playback engine driven by transport state. It owns the AudioContext
 * and a lookahead scheduler (the Chris Wilson pattern) and reads note data on
 * demand from the provided callbacks, so it never stores a copy of the notes.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private voices = new Set<SynthVoice>()

  private playing = false
  private playStartTick = 0 // musical anchor
  private audioStartTime = 0 // ctx time matching playStartTick
  private cursorTick = 0 // next tick to schedule from
  private lastReported = -1

  constructor(private providers: EngineProviders) {}

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.8
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  start(fromTick: Ticks) {
    const ctx = this.ensureContext()
    this.playing = true
    this.playStartTick = fromTick
    this.cursorTick = fromTick
    this.audioStartTime = ctx.currentTime + START_DELAY_SEC
    if (this.timer === null) {
      this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS)
    }
  }

  stop() {
    this.playing = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.ctx) {
      for (const v of this.voices) v.kill(this.ctx)
    }
    this.voices.clear()
  }

  seek(tick: Ticks) {
    if (this.playing) {
      this.start(tick)
    } else {
      this.providers.onPosition(tick)
    }
  }

  /** Re-anchor timing when bpm changes mid-playback so the playhead is continuous. */
  reanchorForBpm() {
    if (!this.playing || !this.ctx) return
    const current = this.currentTick()
    this.playStartTick = current
    this.cursorTick = current
    this.audioStartTime = this.ctx.currentTime
  }

  private tickToTime(t: Ticks, bpm: number): number {
    return this.audioStartTime + ticksToSeconds(t - this.playStartTick, bpm)
  }

  private currentTick(): Ticks {
    if (!this.ctx) return this.playStartTick
    const bpm = this.providers.getBpm()
    const elapsed = this.ctx.currentTime - this.audioStartTime
    return this.playStartTick + secondsToTicks(Math.max(0, elapsed), bpm)
  }

  private tick() {
    if (!this.ctx || !this.master || !this.playing) return
    const bpm = this.providers.getBpm()
    const loop = this.providers.getLoop()
    const notes = this.providers.getNotes()
    const now = this.ctx.currentTime
    const horizonTick =
      this.playStartTick +
      secondsToTicks(now + SCHEDULE_AHEAD_SEC - this.audioStartTime, bpm)

    let windowEnd = horizonTick
    let wrap = false
    if (loop.enabled && horizonTick >= loop.endTicks) {
      windowEnd = loop.endTicks
      wrap = true
    }

    this.scheduleRange(notes, this.cursorTick, windowEnd, bpm)

    if (wrap) {
      // Re-anchor to the loop start at the moment we reach loop end.
      this.audioStartTime = this.tickToTime(loop.endTicks, bpm)
      this.playStartTick = loop.startTicks
      this.cursorTick = loop.startTicks
    } else {
      this.cursorTick = windowEnd
    }

    // Report playhead position (deduplicated by integer tick).
    const pos = Math.round(this.currentTick())
    if (pos !== this.lastReported) {
      this.lastReported = pos
      this.providers.onPosition(pos)
    }
  }

  private scheduleRange(notes: Note[], from: Ticks, to: Ticks, bpm: number) {
    if (!this.ctx || !this.master || to <= from) return
    for (const note of notes) {
      if (note.start >= from && note.start < to) {
        const when = this.tickToTime(note.start, bpm)
        const durSec = ticksToSeconds(noteEnd(note) - note.start, bpm)
        const voice = new SynthVoice(
          this.ctx,
          this.master,
          note.pitch,
          note.velocity,
          Math.max(when, this.ctx.currentTime),
          durSec,
          () => this.voices.delete(voice),
        )
        this.voices.add(voice)
      }
    }
  }

  dispose() {
    this.stop()
    if (this.ctx) void this.ctx.close()
    this.ctx = null
  }
}
