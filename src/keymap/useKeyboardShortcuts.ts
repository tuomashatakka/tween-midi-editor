import { useEffect } from 'react'
import { useAppStore } from '@/store/hooks'
import { matchShortcut } from './keymap'

/** Attaches a single window keydown listener that dispatches matched shortcuts. */
export function useKeyboardShortcuts() {
  const store = useAppStore()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing into form fields.
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const shortcut = matchShortcut(e)
      if (!shortcut) return
      e.preventDefault()
      shortcut.run({ dispatch: store.dispatch, getState: store.getState })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store])
}
