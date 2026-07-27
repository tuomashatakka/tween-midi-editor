import { describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { addNotes } from '@/store/slices/notesSlice'
import { setSelection } from '@/store/slices/selectionSlice'
import { rootReducer } from '@/store/store'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import {
  duplicateSelection,
  deleteSelected,
  retargetClipboard,
  transposeSelected,
} from './editingThunks'
import { DEFAULT_TRACK_ID } from '@/domain/constants'
import type { Note } from '@/domain/types'


const makeStore = () => configureStore({ reducer: rootReducer })

const notes: Note[] = [
  { id: 'a', trackId: DEFAULT_TRACK_ID, pitch: 60, start: 0, duration: 480, velocity: 100 },
  { id: 'b', trackId: DEFAULT_TRACK_ID, pitch: 64, start: 480, duration: 480, velocity: 100 },
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

describe('retargetClipboard', () => {
  const existing = new Set([ 'one', 'two' ])
  const on       = (id: string, trackId: string): Note => ({
    ...notes[0], id, trackId,
  })

  it('moves a single-track clipboard onto the active track', () => {
    const clip = [ on('a', 'one'), on('b', 'one') ]
    expect(retargetClipboard(clip, 'two', existing).map(n => n.trackId))
      .toEqual([ 'two', 'two' ])
  })

  it('preserves the shape of a multi-track clipboard', () => {
    const clip = [ on('a', 'one'), on('b', 'two') ]
    expect(retargetClipboard(clip, 'one', existing).map(n => n.trackId))
      .toEqual([ 'one', 'two' ])
  })

  it('falls back to the active track when a source track is gone', () => {
    const clip = [ on('a', 'one'), on('b', 'deleted') ]
    expect(retargetClipboard(clip, 'two', existing).map(n => n.trackId))
      .toEqual([ 'one', 'two' ])
  })
})
