import { describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { addNotes } from '@/store/slices/notesSlice'
import { setSelection } from '@/store/slices/selectionSlice'
import { rootReducer } from '@/store/store'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import { selectAllTracks } from '@/store/selectors/trackSelectors'
import { DEFAULT_TRACK_ID, PPQ } from '@/domain/constants'
import { ticksPerBar } from '@/domain/time'
import type { Note } from '@/domain/types'
import { encodeSmf } from '@/midi/smfEncode'
import { importMidiData } from './projectThunks'


const makeStore = () => configureStore({ reducer: rootReducer })

const note = (over: Partial<Note> & Pick<Note, 'id' | 'pitch'>): Note => ({
  trackId:  DEFAULT_TRACK_ID,
  start:    0,
  duration: 480,
  velocity: 96,
  ...over,
})

const fileNotes: Note[] = [
  note({ id: 'x', pitch: 62 }),
  // Ends inside bar 2.
  note({ id: 'y', pitch: 65, start: PPQ * 4, duration: PPQ, velocity: 80 }),
]

const oneTrack = (notes: Note[], name = 'Lead', channel = 0) =>
  [{ name, channel, notes }]

describe('importMidiData', () => {
  it('replaces the document with the parsed file contents', () => {
    const store = makeStore()
    store.dispatch(addNotes([ note({ id: 'old', pitch: 30, duration: 100, velocity: 50 }) ]))
    store.dispatch(setSelection([ 'old' ]))

    const bytes = encodeSmf({
      tracks:        oneTrack(fileNotes),
      bpm:           99,
      timeSignature: { numerator: 6, denominator: 8 },
      ppq:           PPQ,
    })
    store.dispatch(importMidiData(bytes, 'imported.mid'))

    const state = store.getState()
    const all   = selectAllNotes(state)

    expect(all).toHaveLength(2)
    expect(all.map(n => n.pitch).sort((a, b) => a - b)).toEqual([ 62, 65 ])
    // Fresh ids are assigned on import.
    expect(all.some(n => n.id === 'old')).toBe(false)

    expect(state.transport.bpm).toBe(99)
    expect(state.transport.timeSignature).toEqual({ numerator: 6, denominator: 8 })
    expect(state.transport.isPlaying).toBe(false)
    expect(state.transport.positionTicks).toBe(0)

    expect(state.selection.selectedIds).toEqual([])
    expect(state.project.fileName).toBe('imported.mid')
    expect(state.project.dirty).toBe(false)
    // A loaded file is a fresh undo baseline.
    expect(state.document.past).toHaveLength(0)
  })

  it('builds a track per channel and points every note at one', () => {
    const store = makeStore()
    store.dispatch(importMidiData(
      encodeSmf({
        tracks: [
          { name: 'Bass', channel: 0, notes: [ note({ id: 'a', pitch: 40 }) ]},
          { name: 'Keys', channel: 3, notes: [ note({ id: 'b', pitch: 72 }) ]},
        ],
        bpm:           120,
        timeSignature: { numerator: 4, denominator: 4 },
        ppq:           PPQ,
      }),
      'two-tracks.mid',
    ))

    const state  = store.getState()
    const tracks = selectAllTracks(state)
    expect(tracks.map(t => t.name)).toEqual([ 'Bass', 'Keys' ])
    expect(tracks.map(t => t.channel)).toEqual([ 0, 3 ])
    // Only the first track is unlocked; the rest follow the active-track rule.
    expect(tracks.map(t => t.locked)).toEqual([ false, true ])
    expect(state.selection.activeTrackId).toBe(tracks[0].id)

    const ids = new Set(tracks.map(t => t.id))
    expect(selectAllNotes(state).every(n => ids.has(n.trackId))).toBe(true)
  })

  it('rounds the clip end up to a whole bar and matches the loop to it', () => {
    const store = makeStore()
    const bytes = encodeSmf({
      tracks:        oneTrack(fileNotes),
      bpm:           120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq:           PPQ,
    })
    store.dispatch(importMidiData(bytes, 'clip.mid'))

    const state = store.getState()
    const bar   = ticksPerBar(state.transport.timeSignature)
    // Last note ends at 5 quarters = 1.25 bars; clip end rounds up to 2 bars.
    expect(state.transport.clipEndTicks).toBe(bar * 2)
    expect(state.transport.loop).toMatchObject({ startTicks: 0, endTicks: bar * 2 })
  })

  it('throws on malformed data without touching the document', () => {
    const store = makeStore()
    store.dispatch(addNotes([ note({ id: 'keep', pitch: 60, duration: 10, velocity: 100 }) ]))

    expect(() => store.dispatch(importMidiData(new Uint8Array([ 9, 9, 9 ]), 'bad.mid'))).toThrow()
    expect(selectAllNotes(store.getState()).map(n => n.id)).toEqual([ 'keep' ])
  })
})
