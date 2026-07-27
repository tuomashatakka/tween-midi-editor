import { describe, expect, it } from 'vitest'
import { groupParsedNotesIntoTracks } from './trackMapping'
import type { ParsedNote, SmfImportResult } from './smfParse'


const note = (over: Partial<ParsedNote> = {}): ParsedNote => ({
  pitch:       60,
  start:       0,
  duration:    480,
  velocity:    100,
  sourceTrack: 0,
  channel:     0,
  ...over,
})

const result = (
  notes: ParsedNote[],
  tracks: SmfImportResult['tracks'] = [{ index: 0 }],
): SmfImportResult => ({ notes, tracks })

describe('groupParsedNotesIntoTracks', () => {
  it('imports a single-channel type 0 file as one track', () => {
    const seeds = groupParsedNotesIntoTracks(
      result([ note(), note({ pitch: 64, start: 480 }) ]),
    )
    expect(seeds).toHaveLength(1)
    expect(seeds[0].channel).toBe(0)
    expect(seeds[0].notes).toHaveLength(2)
  })

  it('takes the file track name when there is only one channel', () => {
    const seeds = groupParsedNotesIntoTracks(
      result([ note() ], [{ index: 0, name: 'Piano' }]),
    )
    expect(seeds[0].name).toBe('Piano')
  })

  it('splits a multi-channel type 0 file per channel', () => {
    const seeds = groupParsedNotesIntoTracks(
      result([ note({ channel: 2 }), note({ channel: 0 }), note({ channel: 2, pitch: 61 }) ]),
    )
    expect(seeds.map(s => s.channel)).toEqual([ 0, 2 ])
    expect(seeds.map(s => s.name)).toEqual([ 'Channel 1', 'Channel 3' ])
    expect(seeds.map(s => s.notes.length)).toEqual([ 1, 2 ])
  })

  it('groups a format 1 file by source track and skips the conductor', () => {
    const seeds = groupParsedNotesIntoTracks(result(
      [
        note({ sourceTrack: 1, channel: 0 }),
        note({ sourceTrack: 2, channel: 1, pitch: 64 }),
      ],
      [{ index: 0 }, { index: 1, name: 'Bass' }, { index: 2, name: 'Lead' }],
    ))
    expect(seeds.map(s => s.name)).toEqual([ 'Bass', 'Lead' ])
    expect(seeds.map(s => s.channel)).toEqual([ 0, 1 ])
  })

  it('keeps a named but silent track, using its declared channel', () => {
    const seeds = groupParsedNotesIntoTracks(result(
      [ note({ sourceTrack: 1, channel: 0 }) ],
      [{ index: 0 }, { index: 1, name: 'Bass' }, { index: 2, name: 'Empty', channel: 9 }],
    ))
    expect(seeds.map(s => s.name)).toEqual([ 'Bass', 'Empty' ])
    expect(seeds[1]).toEqual({ name: 'Empty', channel: 9, notes: []})
  })

  it('splits one MTrk carrying several channels and suffixes the name', () => {
    const seeds = groupParsedNotesIntoTracks(result(
      [
        note({ sourceTrack: 1, channel: 0 }),
        note({ sourceTrack: 1, channel: 5 }),
        note({ sourceTrack: 2, channel: 2 }),
      ],
      [{ index: 1, name: 'Split' }, { index: 2, name: 'Solo' }],
    ))
    expect(seeds.map(s => s.name)).toEqual([ 'Split ch1', 'Split ch6', 'Solo' ])
  })

  it('falls back to one empty track for a file with no notes', () => {
    const seeds = groupParsedNotesIntoTracks(result([], [{ index: 0 }]))
    expect(seeds).toEqual([{ name: 'Track 1', channel: 0, notes: []}])
  })
})
