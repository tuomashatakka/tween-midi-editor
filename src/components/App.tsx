import { Toolbar } from './Toolbar'
import { TransportControls } from './TransportControls'
import { PianoRoll } from './PianoRoll/PianoRoll'
import { useKeyboardShortcuts } from '@/keymap/useKeyboardShortcuts'
import { useAudioBridge } from '@/audio/useAudioBridge'


export const App = () => {
  useKeyboardShortcuts()
  useAudioBridge()

  return <div className="app">
    <header className="topbar">
      <Toolbar />
      <TransportControls />
    </header>

    <main className="editor">
      <PianoRoll />
    </main>
  </div>
}
