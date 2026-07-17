import { describe, expect, it } from 'vitest'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import undoable from 'redux-undo'
import notesReducer, { addNotes } from '@/store/slices/notesSlice'
import projectReducer from '@/store/slices/projectSlice'
import selectionReducer, { setSelection } from '@/store/slices/selectionSlice'
import toolReducer from '@/store/slices/toolSlice'
import transportReducer from '@/store/slices/transportSlice'
import viewportReducer from '@/store/slices/viewportSlice'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import { duplicateSelection, deleteSelected, transposeSelected } from './editingThunks'
import type { Note } from '@/domain/types'


function makeStore () {
  return configureStore({
    reducer: combineReducers({
      notes:     undoable(notesReducer),
      project:   projectReducer,
      selection: selectionReducer,
      tool:      toolReducer,
      transport: transportReducer,
      viewport:  viewportReducer,
    }),
  })
}

const notes: Note[] = [
  { id: 'a', pitch: 60, start: 0, duration: 480, velocity: 100 },
  { id: 'b', pitch: 64, start: 480, duration: 480, velocity: 100 },
]

describe('editing thunks', () => {
  it('duplicateSelection clones with new ids shifted by the selection span', () => {
    const store = makeStore()
    store.dispatch(addNotes(notes))
    store.dispatch(setSelection([ 'a', 'b' ]))
    store.dispatch(duplicateSelection())

    const all = selectAllNotes(store.getState())
    expect(all).toHaveLength(4)

    // Span of selection is 960 (0..960); clones start at 960 and 1440.
    const starts = all.map(n => n.start).sort((x, y) => x - y)
    expect(starts).toEqual([ 0, 480, 960, 1440 ])
    // New selection points at the clones (new ids).
    expect(store.getState().selection.selectedIds).not.toContain('a')
  })

  it('deleteSelected removes notes and clears selection', () => {
    const store = makeStore()
    store.dispatch(addNotes(notes))
    store.dispatch(setSelection([ 'a' ]))
    store.dispatch(deleteSelected())
    expect(selectAllNotes(store.getState()).map(n => n.id)).toEqual([ 'b' ])
    expect(store.getState().selection.selectedIds).toEqual([])
  })

  it('transposeSelected shifts pitch of selected notes', () => {
    const store = makeStore()
    store.dispatch(addNotes(notes))
    store.dispatch(setSelection([ 'a' ]))
    store.dispatch(transposeSelected(12))

    const a = selectAllNotes(store.getState()).find(n => n.id === 'a')!
    expect(a.pitch).toBe(72)
  })
})
