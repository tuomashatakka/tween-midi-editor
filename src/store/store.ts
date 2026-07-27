import { combineReducers, configureStore } from '@reduxjs/toolkit'
import undoable, { excludeAction } from 'redux-undo'
import midiReducer from './slices/midiSlice'
import notesReducer from './slices/notesSlice'
import projectReducer from './slices/projectSlice'
import recordingReducer from './slices/recordingSlice'
import selectionReducer from './slices/selectionSlice'
import syncReducer from './slices/syncSlice'
import toolReducer from './slices/toolSlice'
import tracksReducer from './slices/tracksSlice'
import transportReducer from './slices/transportSlice'
import viewportReducer from './slices/viewportSlice'
import { persistedToolState, preferencesMiddleware } from './persistence'
import { loadMidiPreferences, midiPreferencesMiddleware } from './midiPersistence'
import { projectMiddleware } from './projectMiddleware'

// Notes and tracks are one document and share a single history: deleting a
// track deletes its notes, and one undo has to bring both back. Two sibling
// `undoable` reducers would desync, because redux-undo's UNDO is global but each
// reducer only records entries for actions that changed it.
//
// Transport position updates are dispatched continuously by the audio engine, so
// they must never create history.
const documentReducer = combineReducers({
  notes:  notesReducer,
  tracks: tracksReducer,
})

const documentUndoable = undoable(documentReducer, {
  limit:  100,
  filter: excludeAction([ 'transport/setPosition' ]),
})

/** Exported so tests can build a bare store with the real state shape. */
export const rootReducer = combineReducers({
  document:  documentUndoable,
  midi:      midiReducer,
  project:   projectReducer,
  recording: recordingReducer,
  selection: selectionReducer,
  sync:      syncReducer,
  tool:      toolReducer,
  transport: transportReducer,
  viewport:  viewportReducer,
})

const persistedMidi = loadMidiPreferences()

export const store = configureStore({
  reducer:        rootReducer,
  preloadedState: {
    tool: persistedToolState,
    midi: persistedMidi.midi,
    sync: persistedMidi.sync,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(
      preferencesMiddleware,
      midiPreferencesMiddleware,
      projectMiddleware,
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
