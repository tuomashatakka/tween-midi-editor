import { createSelector } from '@reduxjs/toolkit'
import { tracksAdapter } from '../slices/tracksSlice'
import type { RootState } from '../store'
import { selectAllNotes } from './noteSelectors'
import { TRACK_DIM_ALPHA } from '@/domain/constants'
import type { Note, Track, TrackId } from '@/domain/types'
import { darken } from '@/view/color'
import type { SmfExportTrack } from '@/midi/smfEncode'


// Tracks share the redux-undo `document` history with notes.
const selectTracksState = (state: RootState) => state.document.present.tracks

const adapterSelectors = tracksAdapter.getSelectors(selectTracksState)

export const selectAllTracks = adapterSelectors.selectAll
export const selectTrackEntities = adapterSelectors.selectEntities
export const selectTrackIds = adapterSelectors.selectIds
export const selectTrackById = adapterSelectors.selectById

export const selectActiveTrackId = (state: RootState): TrackId => state.selection.activeTrackId

/**
 * The active track. There is always at least one track (`removeTrack` refuses to
 * empty the collection), so this falls back to the first rather than undefined.
 */
export const selectActiveTrack = createSelector(
  [ selectAllTracks, selectActiveTrackId ],
  (tracks, activeId) => tracks.find(t => t.id === activeId) ?? tracks[0],
)

/**
 * A track is editable when it is visible and either active or explicitly
 * unlocked. The active track ignores its own lock flag, which is what makes
 * "everything but the active track is locked by default" a single stored boolean.
 */
export const isTrackEditable = (track: Track, activeId: TrackId): boolean =>
  track.visible && (track.id === activeId || !track.locked)

export interface TrackStyle {
  fill:   string
  border: string

  /** 1 for the active track, TRACK_DIM_ALPHA for every other one. */
  alpha: number
}

/**
 * Paint styles for every track, including hidden ones — visibility is filtered
 * in the note selectors, so the layer's fallback style only ever catches a
 * genuine orphan.
 */
export const selectTrackStyles = createSelector(
  [ selectAllTracks, selectActiveTrackId ],
  (tracks, activeId) => {
    const styles = new Map<TrackId, TrackStyle>()
    for (const track of tracks)
      styles.set(track.id, {
        fill:   track.color,
        border: darken(track.color, 0.55),
        alpha:  track.id === activeId ? 1 : TRACK_DIM_ALPHA,
      })
    return styles
  },
)

export const selectVisibleTrackIds = createSelector(
  [ selectAllTracks ],
  tracks => new Set(tracks.filter(t => t.visible).map(t => t.id)),
)

export const selectEditableTrackIds = createSelector(
  [ selectAllTracks, selectActiveTrackId ],
  (tracks, activeId) =>
    new Set(tracks.filter(t => isTrackEditable(t, activeId)).map(t => t.id)),
)

/**
 * Solo picks the candidate set; mute still silences within it, so a track that
 * is both soloed and muted stays silent. This is the standard DAW rule.
 */
export const selectAudibleTrackIds = createSelector(
  [ selectAllTracks ],
  tracks => {
    const soloed    = tracks.filter(t => t.soloed)
    const candidate = soloed.length > 0 ? soloed : tracks
    return new Set(candidate.filter(t => !t.muted).map(t => t.id))
  },
)

/**
 * Render order: every non-active track first (in track order), the active track
 * last, so it paints on top. `hitTestNote` scans last-first, so this also makes
 * the active track win hit-test ties for free.
 */
export const selectVisibleNotesInPaintOrder = createSelector(
  [ selectAllNotes, selectVisibleTrackIds, selectTrackIds, selectActiveTrackId ],
  (notes, visible, trackIds, activeId) => {
    const rank = new Map<TrackId, number>()
    trackIds.forEach((id, i) => rank.set(id, id === activeId ? Number.MAX_SAFE_INTEGER : i))

    // Array.sort is stable, so within-track order (last drawn wins) is preserved.
    return notes
      .filter(n => visible.has(n.trackId))
      .sort((a, b) => (rank.get(a.trackId) ?? -1) - (rank.get(b.trackId) ?? -1))
  },
)

/** Notes the user may hit-test, marquee or select-all. */
export const selectEditableNotes = createSelector(
  [ selectVisibleNotesInPaintOrder, selectEditableTrackIds ],
  (notes, editable) => notes.filter(n => editable.has(n.trackId)),
)

/** Notes that should sound, before output routing is applied. */
export const selectAudibleNotes = createSelector(
  [ selectAllNotes, selectAudibleTrackIds ],
  (notes, audible) => notes.filter(n => audible.has(n.trackId)),
)

/** Notes grouped by track, in track order — the shape MIDI export needs. */
export const selectNotesByTrack = createSelector(
  [ selectAllNotes, selectAllTracks ],
  (notes, tracks) => {
    const byTrack = new Map<TrackId, Note[]>(tracks.map(t => [ t.id, []]))
    for (const note of notes)
      byTrack.get(note.trackId)?.push(note)
    return byTrack
  },
)

/** One SMF track per editor track, in display order. */
export const selectExportTracks = createSelector(
  [ selectAllTracks, selectNotesByTrack ],
  (tracks, byTrack): SmfExportTrack[] =>
    tracks.map(t => ({
      name:    t.name,
      channel: t.channel,
      notes:   byTrack.get(t.id) ?? [],
    })),
)
