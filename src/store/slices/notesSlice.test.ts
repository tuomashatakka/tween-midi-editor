import { describe, expect, it } from 'vitest'
import reducer, {
  addNote,
  moveNotesBy,
  setNoteVelocity,
  updateNote,
  notesAdapter,
} from './notesSlice'

const empty = notesAdapter.getInitialState()
const selectors = notesAdapter.getSelectors()

describe('notesSlice', () => {
  it('adds a note with a generated id and clamped values', () => {
    const state = reducer(empty, addNote({ pitch: 200, start: -5, duration: 480, velocity: 999 }))
    const notes = selectors.selectAll(state)
    expect(notes).toHaveLength(1)
    expect(notes[0].pitch).toBe(127)
    expect(notes[0].start).toBe(0)
    expect(notes[0].velocity).toBe(127)
    expect(notes[0].id).toBeTruthy()
  })

  it('moveNotesBy clamps pitch 0..127 and start >= 0', () => {
    let state = reducer(empty, addNote({ id: 'x', pitch: 1, start: 10, duration: 100, velocity: 50 }))
    state = reducer(state, moveNotesBy({ ids: ['x'], deltaTicks: -1000, deltaPitch: -5 }))
    const n = selectors.selectById(state, 'x')!
    expect(n.start).toBe(0)
    expect(n.pitch).toBe(0)

    state = reducer(state, moveNotesBy({ ids: ['x'], deltaTicks: 50, deltaPitch: 200 }))
    expect(selectors.selectById(state, 'x')!.pitch).toBe(127)
    expect(selectors.selectById(state, 'x')!.start).toBe(50)
  })

  it('setNoteVelocity clamps to 0..127', () => {
    let state = reducer(empty, addNote({ id: 'v', pitch: 60, start: 0, duration: 100, velocity: 50 }))
    state = reducer(state, setNoteVelocity({ id: 'v', velocity: 300 }))
    expect(selectors.selectById(state, 'v')!.velocity).toBe(127)
    state = reducer(state, setNoteVelocity({ id: 'v', velocity: -10 }))
    expect(selectors.selectById(state, 'v')!.velocity).toBe(0)
  })

  it('updateNote enforces a minimum duration of 1', () => {
    let state = reducer(empty, addNote({ id: 'd', pitch: 60, start: 0, duration: 100, velocity: 50 }))
    state = reducer(state, updateNote({ id: 'd', changes: { duration: -50 } }))
    expect(selectors.selectById(state, 'd')!.duration).toBe(1)
  })
})
