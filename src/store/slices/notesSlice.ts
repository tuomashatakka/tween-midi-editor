import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { MAX_NOTE, MIN_NOTE } from '@/domain/constants'
import type { MidiNote, Note, NoteId, Ticks, Velocity } from '@/domain/types'

const clampPitch = (p: number): MidiNote =>
  Math.max(MIN_NOTE, Math.min(MAX_NOTE, Math.round(p)))
const clampVelocity = (v: number): Velocity =>
  Math.max(0, Math.min(127, Math.round(v)))
const clampStart = (t: number): Ticks => Math.max(0, Math.round(t))

export const notesAdapter = createEntityAdapter<Note>()

const notesSlice = createSlice({
  name: 'notes',
  initialState: notesAdapter.getInitialState(),
  reducers: {
    addNote: {
      reducer: notesAdapter.addOne,
      prepare: (note: Omit<Note, 'id'> & { id?: NoteId }) => ({
        payload: {
          id: note.id ?? nanoid(),
          pitch: clampPitch(note.pitch),
          start: clampStart(note.start),
          duration: Math.max(1, Math.round(note.duration)),
          velocity: clampVelocity(note.velocity ?? 100),
        } satisfies Note,
      }),
    },
    addNotes: notesAdapter.addMany,
    removeNote: notesAdapter.removeOne,
    removeNotes: notesAdapter.removeMany,

    updateNote: (
      state,
      action: PayloadAction<{ id: NoteId; changes: Partial<Omit<Note, 'id'>> }>,
    ) => {
      const { id, changes } = action.payload
      const next: Partial<Note> = { ...changes }
      if (next.pitch !== undefined) next.pitch = clampPitch(next.pitch)
      if (next.velocity !== undefined) next.velocity = clampVelocity(next.velocity)
      if (next.start !== undefined) next.start = clampStart(next.start)
      if (next.duration !== undefined) next.duration = Math.max(1, Math.round(next.duration))
      notesAdapter.updateOne(state, { id, changes: next })
    },

    updateNotes: (
      state,
      action: PayloadAction<Array<{ id: NoteId; changes: Partial<Omit<Note, 'id'>> }>>,
    ) => {
      for (const { id, changes } of action.payload) {
        const next: Partial<Note> = { ...changes }
        if (next.pitch !== undefined) next.pitch = clampPitch(next.pitch)
        if (next.velocity !== undefined) next.velocity = clampVelocity(next.velocity)
        if (next.start !== undefined) next.start = clampStart(next.start)
        if (next.duration !== undefined) next.duration = Math.max(1, Math.round(next.duration))
        notesAdapter.updateOne(state, { id, changes: next })
      }
    },

    /** Relative move of a set of notes (drag, nudge, transpose). */
    moveNotesBy: (
      state,
      action: PayloadAction<{ ids: NoteId[]; deltaTicks?: number; deltaPitch?: number }>,
    ) => {
      const { ids, deltaTicks = 0, deltaPitch = 0 } = action.payload
      for (const id of ids) {
        const note = state.entities[id]
        if (!note) continue
        note.start = clampStart(note.start + deltaTicks)
        note.pitch = clampPitch(note.pitch + deltaPitch)
      }
    },

    setNoteVelocity: (
      state,
      action: PayloadAction<{ id: NoteId; velocity: number }>,
    ) => {
      const note = state.entities[action.payload.id]
      if (note) note.velocity = clampVelocity(action.payload.velocity)
    },
  },
})

export const {
  addNote,
  addNotes,
  removeNote,
  removeNotes,
  updateNote,
  updateNotes,
  moveNotesBy,
  setNoteVelocity,
} = notesSlice.actions

export default notesSlice.reducer
