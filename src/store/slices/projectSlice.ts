import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'


export interface ProjectState {
  fileName: string | null
  dirty:    boolean
}

const initialState: ProjectState = {
  fileName: null,
  dirty:    false,
}

const projectSlice = createSlice({
  name:     'project',
  initialState,
  reducers: {
    setFileName: (state, action: PayloadAction<string | null>) => {
      state.fileName = action.payload
    },
    markDirty: state => {
      state.dirty = true
    },
    markClean: state => {
      state.dirty = false
    },
  },
})

export const { setFileName, markDirty, markClean } = projectSlice.actions

export default projectSlice.reducer
