// Everything difficult about recording lives here, and none of it touches a
// clock, the DOM or the store: the caller supplies already-resolved ticks, so
// every edge case is reproducible in a unit test.

import { PPQ } from '@/domain/constants'
import type { MidiChannel, MidiNote, Note, Ticks, TrackId, Velocity } from '@/domain/types'


export interface RecorderEvent {
  trackId:  TrackId
  channel:  MidiChannel
  pitch:    MidiNote
  velocity: Velocity

  /** Already latency-compensated and mapped to the transport timeline. */
  tick: Ticks
}

export type RecordedNote = Omit<Note, 'id'>

export interface RecorderOptions {
  minDurationTicks: Ticks
}

const DEFAULTS: RecorderOptions = { minDurationTicks: PPQ / 16 }

interface HeldNote {
  startTick: Ticks
  velocity:  Velocity
}

const keyOf = (e: Pick<RecorderEvent, 'trackId' | 'channel' | 'pitch'>): string =>
  `${e.trackId}:${e.channel}:${e.pitch}`

export class NoteRecorder {
  private held = new Map<string, HeldNote>()
  private captured: RecordedNote[] = []
  private options:  RecorderOptions

  constructor (options: Partial<RecorderOptions> = {}) {
    this.options = { ...DEFAULTS, ...options }
  }

  get heldCount (): number {
    return this.held.size
  }

  noteOn (event: RecorderEvent) {
    const key  = keyOf(event)
    const open = this.held.get(key)
    // A retrigger without an intervening note-off (a fast repeat, or a lost
    // off) closes the previous note rather than dropping it.
    if (open)
      this.close(key, event.trackId, event.pitch, open, event.tick)

    this.held.set(key, { startTick: Math.max(0, event.tick), velocity: event.velocity })
  }

  noteOff (event: Omit<RecorderEvent, 'velocity'>): RecordedNote | null {
    const key  = keyOf(event)
    const open = this.held.get(key)
    // An off with no matching on happens whenever recording is armed mid-phrase.
    if (!open)
      return null

    return this.close(key, event.trackId, event.pitch, open, event.tick)
  }

  /**
   * Close everything at the loop end and reopen it at the loop start, so a note
   * held across a loop boundary records as two notes — what Ableton does.
   */
  wrapAtLoop (endTick: Ticks, startTick: Ticks) {
    for (const [ key, open ] of [ ...this.held ]) {
      const [ trackId, , pitch ] = splitKey(key)
      this.close(key, trackId, pitch, open, endTick)
      this.held.set(key, { startTick, velocity: open.velocity })
    }
  }

  /** Hand over everything captured so far, keeping held notes open. */
  drain (): RecordedNote[] {
    const notes   = this.captured
    this.captured = []
    return notes
  }

  /** Close still-held notes at `tick` and hand over the whole take. */
  finish (tick: Ticks): RecordedNote[] {
    for (const [ key, open ] of [ ...this.held ]) {
      const [ trackId, , pitch ] = splitKey(key)
      this.close(key, trackId, pitch, open, tick)
    }
    return this.drain()
  }

  reset () {
    this.held.clear()
    this.captured = []
  }

  private close (
    key: string,
    trackId: TrackId,
    pitch: MidiNote,
    open: HeldNote,
    endTick: Ticks,
  ): RecordedNote {
    this.held.delete(key)

    const note: RecordedNote = {
      trackId,
      pitch,
      start:    open.startTick,
      duration: Math.max(this.options.minDurationTicks, Math.round(endTick - open.startTick)),
      velocity: open.velocity,
    }
    this.captured.push(note)
    return note
  }
}

/** Track ids may contain ':' — the channel and pitch are the last two fields. */
const splitKey = (key: string): [ TrackId, MidiChannel, MidiNote ] => {
  const parts   = key.split(':')
  const pitch   = Number(parts.pop())
  const channel = Number(parts.pop())
  return [ parts.join(':'), channel, pitch ]
}
