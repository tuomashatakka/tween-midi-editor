import { useState } from 'react'
import { Toolbar } from './Toolbar'
import { TransportControls } from './TransportControls'
import { PianoRoll } from './PianoRoll/PianoRoll'
import { PreferencesPanel } from './PreferencesPanel'
import { useKeyboardShortcuts } from '@/keymap/useKeyboardShortcuts'
import { useAudioBridge } from '@/audio/useAudioBridge'
import { useMidiDrop } from './useMidiDrop'


export const App = () => {
  const [ preferencesOpen, setPreferencesOpen ] = useState(false)

  useKeyboardShortcuts()
  useAudioBridge()
  useMidiDrop()

  return <div className="app">
    <header className="topbar">
      <Toolbar onOpenPreferences={ () => setPreferencesOpen(true) } />
      <TransportControls />
    </header>

    <main className="editor">
      <PianoRoll />

      {preferencesOpen ? <PreferencesPanel onClose={ () => setPreferencesOpen(false) } /> : null
      }
    </main>
  </div>
}
