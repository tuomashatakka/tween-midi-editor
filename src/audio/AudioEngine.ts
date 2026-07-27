import { secondsToTicks, ticksToSeconds } from '@/domain/time'
import type { LoopRegion, Note, Ticks } from '@/domain/types'
import { SynthVoice } from './SynthVoice'
import { InternalSynthSink } from './InternalSynthSink'
import { MetronomeSink } from './MetronomeSink'
import type { MetronomeProviders } from './MetronomeSink'
import type { ClockPair } from './clockDomain'
import type { PlaybackSink, ScheduleWindow } from './sink'


const LOOKAHEAD_MS       = 25
const DEFAULT_AHEAD_SEC  = 0.1
const START_DELAY_SEC    = 0.06
const HELD_VOICE_MAX_SEC = 30

export interface EngineProviders {
  getNotes:   () => Note[]
  getBpm:     () => number
  getLoop:    () => LoopRegion
  getClipEnd: () => Ticks
  onPosition: (ticks: Ticks) => void
  onClipEnd:  () => void

  /** Should the internal synth play this note, or is it routed to hardware? */
  playsInternally?: (note: Note) => boolean

  /** Metronome click, used by the transport toggle and the record count-in. */
  metronome?: MetronomeProviders
}

/**
 * Web Audio playback engine driven by transport state. It owns the AudioContext
 * and a lookahead scheduler (the Chris Wilson pattern) and reads note data on
 * demand from the provided callbacks, so it never stores a copy of the notes.
 *
 * Each lookahead pass is published to every registered `PlaybackSink`, so
 * external MIDI output and the MIDI clock ride the same clock as the audio
 * instead of running their own drifting timers.
 */
export class AudioEngine {
  private ctx:    AudioContext | null = null
  private master: GainNode | null = null
  private timer:  ReturnType<typeof setInterval> | null = null

  private synth: InternalSynthSink | null = null
  private sinks = new Set<PlaybackSink>()

  /** Voices sustained by live MIDI input / held keys, keyed by pitch. */
  private held = new Map<number, SynthVoice>()

  private playing = false
  private playStartTick = 0 // musical anchor
  private audioStartTime = 0 // ctx time matching playStartTick
  private cursorTick = 0 // next tick to schedule from
  private lastReported = -1
  private scheduleAheadSec = DEFAULT_AHEAD_SEC

  constructor (private providers: EngineProviders) {}

  private ensureContext (): AudioContext {
    if (!this.ctx) {
      this.ctx               = new AudioContext()
      this.master            = this.ctx.createGain()
      this.master.gain.value = 0.8
      this.master.connect(this.ctx.destination)

      this.synth = new InternalSynthSink(
        this.ctx,
        this.master,
        note => this.providers.playsInternally?.(note) ?? true,
      )
      this.sinks.add(this.synth)

      if (this.providers.metronome)
        this.sinks.add(new MetronomeSink(this.synth, this.providers.metronome))
    }
    if (this.ctx.state === 'suspended')
      void this.ctx.resume()
    return this.ctx
  }

  /** Register an extra destination; returns a disposer. */
  addSink (sink: PlaybackSink): () => void {
    this.sinks.add(sink)
    return () => {
      sink.stopAll()
      this.sinks.delete(sink)
    }
  }

  /**
   * Widen the lookahead horizon. Used when sending MIDI clock, where a
   * background-throttled timer would otherwise starve the pulse train.
   */
  setScheduleAhead (seconds: number) {
    this.scheduleAheadSec = Math.max(DEFAULT_AHEAD_SEC, seconds)
  }

  /** A simultaneous reading of both clock domains, or null before audio starts. */
  clockPair (): ClockPair | null {
    if (!this.ctx)
      return null
    return { perfMs: performance.now(), ctxSec: this.ctx.currentTime }
  }

  /** Musical position at a given AudioContext time, using the current anchors. */
  tickAt (ctxSec: number): Ticks {
    const bpm = this.providers.getBpm()
    return this.playStartTick + secondsToTicks(ctxSec - this.audioStartTime, bpm)
  }

  /** The inverse: when the engine currently believes a position occurs. */
  ctxTimeAt (tick: Ticks): number {
    return this.tickToTime(tick, this.providers.getBpm())
  }

  start (fromTick: Ticks) {
    const ctx           = this.ensureContext()
    this.playing        = true
    this.playStartTick  = fromTick
    this.cursorTick     = fromTick
    this.audioStartTime = ctx.currentTime + START_DELAY_SEC
    if (this.timer === null)
      this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS)
  }

  stop () {
    this.playing = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.stopAllSinks()
  }

  seek (tick: Ticks) {
    if (this.playing)
      this.start(tick); else
      this.providers.onPosition(tick)
  }

  /**
   * Slave the playback clock to an externally authoritative (tick, time) pair —
   * the soft correction an external MIDI clock applies while following. Only
   * the anchor moves; the cursor never rewinds, or already-scheduled notes
   * would fire a second time.
   */
  resync (tick: Ticks, atCtxSec: number) {
    if (!this.playing)
      return
    this.playStartTick  = tick
    this.audioStartTime = atCtxSec
    this.cursorTick     = Math.max(this.cursorTick, tick)
  }

  /**
   * Audition a single note immediately, independent of the transport. Used for
   * click-to-preview on the piano roll and play-on-draw. Safe to call from a
   * pointer event, which satisfies the browser's AudioContext gesture gate.
   */
  previewNote (pitch: number, velocity = 100, durationSec = 0.35) {
    const ctx = this.ensureContext()
    this.synth?.play(pitch, velocity, ctx.currentTime, durationSec)
  }

  /** Begin a sustained note (live MIDI input or a held key). */
  noteOn (pitch: number, velocity = 100) {
    const ctx = this.ensureContext()
    this.held.get(pitch)?.kill(ctx)

    const voice = this.synth?.play(pitch, velocity, ctx.currentTime, HELD_VOICE_MAX_SEC)
    if (voice)
      this.held.set(pitch, voice)
  }

  /** Release a sustained note with the synth's musical release, not a hard kill. */
  noteOff (pitch: number) {
    if (!this.ctx)
      return
    this.held.get(pitch)?.release(this.ctx)
    this.held.delete(pitch)
  }

  /** Silence everything immediately — transport panic. */
  panic () {
    this.stopAllSinks()
  }

  /** Re-anchor timing when bpm changes mid-playback so the playhead is continuous. */
  reanchorForBpm () {
    if (!this.playing || !this.ctx)
      return

    const current       = this.currentTick()
    this.playStartTick  = current
    this.audioStartTime = this.ctx.currentTime
    // The cursor is normally ahead of `current` by up to the lookahead horizon.
    // Rewinding it here would re-schedule notes that are already queued, which
    // is audible as doubled voices — and continuous while following an external
    // clock, where the bpm estimate updates constantly.
    this.cursorTick = Math.max(this.cursorTick, current)
  }

  private stopAllSinks () {
    for (const sink of this.sinks)
      sink.stopAll()
    this.held.clear()
  }

  private tickToTime (t: Ticks, bpm: number): number {
    return this.audioStartTime + ticksToSeconds(t - this.playStartTick, bpm)
  }

  private currentTick (): Ticks {
    if (!this.ctx)
      return this.playStartTick

    const bpm     = this.providers.getBpm()
    const elapsed = this.ctx.currentTime - this.audioStartTime
    return this.playStartTick + secondsToTicks(Math.max(0, elapsed), bpm)
  }

  private tick () {
    if (!this.ctx || !this.master || !this.playing)
      return

    const bpm         = this.providers.getBpm()
    const loop        = this.providers.getLoop()
    const notes       = this.providers.getNotes()
    const now         = this.ctx.currentTime
    const clock       = { perfMs: performance.now(), ctxSec: now }
    const horizonTick =
      this.playStartTick +
      secondsToTicks(now + this.scheduleAheadSec - this.audioStartTime, bpm)

    // With looping off, playback ends at the clip end marker. Starting at or
    // past the marker plays freely instead of stopping instantly.
    const clipEnd    = this.providers.getClipEnd()
    const endsAtClip = !loop.enabled && this.playStartTick < clipEnd

    if (endsAtClip && this.currentTick() >= clipEnd) {
      this.providers.onClipEnd()
      return
    }

    let windowEnd = horizonTick
    let wrap      = false
    if (loop.enabled && horizonTick >= loop.endTicks) {
      windowEnd = loop.endTicks
      wrap = true
    }
    else if (endsAtClip)
      windowEnd = Math.min(horizonTick, clipEnd)

    this.publishWindow({
      fromTick:     this.cursorTick,
      toTick:       windowEnd,
      bpm,
      notes,
      tickToCtxSec: t => this.tickToTime(t, bpm),
      ctxNow:       now,
      clock,
      wrapped:      wrap,
    })

    if (wrap) {
      // Re-anchor to the loop start at the moment we reach loop end.
      this.audioStartTime = this.tickToTime(loop.endTicks, bpm)
      this.playStartTick  = loop.startTicks
      this.cursorTick     = loop.startTicks
    }
    else
      this.cursorTick = windowEnd

    // Report playhead position (deduplicated by integer tick).
    const pos = Math.round(this.currentTick())
    if (pos !== this.lastReported) {
      this.lastReported = pos
      this.providers.onPosition(pos)
    }
  }

  private publishWindow (window: ScheduleWindow) {
    if (window.toTick <= window.fromTick)
      return
    for (const sink of this.sinks)
      sink.scheduleWindow(window)
  }

  dispose () {
    this.stop()
    this.sinks.clear()
    this.synth = null
    if (this.ctx)
      void this.ctx.close()
    this.ctx = null
  }
}
