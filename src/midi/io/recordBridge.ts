import type { AppStore } from '@/store/store'
import { endCountIn } from '@/store/slices/recordingSlice'
import { getActiveEngine } from '@/audio/engine'
import { perfToCtx } from '@/audio/clockDomain'
import { secondsToTicks } from '@/domain/time'
import type { Ticks } from '@/domain/types'
import { NoteRecorder } from './NoteRecorder'
import type { MidiChannelMessage } from './messages'
import type { MidiInputEvent } from './MidiInputManager'
import type { RoutingProvider } from './routing'
import { commitRecordedNotes, finishRecording } from '@/thunks/recordingThunks'


/**
 * Turns live note messages into recorded notes against the transport.
 *
 * Positions come from the audio engine's anchors rather than
 * `transport.positionTicks`, which is only refreshed once per lookahead pass
 * and would quantize every take to ±25ms.
 */
export class RecordBridge {
  private recorder = new NoteRecorder()
  private lastPosition = 0

  constructor (
    private store: AppStore,
    private routing: RoutingProvider,
  ) {}

  /** Musical position of an input event, latency-compensated. */
  private tickFor (perfMs: number): Ticks {
    const state    = this.store.getState()
    const adjusted = perfMs - state.midi.recordLatencyMs

    const engine = getActiveEngine()
    const clock  = engine?.clockPair()
    if (engine && clock)
      return Math.max(0, Math.round(engine.tickAt(perfToCtx(adjusted, clock))))

    // No audio context yet: fall back to the reported playhead, corrected by
    // the latency offset alone.
    const bpm = state.transport.bpm
    return Math.max(0, Math.round(
      state.transport.positionTicks - secondsToTicks(state.midi.recordLatencyMs / 1000, bpm),
    ))
  }

  handleChannelMessage (message: MidiChannelMessage, event: MidiInputEvent) {
    if (message.kind !== 'noteOn' && message.kind !== 'noteOff')
      return

    const state = this.store.getState()
    if (!state.recording.isRecording)
      return

    const tick = this.tickFor(event.perfMs)
    // Count-in region: heard, but not recorded.
    if (state.recording.punchInTicks !== null && tick < state.recording.punchInTicks)
      return

    for (const target of this.routing.getRecordTargets()) {
      const common = { trackId: target.id, channel: target.channel, pitch: message.pitch, tick }
      if (message.kind === 'noteOn')
        this.recorder.noteOn({ ...common, velocity: message.velocity }); else
        this.recorder.noteOff(common)
    }
  }

  /**
   * Watch the playhead for the count-in punch and for loop wraps. A backwards
   * jump while recording in a loop means a new lap: split any held notes and
   * commit the lap immediately, so each pass appears as it is played and is its
   * own undo step.
   */
  handlePosition (position: Ticks) {
    const state       = this.store.getState()
    const previous    = this.lastPosition
    this.lastPosition = position

    if (!state.recording.isRecording)
      return

    if (state.recording.countingIn &&
      state.recording.punchInTicks !== null &&
      position >= state.recording.punchInTicks)
      this.store.dispatch(endCountIn())

    const { loop } = state.transport
    if (loop.enabled && position < previous) {
      this.recorder.wrapAtLoop(loop.endTicks, loop.startTicks)
      // Commit the lap without ending the take, so each pass appears in the
      // roll as it is played and lands as its own undo step.
      this.store.dispatch(commitRecordedNotes(this.recorder.drain()))
    }
  }

  /** Close the take and commit whatever was captured. */
  finish () {
    const state = this.store.getState()
    const notes = this.recorder.finish(state.transport.positionTicks)
    this.store.dispatch(finishRecording(notes))
  }

  reset () {
    this.recorder.reset()
  }
}

// A module handle to the live bridge, so the transport button and the keymap can
// end a take without threading the bridge through React — the same arrangement
// `src/audio/engine.ts` uses for the AudioEngine.
let active: RecordBridge | null = null

export const setActiveRecordBridge = (bridge: RecordBridge | null): void => {
  active = bridge
}

/** Close the current take and commit it. No-op when nothing is recording. */
export const finishActiveRecording = (): void => {
  active?.finish()
}
