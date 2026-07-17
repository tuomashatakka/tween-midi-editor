// Standard MIDI File (SMF) parser for format 0 and 1. Pure: bytes in, plain
// domain objects out (ticks already rescaled to the project PPQ). Handles
// running status, note-on velocity 0 as note-off, and skips unrecognized
// meta/sysex events by their declared lengths.

import type { Note, TimeSignature } from '@/domain/types'
import { readVarLen } from './vlq'


export interface SmfImportResult {
  notes:          Omit<Note, 'id'>[]
  bpm?:           number
  timeSignature?: TimeSignature
}

interface PendingNote {
  startTick: number
  velocity:  number
}

const readU16 = (b: Uint8Array, o: number): number => (b[o] << 8) + b[o + 1]
const readU32 = (b: Uint8Array, o: number): number =>
  b[o] * 0x1000000 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]

const asciiAt = (b: Uint8Array, o: number, len: number): string =>
  String.fromCharCode(...b.subarray(o, o + len))

export function parseSmf (bytes: Uint8Array, targetPpq: number): SmfImportResult {
  if (bytes.length < 14 || asciiAt(bytes, 0, 4) !== 'MThd')
    throw new Error('Not a Standard MIDI File (missing MThd header)')

  const headerLen = readU32(bytes, 4)
  const format    = readU16(bytes, 8)
  const ntrks     = readU16(bytes, 10)
  const division  = readU16(bytes, 12)

  if (format !== 0 && format !== 1)
    throw new Error(`Unsupported MIDI file format ${format}; only formats 0 and 1 are supported`)
  if ((division & 0x8000) !== 0)
    throw new Error('SMPTE time division is not supported; only PPQ-based files can be imported')
  if (division === 0)
    throw new Error('Invalid MIDI file: time division is zero')

  const scale = (t: number): number => Math.round(t * targetPpq / division)

  const result: SmfImportResult = { notes: []}
  let offset                    = 8 + headerLen

  for (let trackIndex = 0; trackIndex < ntrks && offset + 8 <= bytes.length; trackIndex++) {
    if (asciiAt(bytes, offset, 4) !== 'MTrk')
      throw new Error('Invalid MIDI file: expected MTrk chunk')

    const trackLen = readU32(bytes, offset + 4)
    const start    = offset + 8
    const end      = Math.min(start + trackLen, bytes.length)
    new TrackParser(bytes, start, end, scale, result).run()
    offset = start + trackLen
  }

  result.notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch)
  return result
}

/** Streams one MTrk chunk, accumulating notes and meta into the result. */
class TrackParser {
  // Note-ons awaiting their note-off, keyed by channel and pitch. A stack per
  // key tolerates overlapping identical notes (last-on, first-off pairing).
  private pending = new Map<number, PendingNote[]>()

  private offset: number
  private tick = 0
  private runningStatus = 0

  constructor (
    private bytes: Uint8Array,
    start: number,
    private end: number,
    private scale: (t: number) => number,
    private result: SmfImportResult,
  ) {
    this.offset = start
  }

  run () {
    while (this.offset < this.end) {
      const delta = readVarLen(this.bytes, this.offset)
      this.tick  += delta.value
      this.offset = delta.next

      const status = this.readStatus()
      if (status === 0xff) {
        if (this.handleMeta())
          break
      }
      else if (status === 0xf0 || status === 0xf7)
        this.skipSysex()
      else
        this.handleChannelEvent(status)
    }
    this.closeUnterminated()
  }

  private readStatus (): number {
    const byte = this.bytes[this.offset]
    if (byte >= 0x80) {
      this.offset += 1
      if (byte < 0xf0)
        this.runningStatus = byte
      return byte
    }
    // Running status: reuse the previous channel-voice status byte.
    if (this.runningStatus === 0)
      throw new Error('Invalid MIDI file: data byte without a preceding status byte')
    return this.runningStatus
  }

  /** Returns true on the end-of-track meta event. */
  private handleMeta (): boolean {
    const type = this.bytes[this.offset]
    const len  = readVarLen(this.bytes, this.offset + 1)

    if (type === 0x51 && len.value === 3)
      this.readTempo(len.next)
    if (type === 0x58 && len.value >= 2)
      this.readTimeSignature(len.next)

    this.offset = len.next + len.value
    return type === 0x2f
  }

  private readTempo (at: number) {
    if (this.result.bpm !== undefined)
      return

    const usPerQuarter = (this.bytes[at] << 16) + (this.bytes[at + 1] << 8) + this.bytes[at + 2]
    if (usPerQuarter > 0)
      this.result.bpm = Math.round(60_000_000 / usPerQuarter * 100) / 100
  }

  private readTimeSignature (at: number) {
    if (this.result.timeSignature !== undefined)
      return
    this.result.timeSignature = {
      numerator:   this.bytes[at],
      denominator: 2 ** this.bytes[at + 1],
    }
  }

  private skipSysex () {
    const len   = readVarLen(this.bytes, this.offset)
    this.offset = len.next + len.value
  }

  private handleChannelEvent (status: number) {
    const kind    = status & 0xf0
    const channel = status & 0x0f

    switch (kind) {
      case 0x90: {
        const pitch    = this.bytes[this.offset]
        const velocity = this.bytes[this.offset + 1]
        this.offset   += 2
        // Note-on with velocity 0 is a note-off by convention.
        if (velocity === 0)
          this.closeNote(channel << 8 | pitch, pitch, this.tick)
        else
          this.openNote(channel << 8 | pitch, velocity)
        break
      }
      case 0x80: {
        const pitch  = this.bytes[this.offset]
        this.offset += 2
        this.closeNote(channel << 8 | pitch, pitch, this.tick)
        break
      }
      case 0xa0: // polyphonic aftertouch
      case 0xb0: // control change
      case 0xe0: { // pitch bend
        this.offset += 2
        break
      }
      case 0xc0: // program change
      case 0xd0: { // channel aftertouch
        this.offset += 1
        break
      }
      default:
        throw new Error(`Invalid MIDI file: unexpected status byte 0x${status.toString(16)}`)
    }
  }

  private openNote (key: number, velocity: number) {
    const stack = this.pending.get(key) ?? []
    stack.push({ startTick: this.tick, velocity })
    this.pending.set(key, stack)
  }

  private closeNote (key: number, pitch: number, endTick: number) {
    const stack = this.pending.get(key)
    const open  = stack?.pop()
    if (!open)
      return
    this.result.notes.push({
      pitch,
      start:    this.scale(open.startTick),
      duration: Math.max(1, this.scale(endTick) - this.scale(open.startTick)),
      velocity: open.velocity,
    })
  }

  /** Close any unterminated note-ons at end of track. */
  private closeUnterminated () {
    for (const [ key, stack ] of this.pending)
      while (stack.length > 0)
        this.closeNote(key, key & 0xff, this.tick)
  }
}
