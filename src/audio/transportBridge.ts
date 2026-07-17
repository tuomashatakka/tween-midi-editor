import type { AppStore } from '@/store/store'
import { seek, setPosition, stop } from '@/store/slices/transportSlice'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
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
    getNotes:   () => selectAllNotes(store.getState()),
    getBpm:     () => store.getState().transport.bpm,
    getLoop:    () => store.getState().transport.loop,
    getClipEnd: () => store.getState().transport.clipEndTicks,
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
