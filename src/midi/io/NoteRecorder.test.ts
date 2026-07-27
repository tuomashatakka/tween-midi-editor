import { describe, expect, it } from 'vitest'
import { NoteRecorder } from './NoteRecorder'
import type { RecorderEvent } from './NoteRecorder'
import { PPQ } from '@/domain/constants'


const event = (over: Partial<RecorderEvent> = {}): RecorderEvent => ({
  trackId:  't1',
  channel:  0,
  pitch:    60,
  velocity: 100,
  tick:     0,
  ...over,
})

describe('NoteRecorder', () => {
  it('pairs a note on with its note off', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ tick: 0 }))
    rec.noteOff(event({ tick: 480 }))

    expect(rec.drain()).toEqual([
      { trackId: 't1', pitch: 60, start: 0, duration: 480, velocity: 100 },
    ])
  })

  it('keeps overlapping pitches independent', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ pitch: 60, tick: 0 }))
    rec.noteOn(event({ pitch: 64, tick: 120 }))
    rec.noteOff(event({ pitch: 60, tick: 480 }))
    rec.noteOff(event({ pitch: 64, tick: 600 }))

    expect(rec.drain()).toEqual([
      { trackId: 't1', pitch: 60, start: 0, duration: 480, velocity: 100 },
      { trackId: 't1', pitch: 64, start: 120, duration: 480, velocity: 100 },
    ])
  })

  it('closes the previous note when the same pitch retriggers', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ tick: 0 }))
    rec.noteOn(event({ tick: 240, velocity: 80 }))
    rec.noteOff(event({ tick: 480 }))

    expect(rec.drain()).toEqual([
      { trackId: 't1', pitch: 60, start: 0, duration: 240, velocity: 100 },
      { trackId: 't1', pitch: 60, start: 240, duration: 240, velocity: 80 },
    ])
  })

  it('ignores a note off with no matching note on', () => {
    const rec = new NoteRecorder()
    expect(rec.noteOff(event({ tick: 100 }))).toBeNull()
    expect(rec.drain()).toEqual([])
  })

  it('closes held notes when the take finishes', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ tick: 100 }))
    expect(rec.heldCount).toBe(1)

    expect(rec.finish(700)).toEqual([
      { trackId: 't1', pitch: 60, start: 100, duration: 600, velocity: 100 },
    ])
    expect(rec.heldCount).toBe(0)
  })

  it('splits a note held across a loop boundary', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ tick: 1600 }))
    rec.wrapAtLoop(1920, 0)
    rec.noteOff(event({ tick: 240 }))

    expect(rec.drain()).toEqual([
      { trackId: 't1', pitch: 60, start: 1600, duration: 320, velocity: 100 },
      { trackId: 't1', pitch: 60, start: 0, duration: 240, velocity: 100 },
    ])
  })

  it('clamps a zero-length note to the minimum duration', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ tick: 500 }))
    rec.noteOff(event({ tick: 500 }))
    expect(rec.drain()[0].duration).toBe(PPQ / 16)
  })

  it('drain keeps held notes open for the next lap', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ pitch: 60, tick: 0 }))
    rec.noteOff(event({ pitch: 60, tick: 100 }))
    rec.noteOn(event({ pitch: 64, tick: 120 }))

    expect(rec.drain()).toHaveLength(1)
    expect(rec.heldCount).toBe(1)
  })

  it('keeps the track id of each armed target, even one containing a colon', () => {
    const rec = new NoteRecorder()
    rec.noteOn(event({ trackId: 'a:b', tick: 0 }))
    rec.noteOn(event({ trackId: 't2', tick: 0 }))

    expect(rec.finish(240).map(n => n.trackId)
      .sort()).toEqual([ 'a:b', 't2' ])
  })
})
