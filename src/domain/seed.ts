import { PPQ } from './constants'
import type { Note } from './types'

// A short demo phrase so the editor and playback are non-empty on first load.
const STEP    = PPQ / 2 // eighth notes
const pitches = [ 60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72 ]

export const seedNotes: Note[] = pitches.map((pitch, i) => ({
  id:       `seed-${i}`,
  pitch,
  start:    i * STEP,
  duration: STEP,
  velocity: 90,
}))
