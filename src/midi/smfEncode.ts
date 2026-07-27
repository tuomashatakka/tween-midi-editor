// Standard MIDI File (SMF) type 1 encoder. Pure: domain objects in, bytes out.
// Written with explicit status bytes (no running status) for maximal
// compatibility with simple readers.
//
// Chunk 0 is the conductor track holding tempo and meter, as the format 1 spec
// requires; each editor track then becomes one MTrk with its name and channel.

import { MAX_TRACK_NAME_BYTES } from '@/domain/constants'
import type { MidiChannel, Note, TimeSignature } from '@/domain/types'
import { writeVarLen } from './vlq'


export interface SmfExportTrack {
  name:    string
  channel: MidiChannel
  notes:   Note[]
}

export interface SmfExportData {
  tracks:        SmfExportTrack[]
  bpm:           number
  timeSignature: TimeSignature
  ppq:           number
}

interface TrackEvent {
  tick:  number
  order: number // sort key at equal tick: offs (0) before meta (1) before ons (2)
  bytes: number[]
}

const ascii = (s: string): number[] => [ ...s ].map(c => c.charCodeAt(0))

const u16 = (n: number): number[] => [ n >>> 8 & 0xff, n & 0xff ]
const u32 = (n: number): number[] => [ n >>> 24 & 0xff, n >>> 16 & 0xff, n >>> 8 & 0xff, n & 0xff ]

const clamp7       = (n: number): number => Math.max(0, Math.min(127, Math.round(n)))
const clampChannel = (n: number): number => Math.max(0, Math.min(15, Math.round(n)))

/**
 * A text meta event. Text is clamped to Latin-1 and truncated so the length
 * stays a single-byte VLQ, which keeps the chunk readable by simple parsers.
 */
export const metaTextBytes = (type: number, text: string): number[] => {
  const chars = [ ...text ]
    .map(c => c.charCodeAt(0) & 0xff)
    .slice(0, MAX_TRACK_NAME_BYTES)
  return [ 0xff, type, ...writeVarLen(chars.length), ...chars ]
}

/** Sort events and emit an MTrk chunk body with delta times and end-of-track. */
const encodeTrackChunk = (events: TrackEvent[]): number[] => {
  const sorted = [ ...events ].sort((a, b) => a.tick - b.tick || a.order - b.order)

  const track: number[] = []
  let lastTick          = 0
  for (const ev of sorted) {
    track.push(...writeVarLen(ev.tick - lastTick), ...ev.bytes)
    lastTick = ev.tick
  }
  track.push(...writeVarLen(0), 0xff, 0x2f, 0x00) // end of track

  return [ ...ascii('MTrk'), ...u32(track.length), ...track ]
}

const conductorEvents = (bpm: number, timeSignature: TimeSignature): TrackEvent[] => {
  // Tempo meta: microseconds per quarter note.
  const usPerQuarter = Math.round(60_000_000 / bpm)
  // Time signature meta: denominator stored as a power of two.
  const denomPow     = Math.max(0, Math.round(Math.log2(timeSignature.denominator)))

  return [
    { tick: 0, order: 1, bytes: metaTextBytes(0x03, 'Conductor') },
    {
      tick:  0,
      order: 1,
      bytes: [ 0xff, 0x51, 0x03, usPerQuarter >>> 16 & 0xff, usPerQuarter >>> 8 & 0xff, usPerQuarter & 0xff ],
    },
    {
      tick:  0,
      order: 1,
      bytes: [ 0xff, 0x58, 0x04, timeSignature.numerator & 0xff, denomPow, 24, 8 ],
    },
  ]
}

const noteEvents = (track: SmfExportTrack): TrackEvent[] => {
  const channel              = clampChannel(track.channel)
  const events: TrackEvent[] = [
    { tick: 0, order: 1, bytes: metaTextBytes(0x03, track.name) },
    // MIDI Channel Prefix. A track with no notes has no channel-voice events to
    // infer a channel from, so declare it — otherwise an empty track loses its
    // channel on the round trip.
    { tick: 0, order: 1, bytes: [ 0xff, 0x20, 0x01, channel ]},
  ]

  for (const note of track.notes) {
    const pitch    = clamp7(note.pitch)
    const velocity = Math.max(1, clamp7(note.velocity))
    const start    = Math.max(0, Math.round(note.start))
    const end      = start + Math.max(1, Math.round(note.duration))
    events.push({ tick: start, order: 2, bytes: [ 0x90 | channel, pitch, velocity ]})
    events.push({ tick: end, order: 0, bytes: [ 0x80 | channel, pitch, 0 ]})
  }
  return events
}

export function encodeSmf (data: SmfExportData): Uint8Array {
  const { tracks, bpm, timeSignature, ppq } = data

  const chunks = [
    encodeTrackChunk(conductorEvents(bpm, timeSignature)),
    // Empty tracks are written too: the track list is document content now and
    // has to survive a round trip.
    ...tracks.map(track => encodeTrackChunk(noteEvents(track))),
  ]

  const bytes = [
    ...ascii('MThd'), ...u32(6), ...u16(1), ...u16(chunks.length), ...u16(ppq),
    ...chunks.flat(),
  ]
  return new Uint8Array(bytes)
}
