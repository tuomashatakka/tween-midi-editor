import { createAction } from '@reduxjs/toolkit'
import type { Note, NoteId, Track, TrackId } from '@/domain/types'

/**
 * Actions that span both halves of the undoable document (`notes` + `tracks`).
 *
 * `notes` and `tracks` are separate slices combined under one `undoable`
 * reducer, and redux-undo records one history entry per dispatched action. So
 * anything that must undo as a single step has to be *one* action handled by
 * both slices through `extraReducers` — two dispatches would cost the user two
 * presses of Ctrl+Z.
 */

/** Delete a track together with every note on it. */
export const deleteTrackWithNotes = createAction<{
  trackId: TrackId
  noteIds: NoteId[]
}>('document/deleteTrackWithNotes')

/** Replace the whole document (file import). */
export const loadDocument = createAction<{
  tracks: Track[]
  notes:  Note[]
}>('document/load')

/**
 * Replace the notes overlapping a tick span on the given tracks. Used by
 * replace-mode recording, where a remove followed by an add would otherwise
 * leave two undo entries for one take.
 */
export const replaceRangeNotes = createAction<{
  trackIds: TrackId[]
  fromTick: number
  toTick:   number
  notes:    Note[]
}>('document/replaceRangeNotes')
