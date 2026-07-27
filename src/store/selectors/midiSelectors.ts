import { createSelector } from '@reduxjs/toolkit'
import { DEFAULT_ROUTING } from '../slices/midiSlice'
import type { TrackRouting } from '../slices/midiSlice'
import type { RootState } from '../store'
import { selectAllNotes } from './noteSelectors'
import { selectAllTracks, selectAudibleTrackIds } from './trackSelectors'
import type { MidiChannel, Note, Track, TrackId } from '@/domain/types'


// Ports are read through ordinary selectors rather than a dedicated React
// context: `react-redux`'s Provider already is that context, and a parallel one
// would be a second source of truth for data that is already serializable.
export const selectMidiSupport = (state: RootState) => state.midi.support
export const selectMidiError = (state: RootState) => state.midi.error
export const selectMidiInputs = (state: RootState) => state.midi.inputs
export const selectMidiOutputs = (state: RootState) => state.midi.outputs
export const selectEnabledInputIds = (state: RootState) => state.midi.enabledInputs
export const selectMidiThru = (state: RootState) => state.midi.thru
export const selectRecordLatencyMs = (state: RootState) => state.midi.recordLatencyMs
export const selectRouting = (state: RootState) => state.midi.routing

export const selectTrackRouting = (state: RootState, id: TrackId): TrackRouting =>
  state.midi.routing[id] ?? DEFAULT_ROUTING

export const selectArmedTrackIds = createSelector(
  [ selectAllTracks, selectRouting ],
  (tracks, routing) =>
    new Set(tracks.filter(t => routing[t.id]?.armed).map(t => t.id)),
)

/**
 * Tracks that should receive live input. With nothing armed, input falls back
 * to the track being edited, which is what a single-track session expects.
 */
export const selectRecordTargets = createSelector(
  [ selectAllTracks, selectArmedTrackIds, (state: RootState) => state.selection.activeTrackId ],
  (tracks, armed, activeId): Track[] => {
    if (armed.size > 0)
      return tracks.filter(t => armed.has(t.id))

    const active = tracks.find(t => t.id === activeId)
    return active ? [ active ] : []
  },
)

/**
 * Notes the internal synth should play: audible, and not routed to an external
 * port. Without the routing filter an externally routed track would sound twice.
 */
export const selectInternalSynthNotes = createSelector(
  [ selectAllNotes, selectAudibleTrackIds, selectRouting ],
  (notes, audible, routing): Note[] =>
    notes.filter(n => audible.has(n.trackId) && !routing[n.trackId]?.outputId),
)

export interface OutputGroup {
  portId:  string
  channel: MidiChannel
  notes:   Note[]
}

/** Audible notes grouped by the output port and channel they should be sent on. */
export const selectExternalNoteGroups = createSelector(
  [ selectAllNotes, selectAllTracks, selectAudibleTrackIds, selectRouting ],
  (notes, tracks, audible, routing): OutputGroup[] => {
    const groups: OutputGroup[] = []

    for (const track of tracks) {
      const portId = routing[track.id]?.outputId
      if (!portId || !audible.has(track.id))
        continue

      const trackNotes = notes.filter(n => n.trackId === track.id)
      if (trackNotes.length > 0)
        groups.push({ portId, channel: track.channel, notes: trackNotes })
    }
    return groups
  },
)
