import type { AppStore } from '@/store/store'
import { seek, setPosition, stop } from '@/store/slices/transportSlice'
import { selectAudibleNotes } from '@/store/selectors/trackSelectors'
import { selectRouting } from '@/store/selectors/midiSelectors'
import { AudioEngine } from './AudioEngine'
import { setActiveEngine } from './engine'

/**
 * Side-effect layer connecting transport state in the store to the AudioEngine.
 * Note data flows one way (store -> engine); the engine only writes the playhead
 * position back via setPosition.
 */
export function createAudioBridge (store: AppStore) {
  let lastEnginePos = -1

  const engine = new AudioEngine({
    // Mute/solo is derived data, so it is a selector rather than engine state.
    getNotes:        () => selectAudibleNotes(store.getState()),
    // A track routed to a hardware port must not also sound on the synth.
    playsInternally: note => !selectRouting(store.getState())[note.trackId]?.outputId,
    getBpm:          () => store.getState().transport.bpm,
    getLoop:         () => store.getState().transport.loop,
    getClipEnd:      () => store.getState().transport.clipEndTicks,
    metronome:       {
      // The count-in is useless without a click, so recording forces it on.
      isEnabled: () =>
        store.getState().transport.metronome || store.getState().recording.countingIn,
      getTimeSignature: () => store.getState().transport.timeSignature,
    },
    onPosition: ticks => {
      lastEnginePos = ticks
      store.dispatch(setPosition(ticks))
    },
    onClipEnd: () => {
      store.dispatch(stop())
      store.dispatch(seek(0))
    },
  })

  setActiveEngine(engine)

  let prevPlaying = false
  let prevBpm     = store.getState().transport.bpm

  const unsubscribe = store.subscribe(() => {
    const { isPlaying, bpm, positionTicks } = store.getState().transport

    if (isPlaying && !prevPlaying)
      engine.start(positionTicks); else if (!isPlaying && prevPlaying)
      engine.stop(); else if (isPlaying) {
      if (bpm !== prevBpm)
        engine.reanchorForBpm()
      // A position change the engine did not author means a user seek.
      else if (positionTicks !== lastEnginePos)
        engine.start(positionTicks)
    }

    prevPlaying = isPlaying
    prevBpm = bpm
  })

  return () => {
    unsubscribe()
    setActiveEngine(null)
    engine.dispose()
  }
}
