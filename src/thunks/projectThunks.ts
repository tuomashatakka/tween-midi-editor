import { nanoid } from '@reduxjs/toolkit'
import { ActionCreators as UndoActions } from 'redux-undo'
import type { AppDispatch, RootState } from '@/store/store'
import { setAllNotes } from '@/store/slices/notesSlice'
import { markClean, setFileName } from '@/store/slices/projectSlice'
import { clearSelection } from '@/store/slices/selectionSlice'
import {
  seek,
  setBpm,
  setClipEnd,
  setLoop,
  setTimeSignature,
  stop,
} from '@/store/slices/transportSlice'
import { setScroll } from '@/store/slices/viewportSlice'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import { PPQ } from '@/domain/constants'
import { ticksPerBar } from '@/domain/time'
import { encodeSmf } from '@/midi/smfEncode'
import { parseSmf } from '@/midi/smfParse'


type Thunk = (dispatch: AppDispatch, getState: () => RootState) => void

const DEFAULT_FILE_NAME = 'untitled.mid'

/** Last note end rounded up to a whole bar, minimum one bar. */
type TimeSignatureType = { numerator: number; denominator: number }

const clipEndForNotes = (
  lastNoteEnd: number,
  timeSignature: TimeSignatureType,
): number => {
  const bar = ticksPerBar(timeSignature)
  return Math.max(1, Math.ceil(lastNoteEnd / bar)) * bar
}

/**
 * Replace the document with the contents of a parsed MIDI file. Kept
 * synchronous (bytes in) so it is unit-testable without File/Blob APIs.
 */
export const importMidiData = (bytes: Uint8Array, fileName: string): Thunk =>
  (dispatch, getState) => {
    const parsed = parseSmf(bytes, PPQ)

    dispatch(stop())
    dispatch(clearSelection())
    dispatch(setAllNotes(parsed.notes.map(n => ({ ...n, id: nanoid() }))))

    if (parsed.bpm !== undefined)
      dispatch(setBpm(parsed.bpm))
    if (parsed.timeSignature !== undefined)
      dispatch(setTimeSignature(parsed.timeSignature))

    const ts      = getState().transport.timeSignature
    const lastEnd = parsed.notes.reduce((max, n) => Math.max(max, n.start + n.duration), 0)
    const clipEnd = clipEndForNotes(lastEnd, ts)
    dispatch(setClipEnd(clipEnd))
    dispatch(setLoop({ startTicks: 0, endTicks: clipEnd }))
    dispatch(seek(0))
    // Bring the loaded content into view.
    dispatch(setScroll({ scrollTicks: 0 }))

    dispatch(setFileName(fileName))
    // A loaded file is a fresh baseline: undoing into the previous document
    // would desync the file name and dirty flag.
    dispatch(UndoActions.clearHistory())
    dispatch(markClean())
  }

/** Import a picked/dropped .mid file. */
export const importMidiFile = (file: File): Thunk =>
  dispatch => {
    void file.arrayBuffer().then(buffer => {
      try {
        dispatch(importMidiData(new Uint8Array(buffer), file.name))
      }
      catch (err) {
        console.error('MIDI import failed:', err)
      }
    })
  }

/** Serialize the document to SMF and trigger a browser download. */
export const exportMidi = (): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const bytes = encodeSmf({
      notes:         selectAllNotes(state),
      bpm:           state.transport.bpm,
      timeSignature: state.transport.timeSignature,
      ppq:           PPQ,
    })

    const fileName = state.project.fileName ?? DEFAULT_FILE_NAME
    downloadBlob(bytes, fileName)

    dispatch(setFileName(fileName))
    dispatch(markClean())
  }

function downloadBlob (bytes: Uint8Array, fileName: string) {
  const blob = new Blob([ bytes as BlobPart ], { type: 'audio/midi' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
