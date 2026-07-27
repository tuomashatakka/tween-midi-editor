// Policy for turning a parsed MIDI file into editor tracks. Kept out of
// `smfParse.ts` so the parser stays a pure reporter and this — the part with
// judgement calls in it — is trivially unit-testable.

import type { MidiChannel, Note } from '@/domain/types'
import type { ParsedNote, SmfImportResult } from './smfParse'


export interface TrackSeed {
  name:    string
  channel: MidiChannel
  notes:   Omit<Note, 'id' | 'trackId'>[]
}

const stripMeta = (n: ParsedNote): Omit<Note, 'id' | 'trackId'> => ({
  pitch:    n.pitch,
  start:    n.start,
  duration: n.duration,
  velocity: n.velocity,
})

/**
 * Group parsed notes into tracks.
 *
 * When every note came from a single MTrk — a format 0 file, or a format 1 file
 * with one note track — the grouping key is the **channel**, so a single-channel
 * file imports as exactly one track and a multi-channel one splits per channel.
 * Otherwise the file already expresses its own track structure, so group by
 * source MTrk and only split further when one chunk carries several channels.
 */
export function groupParsedNotesIntoTracks (result: SmfImportResult): TrackSeed[] {
  // Branch on the file's own structure rather than on where the notes happen to
  // be: a format 1 file with one note chunk still has a track list to preserve,
  // including chunks that are named but empty.
  const seeds = result.tracks.length <= 1
    ? groupByChannel(result)
    : groupBySourceTrack(result)

  // An empty or note-less file still opens as a usable one-track document.
  if (seeds.length === 0)
    return [{ name: 'Track 1', channel: 0, notes: []}]
  return seeds
}

const groupByChannel = (result: SmfImportResult): TrackSeed[] => {
  const byChannel = new Map<MidiChannel, ParsedNote[]>()
  for (const note of result.notes) {
    const bucket = byChannel.get(note.channel) ?? []
    bucket.push(note)
    byChannel.set(note.channel, bucket)
  }

  const named    = result.tracks.find(t => t.name !== undefined)?.name
  const channels = [ ...byChannel.keys() ].sort((a, b) => a - b)

  // A single-channel file can take the file's own track name; once it splits,
  // per-channel names say more than the same name repeated N times.
  const nameFor = (channel: MidiChannel): string => {
    if (channels.length > 1)
      return `Channel ${channel + 1}`
    return named ?? 'Track 1'
  }

  return channels.map(channel => ({
    name:  nameFor(channel),
    channel,
    notes: (byChannel.get(channel) ?? []).map(stripMeta),
  }))
}

const groupBySourceTrack = (result: SmfImportResult): TrackSeed[] => {
  const seeds: TrackSeed[] = []

  for (const info of result.tracks) {
    const notes = result.notes.filter(n => n.sourceTrack === info.index)

    // The first chunk of a format 1 file is the tempo map by definition, so an
    // empty one is the conductor rather than a track. Any *other* empty chunk is
    // a real, currently-silent track and has to survive the round trip.
    if (notes.length === 0 && info.index === 0)
      continue

    const channels = notes.length === 0
      ? [ info.channel ?? 0 ]
      : [ ...new Set(notes.map(n => n.channel)) ].sort((a, b) => a - b)
    const baseName = info.name ?? `Track ${seeds.length + 1}`

    for (const channel of channels)
      seeds.push({
        name:  channels.length === 1 ? baseName : `${baseName} ch${channel + 1}`,
        channel,
        notes: notes.filter(n => n.channel === channel).map(stripMeta),
      })
  }

  return seeds
}
