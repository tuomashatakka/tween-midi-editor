import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NoteId } from '@/domain/types'

interface SelectionState {
  selectedIds: NoteId[]
}

const initialState: SelectionState = { selectedIds: [] }

const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    selectOne: (state, action: PayloadAction<NoteId>) => {
      state.selectedIds = [action.payload]
    },
    addToSelection: (state, action: PayloadAction<NoteId[]>) => {
      const set = new Set(state.selectedIds)
      for (const id of action.payload) set.add(id)
      state.selectedIds = [...set]
    },
    toggleSelection: (state, action: PayloadAction<NoteId[]>) => {
      const set = new Set(state.selectedIds)
      for (const id of action.payload) {
        if (set.has(id)) set.delete(id)
        else set.add(id)
      }
      state.selectedIds = [...set]
    },
    setSelection: (state, action: PayloadAction<NoteId[]>) => {
      state.selectedIds = [...new Set(action.payload)]
    },
    clearSelection: (state) => {
      state.selectedIds = []
    },
  },
})

export const {
  selectOne,
  addToSelection,
  toggleSelection,
  setSelection,
  clearSelection,
} = selectionSlice.actions

export default selectionSlice.reducer
