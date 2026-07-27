import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_TRACK_ID } from '@/domain/constants'
import type { NoteId, TrackId } from '@/domain/types'


interface SelectionState {
  selectedIds: NoteId[]

  /**
   * The track being edited. It belongs here rather than in `tracksSlice`
   * because tracks live inside the undo history and undoing a note edit must
   * not also jump you to a different track.
   */
  activeTrackId: TrackId
}

const initialState: SelectionState = {
  selectedIds:   [],
  activeTrackId: DEFAULT_TRACK_ID,
}

const selectionSlice = createSlice({
  name:     'selection',
  initialState,
  reducers: {
    selectOne: (state, action: PayloadAction<NoteId>) => {
      state.selectedIds = [ action.payload ]
    },
    addToSelection: (state, action: PayloadAction<NoteId[]>) => {
      const set = new Set(state.selectedIds)
      for (const id of action.payload)
        set.add(id)
      state.selectedIds = [ ...set ]
    },
    toggleSelection: (state, action: PayloadAction<NoteId[]>) => {
      const set = new Set(state.selectedIds)
      for (const id of action.payload)
        if (set.has(id))
          set.delete(id)
        else
          set.add(id)
      state.selectedIds = [ ...set ]
    },
    setSelection: (state, action: PayloadAction<NoteId[]>) => {
      state.selectedIds = [ ...new Set(action.payload) ]
    },
    clearSelection: state => {
      state.selectedIds = []
    },
    setActiveTrack: (state, action: PayloadAction<TrackId>) => {
      state.activeTrackId = action.payload
    },
  },
})

export const {
  selectOne,
  addToSelection,
  toggleSelection,
  setSelection,
  clearSelection,
  setActiveTrack,
} = selectionSlice.actions

export default selectionSlice.reducer
