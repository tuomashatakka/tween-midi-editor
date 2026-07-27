import { describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { addNotes } from '../slices/notesSlice'
import { setActiveTrack } from '../slices/selectionSlice'
import {
  setAllTracks,
  setTrackLocked,
  setTrackMuted,
  setTrackSoloed,
  setTrackVisible,
} from '../slices/tracksSlice'
import { rootReducer } from '../store'
import {
  isTrackEditable,
  selectAudibleTrackIds,
  selectEditableNotes,
  selectTrackStyles,
  selectVisibleNotesInPaintOrder,
} from './trackSelectors'
import { TRACK_DIM_ALPHA } from '@/domain/constants'
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

/** A store with tracks a/b/c, one note each, and `a` active. */
const makeStore = (tracks: Track[] = [ track('a'), track('b'), track('c') ]) => {
  const store = configureStore({ reducer: rootReducer })
  store.dispatch(setAllTracks(tracks))
  store.dispatch(addNotes(tracks.map(t => note(`n-${t.id}`, t.id))))
  store.dispatch(setActiveTrack(tracks[0].id))
  return store
}

describe('isTrackEditable', () => {
  it('always allows the active track, whatever its lock says', () => {
    expect(isTrackEditable(track('a', { locked: true }), 'a')).toBe(true)
  })

  it('allows an unlocked background track', () => {
    expect(isTrackEditable(track('b', { locked: false }), 'a')).toBe(true)
  })

  it('rejects a locked background track', () => {
    expect(isTrackEditable(track('b', { locked: true }), 'a')).toBe(false)
  })

  it('rejects a hidden track even when active', () => {
    expect(isTrackEditable(track('a', { visible: false }), 'a')).toBe(false)
  })
})

describe('selectAudibleTrackIds', () => {
  const audible = (tracks: Track[]) => [ ...selectAudibleTrackIds(makeStore(tracks).getState()) ]

  it('is everything when nothing is muted or soloed', () => {
    expect(audible([ track('a'), track('b') ])).toEqual([ 'a', 'b' ])
  })

  it('drops muted tracks', () => {
    expect(audible([ track('a'), track('b', { muted: true }) ])).toEqual([ 'a' ])
  })

  it('narrows to the soloed tracks', () => {
    expect(audible([ track('a'), track('b', { soloed: true }) ])).toEqual([ 'b' ])
  })

  it('keeps a soloed-and-muted track silent', () => {
    expect(audible([ track('a'), track('b', { soloed: true, muted: true }) ])).toEqual([])
  })

  it('is empty when every track is muted', () => {
    expect(audible([ track('a', { muted: true }), track('b', { muted: true }) ])).toEqual([])
  })
})

describe('selectTrackStyles', () => {
  it('dims every track but the active one and darkens the border', () => {
    const styles = selectTrackStyles(makeStore().getState())
    expect(styles.get('a')!.alpha).toBe(1)
    expect(styles.get('b')!.alpha).toBe(TRACK_DIM_ALPHA)
    expect(styles.get('a')!.border).not.toBe(styles.get('a')!.fill)
  })

  it('covers hidden tracks too, since visibility is filtered in the note selectors', () => {
    const store = makeStore()
    store.dispatch(setTrackVisible({ id: 'b', visible: false }))
    expect(selectTrackStyles(store.getState()).has('b')).toBe(true)
  })
})

describe('note selectors', () => {
  it('paints background tracks first and the active track last', () => {
    const store = makeStore()
    store.dispatch(setActiveTrack('b'))
    expect(selectVisibleNotesInPaintOrder(store.getState()).map(n => n.trackId))
      .toEqual([ 'a', 'c', 'b' ])
  })

  it('omits notes on hidden tracks', () => {
    const store = makeStore()
    store.dispatch(setTrackVisible({ id: 'c', visible: false }))
    expect(selectVisibleNotesInPaintOrder(store.getState()).map(n => n.trackId))
      .toEqual([ 'b', 'a' ])
  })

  it('restricts editable notes to the active and unlocked tracks', () => {
    const store = makeStore()
    store.dispatch(setTrackLocked({ id: 'b', locked: true }))
    store.dispatch(setTrackLocked({ id: 'c', locked: false }))
    expect(selectEditableNotes(store.getState()).map(n => n.trackId)
      .sort())
      .toEqual([ 'a', 'c' ])
  })

  it('keeps the active track editable even when it is locked', () => {
    const store = makeStore()
    store.dispatch(setTrackLocked({ id: 'a', locked: true }))
    expect(selectEditableNotes(store.getState()).some(n => n.trackId === 'a')).toBe(true)
  })

  it('never offers a hidden track for editing', () => {
    const store = makeStore()
    store.dispatch(setTrackMuted({ id: 'b', muted: true }))
    store.dispatch(setTrackSoloed({ id: 'b', soloed: false }))
    store.dispatch(setTrackVisible({ id: 'b', visible: false }))
    expect(selectEditableNotes(store.getState()).some(n => n.trackId === 'b')).toBe(false)
  })
})
