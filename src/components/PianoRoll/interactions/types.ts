import type { NoteId, Ticks } from '@/domain/types'

/**
 * Transient interaction state held in a React ref during an active gesture.
 * It is pure presentation: the store is only mutated on pointer-up.
 */
export type Draft =
  | { kind: 'marquee'; x1: number; y1: number; x2: number; y2: number; additive: boolean } |
  { kind: 'move'; noteIds: NoteId[]; deltaTicks: Ticks; deltaPitch: number } |
  { kind: 'resize'; noteIds: NoteId[]; deltaDuration: Ticks } |
  { kind: 'draw'; pitch: number; start: Ticks; duration: Ticks } |
  null
