// Pure hit-testing against rendered note rectangles.

import { RESIZE_EDGE_PX } from '@/domain/constants'
import type { Note, NoteId } from '@/domain/types'
import { noteRect, pointInRect, rectsIntersect } from './coords'
import type { Rect, Viewport } from './coords'


export type HitEdge = 'body' | 'resize-right'

export interface NoteHit {
  id:   NoteId
  edge: HitEdge
}

/**
 * Find the top-most note under a point. Notes are tested last-first so the most
 * recently added (drawn on top) wins. Returns null when nothing is hit.
 */
export const hitTestNote = (
  px: number,
  py: number,
  notes: Note[],
  vp: Viewport,
): NoteHit | null => {
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i]
    const r    = noteRect(note, vp)
    if (!pointInRect(px, py, r))
      continue

    const edge: HitEdge =
      px >= r.x + r.w - RESIZE_EDGE_PX && r.w > RESIZE_EDGE_PX * 2
        ? 'resize-right'
        : 'body'
    return { id: note.id, edge }
  }
  return null
}

/** All notes whose rectangle intersects the given selection rectangle. */
export const notesInRect = (
  rect: Rect,
  notes: Note[],
  vp: Viewport,
): NoteId[] =>
  notes.filter(n => rectsIntersect(noteRect(n, vp), rect)).map(n => n.id)
