import { describe, expect, it } from 'vitest'
import reducer, {
  addTrack,
  removeTrack,
  renameTrack,
  reorderTracks,
  setAllTracks,
  setTrackChannel,
  tracksAdapter,
} from './tracksSlice'
import { deleteTrackWithNotes } from '../documentActions'
import { DEFAULT_TRACK_ID } from '@/domain/constants'
import type { Track } from '@/domain/types'
import { trackColorAt } from '@/view/trackPalette'


const selectors = tracksAdapter.getSelectors()
const initial   = reducer(undefined, { type: '@@init' })

const withTracks = (n: number) => {
  let state = initial
  for (let i = 1; i < n; i++)
    state = reducer(state, addTrack(`t${i}`))
  return state
}

const track = (over: Partial<Track> & Pick<Track, 'id'>): Track => ({
  name:    'Track',
  color:   '#5b8def',
  channel: 0,
  muted:   false,
  soloed:  false,
  visible: true,
  locked:  false,
  ...over,
})

describe('tracksSlice', () => {
  it('starts with one unlocked default track', () => {
    const tracks = selectors.selectAll(initial)
    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toMatchObject({ id: DEFAULT_TRACK_ID, channel: 0, locked: false })
  })

  it('addTrack derives the next name, colour and free channel, and locks it', () => {
    const state = reducer(initial, addTrack('t1'))
    const added = selectors.selectById(state, 't1')!
    expect(added).toMatchObject({
      name:    'Track 2',
      color:   trackColorAt(1),
      channel: 1,
      locked:  true,
      visible: true,
    })
  })

  it('addTrack reuses a channel freed by an earlier removal', () => {
    let state = reducer(withTracks(3), setTrackChannel({ id: 't1', channel: 7 }))
    state = reducer(state, addTrack('t3'))
    // Channels in use are 0, 7, 2 — so the next free one is 1.
    expect(selectors.selectById(state, 't3')!.channel).toBe(1)
  })

  it('setTrackChannel clamps to 0..15', () => {
    expect(selectors.selectById(
      reducer(initial, setTrackChannel({ id: DEFAULT_TRACK_ID, channel: 99 })),
      DEFAULT_TRACK_ID,
    )!.channel).toBe(15)

    expect(selectors.selectById(
      reducer(initial, setTrackChannel({ id: DEFAULT_TRACK_ID, channel: -4 })),
      DEFAULT_TRACK_ID,
    )!.channel).toBe(0)
  })

  it('renameTrack ignores a blank name', () => {
    const state = reducer(initial, renameTrack({ id: DEFAULT_TRACK_ID, name: '   ' }))
    expect(selectors.selectById(state, DEFAULT_TRACK_ID)!.name).toBe('Track 1')
  })

  it('refuses to remove the last track', () => {
    expect(selectors.selectTotal(reducer(initial, removeTrack(DEFAULT_TRACK_ID)))).toBe(1)
    expect(selectors.selectTotal(
      reducer(initial, deleteTrackWithNotes({ trackId: DEFAULT_TRACK_ID, noteIds: []})),
    )).toBe(1)
  })

  it('removes a track once there is more than one', () => {
    const state = reducer(withTracks(2), removeTrack('t1'))
    expect(selectors.selectIds(state)).toEqual([ DEFAULT_TRACK_ID ])
  })

  it('reorderTracks only accepts a permutation of the current ids', () => {
    const state = withTracks(3)
    expect(selectors.selectIds(reducer(state, reorderTracks([ 't2', DEFAULT_TRACK_ID, 't1' ]))))
      .toEqual([ 't2', DEFAULT_TRACK_ID, 't1' ])

    // Wrong length, unknown id and duplicates are all ignored.
    expect(selectors.selectIds(reducer(state, reorderTracks([ 't1' ])))).toEqual(selectors.selectIds(state))
    expect(selectors.selectIds(reducer(state, reorderTracks([ 't1', 't2', 'ghost' ])))).toEqual(selectors.selectIds(state))
    expect(selectors.selectIds(reducer(state, reorderTracks([ 't1', 't1', 't2' ])))).toEqual(selectors.selectIds(state))
  })

  it('setAllTracks replaces the list but ignores an empty one', () => {
    const state = reducer(initial, setAllTracks([ track({ id: 'imported', name: 'Bass' }) ]))
    expect(selectors.selectIds(state)).toEqual([ 'imported' ])
    expect(selectors.selectIds(reducer(state, setAllTracks([])))).toEqual([ 'imported' ])
  })
})
