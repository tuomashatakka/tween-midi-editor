import { describe, expect, it } from 'vitest'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import undoable from 'redux-undo'
import notesReducer, { addNotes } from '@/store/slices/notesSlice'
import projectReducer from '@/store/slices/projectSlice'
import selectionReducer, { setSelection } from '@/store/slices/selectionSlice'
import toolReducer from '@/store/slices/toolSlice'
import transportReducer from '@/store/slices/transportSlice'
import viewportReducer from '@/store/slices/viewportSlice'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import { PPQ } from '@/domain/constants'
import { ticksPerBar } from '@/domain/time'
import type { Note } from '@/domain/types'
import { encodeSmf } from '@/midi/smfEncode'
import { importMidiData } from './projectThunks'


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

const fileNotes: Note[] = [
  { id: 'x', pitch: 62, start: 0, duration: 480, velocity: 96 },
  { id: 'y', pitch: 65, start: PPQ * 4, duration: PPQ, velocity: 80 }, // ends inside bar 2
]

describe('importMidiData', () => {
  it('replaces the document with the parsed file contents', () => {
    const store = makeStore()
    store.dispatch(addNotes([{ id: 'old', pitch: 30, start: 0, duration: 100, velocity: 50 }]))
    store.dispatch(setSelection([ 'old' ]))

    const bytes = encodeSmf({
      notes:         fileNotes,
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
    expect(state.notes.past).toHaveLength(0)
  })

  it('rounds the clip end up to a whole bar and matches the loop to it', () => {
    const store = makeStore()
    const bytes = encodeSmf({
      notes:         fileNotes,
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
    store.dispatch(addNotes([{ id: 'keep', pitch: 60, start: 0, duration: 10, velocity: 100 }]))

    expect(() => store.dispatch(importMidiData(new Uint8Array([ 9, 9, 9 ]), 'bad.mid'))).toThrow()
    expect(selectAllNotes(store.getState()).map(n => n.id)).toEqual([ 'keep' ])
  })
})
