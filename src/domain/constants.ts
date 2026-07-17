import type { GridDivision, TimeSignature } from './types'

// Pulses Per Quarter note. Fixed project constant; divides cleanly by 2,3,4,6,8.
// Changing this later would invalidate any saved data.
export const PPQ = 960

export const MIN_NOTE = 0
export const MAX_NOTE = 127

// Layout constants for the canvas chrome (in CSS pixels).
export const KEYBOARD_WIDTH = 64
export const RULER_HEIGHT = 28

// Resize-edge hit threshold in pixels.
export const RESIZE_EDGE_PX = 6

// Ruler marker (loop edge / clip end) grab tolerance in pixels.
export const RULER_EDGE_TOL_PX = 6
export const RULER_EDGE_TOL_TOUCH_PX = 14

// Minimum finger spread (px) on an axis before a pinch zooms that axis.
export const PINCH_MIN_SPREAD_PX = 24

// Default viewport zoom.
export const DEFAULT_PX_PER_TICK = 80 / PPQ // ~80px per quarter note
export const DEFAULT_ROW_HEIGHT = 16 // px per semitone

export const MIN_PX_PER_TICK = 8 / PPQ
export const MAX_PX_PER_TICK = 800 / PPQ
export const MIN_ROW_HEIGHT = 6
export const MAX_ROW_HEIGHT = 40

export const DEFAULT_DIVISION: GridDivision = 16
export const DEFAULT_BPM = 120
export const DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 }

// Default duration of a note created with the draw tool: one 1/16 note.
export const DEFAULT_NOTE_DURATION = PPQ / 4
