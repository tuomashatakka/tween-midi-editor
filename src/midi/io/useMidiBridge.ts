import { useEffect } from 'react'
import { useAppStore } from '@/store/hooks'
import { createMidiBridge } from './midiBridge'

/**
 * Mounts the Web MIDI side-effect bridge for the lifetime of the app. Must be
 * called after `useAudioBridge()` so the engine is registered before the MIDI
 * layer reaches for it.
 */
export function useMidiBridge () {
  const store = useAppStore()
  useEffect(() => createMidiBridge(store), [ store ])
}
