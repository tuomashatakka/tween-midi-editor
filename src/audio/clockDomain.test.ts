import { describe, expect, it } from 'vitest'
import { ctxToPerf, perfToCtx } from './clockDomain'
import type { ClockPair } from './clockDomain'


const pair: ClockPair = { perfMs: 10_000, ctxSec: 4 }

describe('clock domain conversion', () => {
  it('maps the sampled instant to itself', () => {
    expect(perfToCtx(pair.perfMs, pair)).toBe(pair.ctxSec)
    expect(ctxToPerf(pair.ctxSec, pair)).toBe(pair.perfMs)
  })

  it('converts seconds to milliseconds forwards', () => {
    expect(ctxToPerf(4.25, pair)).toBe(10_250)
    expect(perfToCtx(10_250, pair)).toBe(4.25)
  })

  it('handles instants before the sample', () => {
    expect(ctxToPerf(3.5, pair)).toBe(9_500)
    expect(perfToCtx(9_500, pair)).toBe(3.5)
  })

  it('round-trips', () => {
    for (const sec of [ 0, 1.234, 4, 99.5 ])
      expect(perfToCtx(ctxToPerf(sec, pair), pair)).toBeCloseTo(sec, 9)
  })
})
