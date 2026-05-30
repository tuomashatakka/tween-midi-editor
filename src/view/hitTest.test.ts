import { describe, expect, it } from 'vitest'
import { hitTestNote, notesInRect } from './hitTest'
import { noteRect, type Viewport } from './coords'
import type { Note } from '@/domain/types'

const vp: Viewport = {
  pxPerTick: 0.1,
  rowHeight: 16,
  scrollTicks: 0,
  scrollPitch: 84,
  width: 800,
  height: 600,
  keyboardWidth: 64,
  rulerHeight: 28,
}

const note: Note = { id: 'n1', pitch: 60, start: 0, duration: 960, velocity: 100 }

describe('hit testing', () => {
  it('hits a note body', () => {
    const r = noteRect(note, vp)
    const hit = hitTestNote(r.x + 10, r.y + 4, [note], vp)
    expect(hit).toEqual({ id: 'n1', edge: 'body' })
  })

  it('detects the resize edge near the right border', () => {
    const r = noteRect(note, vp)
    const hit = hitTestNote(r.x + r.w - 2, r.y + 4, [note], vp)
    expect(hit?.edge).toBe('resize-right')
  })

  it('returns null when nothing is under the point', () => {
    expect(hitTestNote(5, 5, [note], vp)).toBeNull()
  })

  it('returns the top-most (last) note on overlap', () => {
    const a: Note = { ...note, id: 'a' }
    const b: Note = { ...note, id: 'b' }
    const r = noteRect(a, vp)
    expect(hitTestNote(r.x + 10, r.y + 4, [a, b], vp)?.id).toBe('b')
  })

  it('selects notes intersecting a marquee rect', () => {
    const r = noteRect(note, vp)
    const ids = notesInRect({ x: r.x - 5, y: r.y - 5, w: 20, h: 20 }, [note], vp)
    expect(ids).toEqual(['n1'])
  })
})
