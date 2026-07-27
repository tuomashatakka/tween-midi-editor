import type { AudioEngine } from './AudioEngine'

// A module-level handle to the live AudioEngine so non-transport UI (click-to-
// preview, play-on-draw) can audition notes without threading the engine through
// React props. The bridge registers the engine on mount and clears it on unmount.
let active: AudioEngine | null = null

export const setActiveEngine = (engine: AudioEngine | null): void => {
  active = engine
}

/** The live engine, for side-effect layers that need more than a preview. */
export const getActiveEngine = (): AudioEngine | null => active

export const playPreview = (pitch: number, velocity = 100): void => {
  active?.previewNote(pitch, velocity)
}

/** Sustained live-play notes (MIDI thru), released on key-up. */
export const previewNoteOn = (pitch: number, velocity = 100): void => {
  active?.noteOn(pitch, velocity)
}

export const previewNoteOff = (pitch: number): void => {
  active?.noteOff(pitch)
}

export const panicPreview = (): void => {
  active?.panic()
}
