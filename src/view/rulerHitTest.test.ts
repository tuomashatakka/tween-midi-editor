import { describe, expect, it } from 'vitest'
import type { LoopRegion } from '@/domain/types'
import type { Viewport } from './coords'
import { rulerHitTest } from './rulerHitTest'


// 1 px per tick with no scroll: tickToX(t) = keyboardWidth + t.
const vp: Viewport = {
  pxPerTick:     1,
  rowHeight:     16,
  scrollTicks:   0,
  scrollPitch:   84,
  width:         1000,
  height:        600,
  keyboardWidth: 64,
  rulerHeight:   28,
}

const loop: LoopRegion = { enabled: true, startTicks: 100, endTicks: 300 }
const clipEnd          = 500

const braceY = 5 // inside the upper brace band (0..14)
const seekY  = 20 // lower band

describe('rulerHitTest', () => {
  it('lower band always seeks, even at a loop edge x', () => {
    expect(rulerHitTest(64 + 100, seekY, vp, loop, clipEnd, 'mouse').kind).toBe('seek')
    expect(rulerHitTest(64 + 200, seekY, vp, loop, clipEnd, 'mouse').kind).toBe('seek')
  })

  it('hits loop edges within mouse tolerance', () => {
    expect(rulerHitTest(64 + 104, braceY, vp, loop, clipEnd, 'mouse').kind).toBe('loop-start')
    expect(rulerHitTest(64 + 296, braceY, vp, loop, clipEnd, 'mouse').kind).toBe('loop-end')
  })

  it('uses a wider tolerance for touch', () => {
    expect(rulerHitTest(64 + 112, braceY, vp, loop, clipEnd, 'mouse').kind).toBe('loop-body')
    expect(rulerHitTest(64 + 112, braceY, vp, loop, clipEnd, 'touch').kind).toBe('loop-start')
  })

  it('hits the loop body between the edges', () => {
    expect(rulerHitTest(64 + 200, braceY, vp, loop, clipEnd, 'mouse').kind).toBe('loop-body')
  })

  it('prefers the nearer edge on a tiny loop', () => {
    const tiny: LoopRegion = { enabled: true, startTicks: 100, endTicks: 106 }
    expect(rulerHitTest(64 + 101, braceY, vp, tiny, clipEnd, 'mouse').kind).toBe('loop-start')
    expect(rulerHitTest(64 + 105, braceY, vp, tiny, clipEnd, 'mouse').kind).toBe('loop-end')
  })

  it('hits the clip end marker', () => {
    expect(rulerHitTest(64 + 500, braceY, vp, loop, clipEnd, 'mouse').kind).toBe('clip-end')
  })

  it('loop edge wins when the clip end marker overlaps it', () => {
    expect(rulerHitTest(64 + 300, braceY, vp, loop, 300, 'mouse').kind).toBe('loop-end')
  })

  it('seeks in the brace band outside loop and markers', () => {
    expect(rulerHitTest(64 + 420, braceY, vp, loop, clipEnd, 'mouse').kind).toBe('seek')
  })
})
