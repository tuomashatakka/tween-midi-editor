import { describe, expect, it } from 'vitest'
import type { Note } from '@/domain/types'
import { encodeSmf } from './smfEncode'
import { parseSmf } from './smfParse'
import { groupParsedNotesIntoTracks } from './trackMapping'
import { readVarLen, writeVarLen } from './vlq'


describe('variable-length quantities', () => {
  it.each([
    [ 0, [ 0x00 ]],
    [ 127, [ 0x7f ]],
    [ 128, [ 0x81, 0x00 ]],
    [ 0x3fff, [ 0xff, 0x7f ]],
    [ 0x1fffff, [ 0xff, 0xff, 0x7f ]],
    [ 0x0fffffff, [ 0xff, 0xff, 0xff, 0x7f ]],
  ])('encodes %i to the canonical byte sequence', (value, bytes) => {
    expect(writeVarLen(value)).toEqual(bytes)
  })

  it.each([ 0, 1, 127, 128, 200, 0x3fff, 0x4000, 0x1fffff, 0x0fffffff ])(
    'roundtrips %i',
    value => {
      const bytes                   = new Uint8Array(writeVarLen(value))
      const { value: parsed, next } = readVarLen(bytes, 0)
      expect(parsed).toBe(value)
      expect(next).toBe(bytes.length)
    },
  )

  it('throws on truncated input', () => {
    expect(() => readVarLen(new Uint8Array([ 0x81 ]), 0)).toThrow()
  })
})

const notes: Note[] = [
  { id: 'a', trackId: 't1', pitch: 60, start: 0, duration: 480, velocity: 100 },
  { id: 'b', trackId: 't1', pitch: 64, start: 480, duration: 960, velocity: 90 },
  { id: 'c', trackId: 't1', pitch: 67, start: 480, duration: 240, velocity: 127 },
]

const oneTrack = (trackNotes: Note[], name = 'Lead', channel = 0) =>
  [{ name, channel, notes: trackNotes }]

describe('SMF encode/parse roundtrip', () => {
  it('preserves notes, bpm and time signature at PPQ 960', () => {
    const bytes  = encodeSmf({
      tracks:        oneTrack(notes),
      bpm:           132,
      timeSignature: { numerator: 3, denominator: 4 },
      ppq:           960,
    })
    const parsed = parseSmf(bytes, 960)

    expect(parsed.bpm).toBeCloseTo(132, 1)
    expect(parsed.timeSignature).toEqual({ numerator: 3, denominator: 4 })
    expect(parsed.notes).toHaveLength(3)

    const sorted = [ ...notes ].sort((a, b) => a.start - b.start || a.pitch - b.pitch)
    parsed.notes.forEach((n, i) => {
      expect(n.pitch).toBe(sorted[i].pitch)
      expect(n.start).toBe(sorted[i].start)
      expect(n.duration).toBe(sorted[i].duration)
      expect(n.velocity).toBe(sorted[i].velocity)
    })
  })

  it('rescales ticks when the file PPQ differs from the target', () => {
    const bytes  = encodeSmf({
      tracks:        oneTrack(notes),
      bpm:           120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq:           480,
    })
    const parsed = parseSmf(bytes, 960)
    const first  = parsed.notes[0]
    expect(first.start).toBe(0)
    expect(first.duration).toBe(960) // 480 ticks at PPQ 480 = one quarter = 960 at PPQ 960
  })

  it('preserves track names, channels and notes across three tracks', () => {
    const exported = [
      { name: 'Bass', channel: 0, notes: [ notes[0] ]},
      { name: 'Keys', channel: 4, notes: [ notes[1] ]},
      { name: 'Empty', channel: 9, notes: []},
    ]
    const bytes  = encodeSmf({
      tracks:        exported,
      bpm:           120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq:           960,
    })
    const parsed = parseSmf(bytes, 960)
    const seeds  = groupParsedNotesIntoTracks(parsed)

    // Chunk 0 is the conductor track, which carries no notes and no seed. The
    // silent third track does survive — its channel comes from the channel
    // prefix meta, since it has no note events to infer one from.
    expect(parsed.tracks[0].name).toBe('Conductor')
    expect(seeds.map(s => s.name)).toEqual([ 'Bass', 'Keys', 'Empty' ])
    expect(seeds.map(s => s.channel)).toEqual([ 0, 4, 9 ])
    expect(seeds[2].notes).toEqual([])
    expect(seeds[0].notes[0]).toMatchObject({ pitch: 60, start: 0, duration: 480, velocity: 100 })
    expect(seeds[1].notes[0]).toMatchObject({ pitch: 64, start: 480, duration: 960, velocity: 90 })
  })

  it('writes a format 1 header with a conductor chunk', () => {
    const bytes = encodeSmf({
      tracks:        oneTrack(notes),
      bpm:           120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq:           960,
    })
    expect((bytes[8] << 8) + bytes[9]).toBe(1) // format
    expect((bytes[10] << 8) + bytes[11]).toBe(2) // conductor + one track
  })
})

/** Hand-build a track chunk from event byte arrays. */
function track (...events: number[][]): number[] {
  const body = events.flat()
  return [
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    body.length >>> 24 & 0xff, body.length >>> 16 & 0xff, body.length >>> 8 & 0xff, body.length & 0xff,
    ...body,
  ]
}

function smf (format: number, division: number, ...tracks: number[][]): Uint8Array {
  return new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, // MThd
    0, 0, 0, 6,
    0, format,
    tracks.length >>> 8 & 0xff, tracks.length & 0xff,
    division >>> 8 & 0xff, division & 0xff,
    ...tracks.flat(),
  ])
}

const END_OF_TRACK = [ 0x00, 0xff, 0x2f, 0x00 ]

describe('SMF parsing details', () => {
  it('reports the source track and channel of each note in a format 1 file', () => {
    const tempoTrack = track(
      [ 0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20 ], // 500000 us/quarter = 120 bpm
      END_OF_TRACK,
    )
    const noteTrack1 = track(
      [ 0x00, 0x90, 60, 100 ],
      [ 96, 0x80, 60, 0 ],
      END_OF_TRACK,
    )
    const noteTrack2 = track(
      [ 48, 0x91, 64, 80 ], // channel 1
      [ 48, 0x81, 64, 0 ],
      END_OF_TRACK,
    )

    const parsed = parseSmf(smf(1, 96, tempoTrack, noteTrack1, noteTrack2), 96)
    expect(parsed.bpm).toBe(120)
    expect(parsed.notes).toEqual([
      { pitch: 60, start: 0, duration: 96, velocity: 100, sourceTrack: 1, channel: 0 },
      { pitch: 64, start: 48, duration: 48, velocity: 80, sourceTrack: 2, channel: 1 },
    ])
    // The conductor chunk is still reported, it just carries no notes.
    expect(parsed.tracks).toHaveLength(3)
    expect(parsed.tracks.map(t => t.channel)).toEqual([ undefined, 0, 1 ])
  })

  it('handles running status', () => {
    const t = track(
      [ 0x00, 0x90, 60, 100 ],
      [ 0x00, 64, 100 ], // running status: another note-on
      [ 96, 60, 0 ], // running status note-on with velocity 0 = note-off
      [ 0x00, 64, 0 ],
      END_OF_TRACK,
    )
    const parsed = parseSmf(smf(0, 96, t), 96)
    expect(parsed.notes).toEqual([
      { pitch: 60, start: 0, duration: 96, velocity: 100, sourceTrack: 0, channel: 0 },
      { pitch: 64, start: 0, duration: 96, velocity: 100, sourceTrack: 0, channel: 0 },
    ])
  })

  it('closes unterminated note-ons at end of track', () => {
    const t = track(
      [ 0x00, 0x90, 60, 100 ],
      [ 96, 0xff, 0x2f, 0x00 ], // end of track 96 ticks later, no note-off
    )
    const parsed = parseSmf(smf(0, 96, t), 96)
    expect(parsed.notes).toEqual([
      { pitch: 60, start: 0, duration: 96, velocity: 100, sourceTrack: 0, channel: 0 },
    ])
  })

  it('skips unknown meta and sysex events', () => {
    const t = track(
      [ 0x00, 0xff, 0x03, 0x04, 0x54, 0x65, 0x73, 0x74 ], // track name "Test"
      [ 0x00, 0xf0, 0x03, 0x01, 0x02, 0xf7 ], // sysex
      [ 0x00, 0x90, 60, 100 ],
      [ 96, 0x80, 60, 0 ],
      END_OF_TRACK,
    )
    const parsed = parseSmf(smf(0, 96, t), 96)
    expect(parsed.notes).toHaveLength(1)
  })

  it('rejects format 2 files', () => {
    expect(() => parseSmf(smf(2, 96, track(END_OF_TRACK)), 960)).toThrow(/format 2/)
  })

  it('rejects SMPTE time division', () => {
    expect(() => parseSmf(smf(0, 0xe250, track(END_OF_TRACK)), 960)).toThrow(/SMPTE/)
  })

  it('rejects non-MIDI data', () => {
    expect(() => parseSmf(new Uint8Array([ 1, 2, 3 ]), 960)).toThrow(/MThd/)
  })
})
