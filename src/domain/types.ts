// Core domain types for the MIDI editor.
// The canonical time unit is the tick (PPQ-based). Pitch is a MIDI note number.
// Nothing in the data model is ever a pixel — pixels are derived in the view layer.

export type Ticks = number // musical position / length, integer
export type MidiNote = number // 0..127
export type Velocity = number // 0..127
export type NoteId = string
export type TrackId = string
export type MidiChannel = number // 0..15

export interface Note {
  id:       NoteId
  trackId:  TrackId
  pitch:    MidiNote
  start:    Ticks
  duration: Ticks
  velocity: Velocity
}

/**
 * A named, coloured lane of notes bound to one MIDI channel. Tracks live inside
 * the undo history alongside notes, so add/rename/recolour/delete are undoable.
 * Device routing and record-arm are deliberately NOT here — they are
 * machine-specific session state in `midiSlice`, and undo must never re-route
 * audio or re-arm a track.
 */
export interface Track {
  id:      TrackId
  name:    string
  color:   string // '#rrggbb'
  channel: MidiChannel

  muted:   boolean
  soloed:  boolean
  visible: boolean

  /**
   * When false the track is only editable while it is the active track. The
   * drawer's lock switch clears it so several tracks can be edited at once.
   */
  locked: boolean
}

/** Serializable descriptor of a Web MIDI port; live MIDIPort objects never enter the store. */
export interface MidiPortInfo {
  id:           string
  name:         string
  manufacturer: string
  connected:    boolean
}

export type ToolKind = 'select' | 'pan' | 'draw'

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
