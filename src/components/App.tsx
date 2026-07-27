import { useState } from 'react'
import { Toolbar } from './Toolbar'
import { TransportControls } from './TransportControls'
import { PianoRoll } from './PianoRoll/PianoRoll'
import { PreferencesPanel } from './PreferencesPanel'
import { TrackDrawer } from './TrackDrawer/TrackDrawer'
import { useAppSelector } from '@/store/hooks'
import { useKeyboardShortcuts } from '@/keymap/useKeyboardShortcuts'
import { useAudioBridge } from '@/audio/useAudioBridge'
import { useMidiBridge } from '@/midi/io/useMidiBridge'
import { useMidiDrop } from './useMidiDrop'


export const App = () => {
  const [ preferencesOpen, setPreferencesOpen ] = useState(false)
  const drawerOpen                              = useAppSelector(s => s.tool.trackDrawerOpen)

  useKeyboardShortcuts()
  useAudioBridge()
  // Mounted after the audio bridge so the engine is registered before the MIDI
  // layer reaches for it.
  useMidiBridge()
  useMidiDrop()

  return <div className="app">
    <header className="topbar">
      <Toolbar onOpenPreferences={ () => setPreferencesOpen(true) } />
      <TransportControls />
    </header>

    <main className="editor">
      {drawerOpen ? <TrackDrawer /> : null}
      <PianoRoll />

      {preferencesOpen ? <PreferencesPanel onClose={ () => setPreferencesOpen(false) } /> : null
      }
    </main>
  </div>
}
