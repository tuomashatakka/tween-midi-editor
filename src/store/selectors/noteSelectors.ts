import { createSelector } from '@reduxjs/toolkit'
import { notesAdapter } from '../slices/notesSlice'
import type { RootState } from '../store'
import { noteEnd } from '@/domain/time'
import type { Note, Ticks } from '@/domain/types'

// Notes live under the redux-undo `present` slice.
const selectNotesState = (state: RootState) => state.notes.present

const adapterSelectors = notesAdapter.getSelectors(selectNotesState)

export const selectAllNotes = adapterSelectors.selectAll
export const selectNoteEntities = adapterSelectors.selectEntities
export const selectNoteById = adapterSelectors.selectById
export const selectNoteIds = adapterSelectors.selectIds
export const selectNoteTotal = adapterSelectors.selectTotal

/** Notes overlapping a tick window [start, end) — used for viewport culling. */
export const makeSelectNotesInTickRange = () =>
  createSelector(
    [selectAllNotes, (_: RootState, start: Ticks) => start, (_: RootState, _s: Ticks, end: Ticks) => end],
    (notes: Note[], start, end) =>
      notes.filter((n) => n.start < end && noteEnd(n) > start),
  )

export const selectSelectedNotes = createSelector(
  [selectNoteEntities, (state: RootState) => state.selection.selectedIds],
  (entities, ids) => ids.map((id) => entities[id]).filter((n): n is Note => !!n),
)

export const selectSelectedTickSpan = createSelector(
  [selectSelectedNotes],
  (notes) => {
    if (notes.length === 0) return 0
    const min = Math.min(...notes.map((n) => n.start))
    const max = Math.max(...notes.map((n) => noteEnd(n)))
    return max - min
  },
)
