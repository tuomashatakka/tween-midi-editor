import { ActionCreators as UndoActions } from 'redux-undo'
import type { AppDispatch, RootState } from '@/store/store'
import {
  addNotes,
  moveNotesBy,
  removeNotes,
} from '@/store/slices/notesSlice'
import {
  clearSelection,
  setSelection,
} from '@/store/slices/selectionSlice'
import {
  selectNoteEntities,
  selectSelectedNotes,
  selectSelectedTickSpan,
} from '@/store/selectors/noteSelectors'
import {
  selectActiveTrackId,
  selectAllTracks,
  selectEditableNotes,
} from '@/store/selectors/trackSelectors'
import { selectEffectiveSnapTicks } from '@/store/selectors/viewportSelectors'
import { divisionTicks, noteEnd } from '@/domain/time'
import type { Note, TrackId } from '@/domain/types'
import { nanoid } from '@reduxjs/toolkit'


type Thunk = (dispatch: AppDispatch, getState: () => RootState) => void

export const deleteSelected = (): Thunk => (dispatch, getState) => {
  const ids = getState().selection.selectedIds
  if (ids.length === 0)
    return
  dispatch(removeNotes(ids))
  dispatch(clearSelection())
}

// Only editable notes: Ctrl+A must not reach into hidden or locked tracks,
// where a following Delete would destroy notes the user cannot see.
export const selectAllNotesThunk = (): Thunk => (dispatch, getState) => {
  const ids = selectEditableNotes(getState()).map(n => n.id)
  dispatch(setSelection(ids))
}

let clipboard: Note[] = []

/**
 * Decide which track pasted notes land on.
 *
 * A clipboard from a single track is a riff being moved to another instrument,
 * so it retargets to the active track. A multi-track clipboard is a slice of an
 * arrangement, so it keeps its shape — except for notes whose source track has
 * since been deleted, which fall back to the active track.
 */
export const retargetClipboard = (
  clip: Note[],
  activeTrackId: TrackId,
  existingTrackIds: Set<TrackId>,
): Note[] => {
  const sources = new Set(clip.map(n => n.trackId))
  if (sources.size <= 1)
    return clip.map(n => ({ ...n, trackId: activeTrackId }))

  return clip.map(n => ({
    ...n,
    trackId: existingTrackIds.has(n.trackId) ? n.trackId : activeTrackId,
  }))
}

export const copySelection = (): Thunk => (_dispatch, getState) => {
  clipboard = selectSelectedNotes(getState()).map(n => ({ ...n }))
}

export const cutSelection = (): Thunk => (dispatch, getState) => {
  clipboard = selectSelectedNotes(getState()).map(n => ({ ...n }))
  dispatch(deleteSelected())
}

export const pasteAtPlayhead = (): Thunk => (dispatch, getState) => {
  if (clipboard.length === 0)
    return

  const state         = getState()
  const at            = state.transport.positionTicks
  const origin        = Math.min(...clipboard.map(n => n.start))
  const offset        = at - origin
  const trackIds      = new Set(selectAllTracks(state).map(t => t.id))
  const retargeted    = retargetClipboard(clipboard, selectActiveTrackId(state), trackIds)
  const fresh: Note[] = retargeted.map(n => ({
    ...n,
    id:    nanoid(),
    start: Math.max(0, n.start + offset),
  }))
  dispatch(addNotes(fresh))
  dispatch(setSelection(fresh.map(n => n.id)))
}

export const duplicateSelection = (): Thunk => (dispatch, getState) => {
  const state    = getState()
  const selected = selectSelectedNotes(state)
  if (selected.length === 0)
    return

  // Ableton-style: clone and shift by the length of the selection.
  const span          = selectSelectedTickSpan(state) || maxNoteSpan(selected)
  const fresh: Note[] = selected.map(n => ({
    ...n,
    id:    nanoid(),
    start: n.start + span,
  }))
  dispatch(addNotes(fresh))
  dispatch(setSelection(fresh.map(n => n.id)))
}

const maxNoteSpan = (notes: Note[]): number =>
  notes.reduce((m, n) => Math.max(m, noteEnd(n)), 0) -
  notes.reduce((m, n) => Math.min(m, n.start), Infinity)

/** Nudge selected notes by one grid step in the given direction. */
export const nudgeSelected =
  (direction: -1 | 1): Thunk =>
    (dispatch, getState) => {
      const state = getState()
      const ids   = state.selection.selectedIds
      if (ids.length === 0)
        return

      const snap =
        selectEffectiveSnapTicks(state) ||
      divisionTicks(state.tool.division, state.tool.triplet)
      dispatch(moveNotesBy({ ids, deltaTicks: direction * snap }))
    }

/** Transpose selected notes by a number of semitones. */
export const transposeSelected =
  (semitones: number): Thunk =>
    (dispatch, getState) => {
      const ids = getState().selection.selectedIds
      if (ids.length === 0)
        return
      dispatch(moveNotesBy({ ids, deltaPitch: semitones }))
    }

export const undo = (): Thunk => (dispatch, getState) => {
  // Guard against selecting deleted notes after undo.
  dispatch(UndoActions.undo())
  pruneSelection(dispatch, getState)
}

export const redo = (): Thunk => (dispatch, getState) => {
  dispatch(UndoActions.redo())
  pruneSelection(dispatch, getState)
}

const pruneSelection = (dispatch: AppDispatch, getState: () => RootState) => {
  const entities = selectNoteEntities(getState())
  const ids      = getState().selection.selectedIds.filter(id => entities[id])
  dispatch(setSelection(ids))
}
