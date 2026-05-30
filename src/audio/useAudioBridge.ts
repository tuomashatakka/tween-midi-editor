import { useEffect } from 'react'
import { useAppStore } from '@/store/hooks'
import { createAudioBridge } from './transportBridge'

/** Mounts the audio side-effect bridge for the lifetime of the app. */
export function useAudioBridge() {
  const store = useAppStore()
  useEffect(() => createAudioBridge(store), [store])
}
