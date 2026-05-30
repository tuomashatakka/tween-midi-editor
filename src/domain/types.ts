// Core domain types for the MIDI editor.
// The canonical time unit is the tick (PPQ-based). Pitch is a MIDI note number.
// Nothing in the data model is ever a pixel — pixels are derived in the view layer.

export type Ticks = number // musical position / length, integer
export type MidiNote = number // 0..127
export type Velocity = number // 0..127
export type NoteId = string

export interface Note {
  id:       NoteId
  pitch:    MidiNote
  start:    Ticks
  duration: Ticks
  velocity: Velocity
}

export type ToolKind = 'select' | 'pan' | 'draw' | 'marquee'

// Grid divisions expressed as 1/n notes. Triplet variants are derived separately.
export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32

export interface TimeSignature {
  numerator:   number
  denominator: number
}

export interface LoopRegion {
  enabled:    boolean
  startTicks: Ticks
  endTicks:   Ticks
}
