import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { importMidiFile } from '@/thunks/projectThunks'


const isMidiFile = (file: File): boolean => (/\.midi?$/i).test(file.name)

/** Window-level drag-and-drop of .mid/.midi files to import them. */
export function useMidiDrop () {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      // Required so the browser allows dropping instead of navigating away.
      e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()

      const file = [ ...e.dataTransfer?.files ?? [] ].find(isMidiFile)
      if (file)
        dispatch(importMidiFile(file))
    }

    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [ dispatch ])
}
