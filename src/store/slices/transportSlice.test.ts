import { describe, expect, it } from 'vitest'
import { ticksPerBar, ticksPerBeat } from '@/domain/time'
import { DEFAULT_TIME_SIGNATURE } from '@/domain/constants'
import reducer, { setClipEnd, setLoop, toggleLoop } from './transportSlice'


const initial = reducer(undefined, { type: '@@INIT' })

describe('transportSlice', () => {
  it('defaults the clip end and loop end to four bars', () => {
    const fourBars = ticksPerBar(DEFAULT_TIME_SIGNATURE) * 4
    expect(initial.clipEndTicks).toBe(fourBars)
    expect(initial.loop.endTicks).toBe(fourBars)
  })

  describe('setLoop', () => {
    it('applies partial payloads', () => {
      const next = reducer(initial, setLoop({ startTicks: 960 }))
      expect(next.loop.startTicks).toBe(960)
      expect(next.loop.endTicks).toBe(initial.loop.endTicks)
      expect(next.loop.enabled).toBe(initial.loop.enabled)
    })

    it('clamps a negative start to zero', () => {
      const next = reducer(initial, setLoop({ startTicks: -50 }))
      expect(next.loop.startTicks).toBe(0)
    })

    it('keeps the end strictly after the start', () => {
      const next = reducer(initial, setLoop({ startTicks: 1000, endTicks: 900 }))
      expect(next.loop.startTicks).toBe(1000)
      expect(next.loop.endTicks).toBe(1001)
    })

    it('rounds fractional ticks', () => {
      const next = reducer(initial, setLoop({ startTicks: 10.4, endTicks: 20.6 }))
      expect(next.loop.startTicks).toBe(10)
      expect(next.loop.endTicks).toBe(21)
    })
  })

  describe('toggleLoop', () => {
    it('flips the enabled flag', () => {
      const on = reducer(initial, toggleLoop())
      expect(on.loop.enabled).toBe(!initial.loop.enabled)
      expect(reducer(on, toggleLoop()).loop.enabled).toBe(initial.loop.enabled)
    })
  })

  describe('setClipEnd', () => {
    it('sets and rounds the clip end', () => {
      const next = reducer(initial, setClipEnd(1234.6))
      expect(next.clipEndTicks).toBe(1235)
    })

    it('enforces a minimum of one beat', () => {
      const beat = ticksPerBeat(initial.timeSignature)
      const next = reducer(initial, setClipEnd(1))
      expect(next.clipEndTicks).toBe(beat)
    })
  })
})
