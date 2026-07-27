import { nanoid } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from '@/store/store'
import { addNotes } from '@/store/slices/notesSlice'
import { replaceRangeNotes } from '@/store/documentActions'
import {
  startRecording,
  stopRecording,
} from '@/store/slices/recordingSlice'
import { play, seek } from '@/store/slices/transportSlice'
import { selectRecordTargets } from '@/store/selectors/midiSelectors'
import { selectEffectiveSnapTicks } from '@/store/selectors/viewportSelectors'
import { divisionTicks, ticksPerBar } from '@/domain/time'
import { quantizeNotes } from '@/domain/quantize'
import { noteEnd } from '@/domain/time'
import type { Note } from '@/domain/types'
import type { RecordedNote } from '@/midi/io/NoteRecorder'
import { finishActiveRecording } from '@/midi/io/recordBridge'


type Thunk = (dispatch: AppDispatch, getState: () => RootState) => void

/**
 * Arm the transport and start a take. A count-in rewinds the playhead by whole
 * bars; events landing before the punch-in point are discarded by the bridge.
 */
export const beginRecording = (): Thunk => (dispatch, getState) => {
  const state        = getState()
  const punchInTicks = state.transport.positionTicks
  const bars         = state.recording.countInBars
  const countingIn   = bars > 0 && !state.transport.isPlaying

  if (countingIn)
    dispatch(seek(Math.max(0, punchInTicks - bars * ticksPerBar(state.transport.timeSignature))))

  dispatch(startRecording({ punchInTicks, countingIn }))
  // Recording always implies a rolling transport.
  if (!state.transport.isPlaying)
    dispatch(play())
}

/**
 * Commit a take. One dispatch, so redux-undo records the whole thing as a
 * single history entry — undo removes the take, not one note at a time.
 */
export const commitRecordedNotes = (recorded: RecordedNote[]): Thunk =>
  (dispatch, getState) => {
    if (recorded.length === 0)
      return

    const state = getState()
    const step  = state.recording.quantizeInput
      ? selectEffectiveSnapTicks(state) || divisionTicks(state.tool.division, state.tool.triplet)
      : 0

    const prepared = step > 0
      ? quantizeNotes(recorded, { stepTicks: step })
      : recorded

    const notes: Note[] = prepared.map(n => ({ ...n, id: nanoid() }))

    if (state.recording.mode === 'replace') {
      const trackIds = [ ...new Set(notes.map(n => n.trackId)) ]
      dispatch(replaceRangeNotes({
        trackIds,
        fromTick: Math.min(...notes.map(n => n.start)),
        toTick:   Math.max(...notes.map(noteEnd)),
        notes,
      }))
      return
    }

    dispatch(addNotes(notes))
  }

export const finishRecording = (recorded: RecordedNote[]): Thunk => dispatch => {
  dispatch(commitRecordedNotes(recorded))
  dispatch(stopRecording())
}

export const toggleRecording = (): Thunk => (dispatch, getState) => {
  if (getState().recording.isRecording) {
    // The record bridge owns the in-flight take, so it closes and commits it.
    finishActiveRecording()
    dispatch(stopRecording())
    return
  }
  dispatch(beginRecording())
}

/** True when at least one track can receive input. */
export const canRecord = (state: RootState): boolean =>
  selectRecordTargets(state).length > 0
