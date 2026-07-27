import { describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { addNotes } from '@/store/slices/notesSlice'
import { setActiveTrack, setSelection } from '@/store/slices/selectionSlice'
import { setAllTracks } from '@/store/slices/tracksSlice'
import { rootReducer } from '@/store/store'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import { selectAllTracks } from '@/store/selectors/trackSelectors'
import {
  createTrack,
  deleteTrack,
  moveSelectionToTrack,
  toggleTrackLock,
  toggleTrackVisibility,
} from './trackThunks'
import type { Note, Track } from '@/domain/types'


const track = (id: string, over: Partial<Track> = {}): Track => ({
  id,
  name:    id,
  color:   '#5b8def',
  channel: 0,
  muted:   false,
  soloed:  false,
  visible: true,
  locked:  false,
  ...over,
})

const note = (id: string, trackId: string): Note =>
  ({ id, trackId, pitch: 60, start: 0, duration: 480, velocity: 100 })

const makeStore = () => {
  const store = configureStore({ reducer: rootReducer })
  store.dispatch(setAllTracks([ track('a'), track('b') ]))
  store.dispatch(addNotes([ note('n1', 'a'), note('n2', 'a'), note('n3', 'b') ]))
  store.dispatch(setActiveTrack('a'))
  return store
}

describe('deleteTrack', () => {
  it('removes the track and its notes in a single undo step', () => {
    const store  = makeStore()
    const before = store.getState().document.past.length

    store.dispatch(deleteTrack('a'))

    const state = store.getState()
    expect(selectAllTracks(state).map(t => t.id)).toEqual([ 'b' ])
    expect(selectAllNotes(state).map(n => n.id)).toEqual([ 'n3' ])
    expect(state.document.past.length - before).toBe(1)
  })

  it('moves the active track to a neighbour', () => {
    const store = makeStore()
    store.dispatch(deleteTrack('a'))
    expect(store.getState().selection.activeTrackId).toBe('b')
  })

  it('is a no-op on the last remaining track', () => {
    const store = makeStore()
    store.dispatch(deleteTrack('a'))
    store.dispatch(deleteTrack('b'))
    expect(selectAllTracks(store.getState()).map(t => t.id)).toEqual([ 'b' ])
  })

  it('drops deleted notes from the selection', () => {
    const store = makeStore()
    store.dispatch(setSelection([ 'n1', 'n3' ]))
    store.dispatch(deleteTrack('a'))
    expect(store.getState().selection.selectedIds).toEqual([ 'n3' ])
  })
})

describe('createTrack', () => {
  it('appends a track and makes it active', () => {
    const store = makeStore()
    store.dispatch(createTrack())

    const tracks = selectAllTracks(store.getState())
    expect(tracks).toHaveLength(3)
    expect(store.getState().selection.activeTrackId).toBe(tracks[2].id)
  })
})

describe('selection pruning', () => {
  it('drops notes on a track that has just been hidden', () => {
    const store = makeStore()
    store.dispatch(setSelection([ 'n1', 'n3' ]))
    store.dispatch(toggleTrackVisibility('b'))
    expect(store.getState().selection.selectedIds).toEqual([ 'n1' ])
  })

  it('drops notes on a background track that has just been locked', () => {
    const store = makeStore()
    store.dispatch(setSelection([ 'n1', 'n3' ]))
    store.dispatch(toggleTrackLock('b'))
    expect(store.getState().selection.selectedIds).toEqual([ 'n1' ])
  })

  it('keeps notes on the active track when it is locked', () => {
    const store = makeStore()
    store.dispatch(setSelection([ 'n1' ]))
    store.dispatch(toggleTrackLock('a'))
    expect(store.getState().selection.selectedIds).toEqual([ 'n1' ])
  })
})

describe('moveSelectionToTrack', () => {
  it('retargets the selected notes', () => {
    const store = makeStore()
    store.dispatch(setSelection([ 'n1' ]))
    store.dispatch(moveSelectionToTrack('b'))

    const moved = selectAllNotes(store.getState()).find(n => n.id === 'n1')!
    expect(moved.trackId).toBe('b')
  })
})
