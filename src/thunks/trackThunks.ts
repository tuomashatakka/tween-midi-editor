import { nanoid } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from '@/store/store'
import { updateNotes } from '@/store/slices/notesSlice'
import { setActiveTrack, setSelection } from '@/store/slices/selectionSlice'
import { addTrack, setTrackLocked, setTrackVisible } from '@/store/slices/tracksSlice'
import { deleteTrackWithNotes } from '@/store/documentActions'
import { selectAllNotes, selectSelectedNotes } from '@/store/selectors/noteSelectors'
import {
  selectAllTracks,
  selectEditableTrackIds,
} from '@/store/selectors/trackSelectors'
import type { TrackId } from '@/domain/types'


type Thunk = (dispatch: AppDispatch, getState: () => RootState) => void

/**
 * Drop any selected note whose track is no longer editable. Without this,
 * hiding or locking a track leaves its notes selected and a later nudge or
 * transpose would silently edit notes the user cannot see.
 */
export const pruneSelectionToEditable = (): Thunk => (dispatch, getState) => {
  const state    = getState()
  const editable = selectEditableTrackIds(state)
  const kept     = selectSelectedNotes(state)
    .filter(n => editable.has(n.trackId))
    .map(n => n.id)

  if (kept.length !== state.selection.selectedIds.length)
    dispatch(setSelection(kept))
}

/** Add a track and make it the one being edited. */
export const createTrack = (): Thunk => dispatch => {
  const id = nanoid()
  dispatch(addTrack(id))
  dispatch(setActiveTrack(id))
}

/** Switch the edited track, then drop anything that is no longer editable. */
export const activateTrack = (id: TrackId): Thunk => dispatch => {
  // A hidden track cannot be edited, so activating one reveals it rather than
  // leaving the user drawing into nothing.
  dispatch(setTrackVisible({ id, visible: true }))
  dispatch(setActiveTrack(id))
  dispatch(pruneSelectionToEditable())
}

export const toggleTrackVisibility = (id: TrackId): Thunk => (dispatch, getState) => {
  const track = selectAllTracks(getState()).find(t => t.id === id)
  if (!track)
    return
  dispatch(setTrackVisible({ id, visible: !track.visible }))
  dispatch(pruneSelectionToEditable())
}

export const toggleTrackLock = (id: TrackId): Thunk => (dispatch, getState) => {
  const track = selectAllTracks(getState()).find(t => t.id === id)
  if (!track)
    return
  dispatch(setTrackLocked({ id, locked: !track.locked }))
  dispatch(pruneSelectionToEditable())
}

/**
 * Delete a track and its notes as a single undo step — one action handled by
 * both document slices, not two dispatches. No-op on the last remaining track.
 */
export const deleteTrack = (id: TrackId): Thunk => (dispatch, getState) => {
  const state  = getState()
  const tracks = selectAllTracks(state)
  if (tracks.length <= 1)
    return

  const noteIds = selectAllNotes(state).filter(n => n.trackId === id)
    .map(n => n.id)
  dispatch(deleteTrackWithNotes({ trackId: id, noteIds }))

  if (state.selection.activeTrackId === id) {
    const index = tracks.findIndex(t => t.id === id)
    const next  = tracks[index + 1] ?? tracks[index - 1] ?? tracks[0]
    dispatch(setActiveTrack(next.id))
  }
  dispatch(pruneSelectionToEditable())
}

/** Move the current selection onto another track. */
export const moveSelectionToTrack = (trackId: TrackId): Thunk => (dispatch, getState) => {
  const selected = selectSelectedNotes(getState())
  if (selected.length === 0)
    return
  dispatch(updateNotes(selected.map(n => ({ id: n.id, changes: { trackId }}))))
}
