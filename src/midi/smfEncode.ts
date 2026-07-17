// Standard MIDI File (SMF) type 0 encoder. Pure: domain objects in, bytes out.
// Written with explicit status bytes (no running status) for maximal
// compatibility with simple readers.

import type { Note, TimeSignature } from '@/domain/types'
import { writeVarLen } from './vlq'


export interface SmfExportData {
  notes:         Note[]
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

const clamp7 = (n: number): number => Math.max(0, Math.min(127, Math.round(n)))

export function encodeSmf (data: SmfExportData): Uint8Array {
  const { notes, bpm, timeSignature, ppq } = data

  const events: TrackEvent[] = []

  // Tempo meta: microseconds per quarter note.
  const usPerQuarter = Math.round(60_000_000 / bpm)
  events.push({
    tick:  0,
    order: 1,
    bytes: [ 0xff, 0x51, 0x03, usPerQuarter >>> 16 & 0xff, usPerQuarter >>> 8 & 0xff, usPerQuarter & 0xff ],
  })

  // Time signature meta: denominator stored as a power of two.
  const denomPow = Math.max(0, Math.round(Math.log2(timeSignature.denominator)))
  events.push({
    tick:  0,
    order: 1,
    bytes: [ 0xff, 0x58, 0x04, timeSignature.numerator & 0xff, denomPow, 24, 8 ],
  })

  for (const note of notes) {
    const pitch    = clamp7(note.pitch)
    const velocity = Math.max(1, clamp7(note.velocity))
    const start    = Math.max(0, Math.round(note.start))
    const end      = start + Math.max(1, Math.round(note.duration))
    events.push({ tick: start, order: 2, bytes: [ 0x90, pitch, velocity ]})
    events.push({ tick: end, order: 0, bytes: [ 0x80, pitch, 0 ]})
  }

  events.sort((a, b) => a.tick - b.tick || a.order - b.order)

  const track: number[] = []
  let lastTick          = 0
  for (const ev of events) {
    track.push(...writeVarLen(ev.tick - lastTick), ...ev.bytes)
    lastTick = ev.tick
  }
  track.push(...writeVarLen(0), 0xff, 0x2f, 0x00) // end of track

  const bytes = [
    ...ascii('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(ppq),
    ...ascii('MTrk'), ...u32(track.length), ...track,
  ]
  return new Uint8Array(bytes)
}
