import type { AppDispatch, RootState } from '@/store/store'
import { setTool, toggleSnap, finerGrid, coarserGrid, toggleTriplet } from '@/store/slices/toolSlice'
import { togglePlay, stop, seek, toggleLoop } from '@/store/slices/transportSlice'
import { zoomX } from '@/store/slices/viewportSlice'
import {
  deleteSelected,
  selectAllNotesThunk,
  copySelection,
  cutSelection,
  pasteAtPlayhead,
  duplicateSelection,
  nudgeSelected,
  transposeSelected,
  undo,
  redo,
} from '@/thunks/editingThunks'
import { exportMidi, importMidiFile } from '@/thunks/projectThunks'
import { openMidiPicker } from '@/midi/filePicker'


export interface ShortcutContext {
  dispatch: AppDispatch
  getState: () => RootState
}

export interface Shortcut {

  /** event.key (case-insensitive for letters), or special names. */
  key:         string
  mod?:        boolean // Cmd on macOS / Ctrl elsewhere
  shift?:      boolean
  description: string
  run:         (ctx: ShortcutContext) => void
}

// Ableton Live default-inspired mappings.
export const SHORTCUTS: Shortcut[] = [
  // Tools / draw mode
  { key:         'b',
    description: 'Toggle Draw mode',
    run:         ({ dispatch, getState }) =>
      dispatch(setTool(getState().tool.active === 'draw' ? 'select' : 'draw')) },
  { key: 'escape', description: 'Select tool', run: ({ dispatch }) => dispatch(setTool('select')) },

  // Transport
  { key:         ' ',
    description: 'Play / Stop',
    run:         ({ dispatch, getState }) => {
      if (getState().transport.isPlaying) {
        dispatch(stop())
        dispatch(seek(getState().transport.loop.enabled ? getState().transport.loop.startTicks : 0))
      }
      else
        dispatch(togglePlay())
    } },
  { key: 'l', mod: true, description: 'Toggle Loop', run: ({ dispatch }) => dispatch(toggleLoop()) },

  // File
  { key:         'o',
    mod:         true,
    description: 'Open MIDI file',
    run:         ({ dispatch }) => {
      void openMidiPicker().then(file => {
        if (file)
          dispatch(importMidiFile(file))
      })
    } },
  { key: 's', mod: true, description: 'Save MIDI file', run: ({ dispatch }) => dispatch(exportMidi()) },

  // Editing
  { key: 'delete', description: 'Delete selected', run: ({ dispatch }) => dispatch(deleteSelected()) },
  { key: 'backspace', description: 'Delete selected', run: ({ dispatch }) => dispatch(deleteSelected()) },
  { key: 'a', mod: true, description: 'Select all', run: ({ dispatch }) => dispatch(selectAllNotesThunk()) },
  { key: 'c', mod: true, description: 'Copy', run: ({ dispatch }) => dispatch(copySelection()) },
  { key: 'x', mod: true, description: 'Cut', run: ({ dispatch }) => dispatch(cutSelection()) },
  { key: 'v', mod: true, description: 'Paste', run: ({ dispatch }) => dispatch(pasteAtPlayhead()) },
  { key: 'd', mod: true, description: 'Duplicate', run: ({ dispatch }) => dispatch(duplicateSelection()) },
  { key: 'z', mod: true, description: 'Undo', run: ({ dispatch }) => dispatch(undo()) },
  { key: 'z', mod: true, shift: true, description: 'Redo', run: ({ dispatch }) => dispatch(redo()) },

  // Nudge / transpose
  { key: 'arrowleft', mod: true, description: 'Nudge earlier', run: ({ dispatch }) => dispatch(nudgeSelected(-1)) },
  { key: 'arrowright', mod: true, description: 'Nudge later', run: ({ dispatch }) => dispatch(nudgeSelected(1)) },
  { key: 'arrowup', description: 'Transpose up', run: ({ dispatch }) => dispatch(transposeSelected(1)) },
  { key: 'arrowdown', description: 'Transpose down', run: ({ dispatch }) => dispatch(transposeSelected(-1)) },
  { key: 'arrowup', shift: true, description: 'Transpose octave up', run: ({ dispatch }) => dispatch(transposeSelected(12)) },
  { key: 'arrowdown', shift: true, description: 'Transpose octave down', run: ({ dispatch }) => dispatch(transposeSelected(-12)) },

  // Grid
  { key: '1', mod: true, description: 'Narrower grid', run: ({ dispatch }) => dispatch(finerGrid()) },
  { key: '2', mod: true, description: 'Wider grid', run: ({ dispatch }) => dispatch(coarserGrid()) },
  { key: '3', mod: true, description: 'Triplet grid', run: ({ dispatch }) => dispatch(toggleTriplet()) },
  { key: '4', mod: true, description: 'Toggle snap', run: ({ dispatch }) => dispatch(toggleSnap()) },

  // Zoom (anchored at current scroll position)
  { key:         '+',
    description: 'Zoom in',
    run:         ({ dispatch, getState }) =>
      dispatch(zoomX({ factor: 1.2, anchorTicks: getState().viewport.scrollTicks })) },
  { key:         '=',
    description: 'Zoom in',
    run:         ({ dispatch, getState }) =>
      dispatch(zoomX({ factor: 1.2, anchorTicks: getState().viewport.scrollTicks })) },
  { key:         '-',
    description: 'Zoom out',
    run:         ({ dispatch, getState }) =>
      dispatch(zoomX({ factor: 1 / 1.2, anchorTicks: getState().viewport.scrollTicks })) },
]

export const isMac =
  typeof navigator !== 'undefined' && (/Mac|iPhone|iPad/).test(navigator.platform)

/** Match a keyboard event to a shortcut. */
export function matchShortcut (e: KeyboardEvent): Shortcut | undefined {
  const key = e.key.toLowerCase()
  const mod = isMac ? e.metaKey : e.ctrlKey
  return SHORTCUTS.find(
    s =>
      s.key === key &&
      !!s.mod === mod &&
      !!s.shift === e.shiftKey,
  )
}
