import type { AppStore } from '@/store/store'
import { play, seek, setBpm, stop } from '@/store/slices/transportSlice'
import { setExternalBpm, setSyncStatus } from '@/store/slices/syncSlice'
import { getActiveEngine } from '@/audio/engine'
import { perfToCtx } from '@/audio/clockDomain'
import { PPQ } from '@/domain/constants'

import type { Ticks } from '@/domain/types'
import {
  createFollower,
  followerTick,
  isLocked,
  onClockPulse,
  resetFollower,
} from './clockFollower'
import type { FollowerState } from './clockFollower'
import { DEFAULT_CORRECTION, nextAnchor } from './phaseCorrection'
import {
  CLOCK_PPQN,
  CONTINUE_BYTE,
  songPositionBytes,
  START_BYTE,
  STOP_BYTE,
} from './messages'
import type { MidiRealtimeMessage } from './messages'
import type { MidiOutputManager } from './MidiOutputManager'


/** How often phase is corrected: once per quarter note of incoming clock. */
const CORRECT_EVERY_PULSES = CLOCK_PPQN

/** Throttles for the tempo we push into the store while following. */
const BPM_DISPATCH_MS = 500
const BPM_EPSILON     = 0.1

/** SPP counts MIDI beats, which are sixteenth notes. */
const TICKS_PER_SIXTEENTH = PPQ / 4

/**
 * Two-way MIDI clock sync with Ableton Live.
 *
 * **Send** is handled by `MidiClockSink` (pulses) plus the transport edges
 * below. **Follow** runs a small software PLL: the external clock owns tempo
 * and phase, while `AudioEngine` stays the sample-accurate scheduler and is
 * slaved to it. Feeding the engine raw per-pulse positions would wreck note
 * scheduling, because its lookahead needs a smooth, monotone tick↔time map.
 */
export class MidiClockBridge {
  private follower:          FollowerState = createFollower(0)
  private lastBpmDispatch = 0
  private lastDispatchedBpm: number | null = null

  constructor (
    private store: AppStore,
    private output: MidiOutputManager,
  ) {}

  // --- Send mode ---------------------------------------------------------

  private sendPort (): string | null {
    const { mode, clockOutputId } = this.store.getState().sync
    return mode === 'send' ? clockOutputId : null
  }

  private spp (tick: Ticks): number[] {
    return songPositionBytes(Math.round(tick / TICKS_PER_SIXTEENTH))
  }

  /** Transport started: from the top it is a start, otherwise locate and continue. */
  onTransportStart (positionTicks: Ticks) {
    const portId = this.sendPort()
    if (!portId)
      return

    if (positionTicks <= 0) {
      this.output.send(portId, [ START_BYTE ])
      return
    }
    this.output.send(portId, this.spp(positionTicks))
    this.output.send(portId, [ CONTINUE_BYTE ])
  }

  onTransportStop () {
    const portId = this.sendPort()
    if (portId)
      this.output.send(portId, [ STOP_BYTE ])
  }

  /**
   * A locate while stopped. Song Position Pointer is specified to be sent from
   * a stopped transport, and the next start edge follows it with a Continue —
   * which is also what resyncs Live after a seek made during playback.
   */
  onTransportLocate (positionTicks: Ticks) {
    const portId = this.sendPort()
    if (portId)
      this.output.send(portId, this.spp(positionTicks))
  }

  // --- Follow mode -------------------------------------------------------

  handleRealtime (message: MidiRealtimeMessage, perfMs: number) {
    const state = this.store.getState()
    if (state.sync.mode !== 'follow')
      return

    switch (message.kind) {
      case 'start': {
        this.follower = resetFollower(this.follower, 0, perfMs)
        this.store.dispatch(seek(0))
        this.store.dispatch(play())
        this.store.dispatch(setSyncStatus('waiting'))
        break
      }
      case 'continue': {
        this.follower = resetFollower(this.follower, state.transport.positionTicks, perfMs)
        this.store.dispatch(play())
        this.store.dispatch(setSyncStatus('waiting'))
        break
      }
      case 'stop': {
        // Live holds position on stop rather than rewinding, so we do too.
        this.store.dispatch(stop())
        this.store.dispatch(setSyncStatus('idle'))
        break
      }
      case 'songPosition': {
        const tick    = message.sixteenths * TICKS_PER_SIXTEENTH
        this.follower = resetFollower(this.follower, tick, perfMs)
        // While playing this routes through transportBridge's "position the
        // engine did not author" branch, which is exactly the hard locate we want.
        this.store.dispatch(seek(tick))
        break
      }
      case 'clock': {
        this.handlePulse(perfMs)
        break
      }
      default:
        break
    }
  }

  private handlePulse (perfMs: number) {
    // Live emits clock while stopped, so the estimator always runs; only the
    // position correction is gated on actually playing.
    this.follower = onClockPulse(this.follower, perfMs)
    this.publishTempo()

    if (!this.store.getState().transport.isPlaying)
      return
    if (this.follower.pulses % CORRECT_EVERY_PULSES !== 0)
      return

    this.correctPhase(perfMs)
  }

  private publishTempo () {
    const { bpm, intervals } = this.follower
    if (bpm === null)
      return

    const locked = isLocked(intervals)
    const state  = this.store.getState()
    if (locked && state.sync.status !== 'locked')
      this.store.dispatch(setSyncStatus('locked'))

    const now = performance.now()
    if (now - this.lastBpmDispatch < BPM_DISPATCH_MS)
      return
    if (this.lastDispatchedBpm !== null && Math.abs(bpm - this.lastDispatchedBpm) < BPM_EPSILON)
      return

    this.lastBpmDispatch   = now
    this.lastDispatchedBpm = bpm

    const rounded          = Math.round(bpm * 10) / 10
    this.store.dispatch(setExternalBpm(rounded))
    // transportBridge already reacts to a bpm change with reanchorForBpm(), so
    // no extra coupling is needed here.
    this.store.dispatch(setBpm(rounded))
  }

  private correctPhase (perfMs: number) {
    const engine = getActiveEngine()
    const clock  = engine?.clockPair()
    if (!engine || !clock)
      return

    const externalTick = followerTick(this.follower)
    // When the external clock says this position happens, against when the
    // engine currently believes it does. Both are AudioContext seconds, so the
    // error is directly the anchor adjustment the engine needs.
    const externalSec  = perfToCtx(perfMs, clock)
    const engineSec    = engine.ctxTimeAt(externalTick)
    const result       = nextAnchor(engineSec, externalSec - engineSec, DEFAULT_CORRECTION)

    if (result.hard)
      // Too far out to nudge: relocate, which also resets the schedule cursor.
      engine.start(externalTick); else
      engine.resync(externalTick, result.anchorSec)
  }

  reset () {
    this.follower          = createFollower(0)
    this.lastDispatchedBpm = null
  }
}
