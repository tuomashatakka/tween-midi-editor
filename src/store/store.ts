import { combineReducers, configureStore } from '@reduxjs/toolkit'
import undoable, { excludeAction } from 'redux-undo'
import notesReducer from './slices/notesSlice'
import selectionReducer from './slices/selectionSlice'
import toolReducer from './slices/toolSlice'
import transportReducer from './slices/transportSlice'
import viewportReducer from './slices/viewportSlice'
import { persistedToolState, preferencesMiddleware } from './persistence'

// Only the note data is historized for undo/redo. Transport position updates are
// dispatched continuously by the audio engine, so they must never create history.
const notesUndoable = undoable(notesReducer, {
  limit:  100,
  filter: excludeAction([ 'transport/setPosition' ]),
})

const rootReducer = combineReducers({
  notes:     notesUndoable,
  selection: selectionReducer,
  tool:      toolReducer,
  transport: transportReducer,
  viewport:  viewportReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    tool: persistedToolState,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(preferencesMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
