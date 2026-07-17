import { describe, expect, it } from 'vitest'
import { resolveWheelIntent } from './wheelIntent'
import type { WheelInput } from './wheelIntent'


const wheel = (overrides: Partial<WheelInput>): WheelInput => ({
  deltaX:   0,
  deltaY:   0,
  ctrlKey:  false,
  metaKey:  false,
  altKey:   false,
  shiftKey: false,
  ...overrides,
})

describe('resolveWheelIntent', () => {
  it('zooms X on plain vertical wheel', () => {
    const intent = resolveWheelIntent(wheel({ deltaY: -100 }))
    expect(intent.kind).toBe('zoomX')
  })

  it('zoom factor is > 1 for wheel up (negative deltaY) and < 1 for wheel down', () => {
    const zoomIn  = resolveWheelIntent(wheel({ deltaY: -100 }))
    const zoomOut = resolveWheelIntent(wheel({ deltaY: 100 }))
    if (zoomIn.kind !== 'zoomX' || zoomOut.kind !== 'zoomX')
      throw new Error('expected zoomX intents')
    expect(zoomIn.factor).toBeGreaterThan(1)
    expect(zoomOut.factor).toBeLessThan(1)
    // Symmetric: zooming in then out by the same delta lands at 1.
    expect(zoomIn.factor * zoomOut.factor).toBeCloseTo(1)
  })

  it('zooms X with ctrl (trackpad pinch) regardless of other axes', () => {
    const intent = resolveWheelIntent(wheel({ deltaY: 50, deltaX: 80, ctrlKey: true }))
    expect(intent.kind).toBe('zoomX')
  })

  it('zooms X with meta', () => {
    expect(resolveWheelIntent(wheel({ deltaY: 10, metaKey: true })).kind).toBe('zoomX')
  })

  it('zooms Y with alt', () => {
    expect(resolveWheelIntent(wheel({ deltaY: 10, altKey: true })).kind).toBe('zoomY')
  })

  it('pans with shift, passing both deltas through inverted', () => {
    const intent = resolveWheelIntent(wheel({ deltaY: 40, deltaX: 8, shiftKey: true }))
    expect(intent).toEqual({ kind: 'pan', dxPx: -8, dyPx: -40 })
  })

  it('pans horizontally when the horizontal delta dominates (trackpad swipe)', () => {
    const intent = resolveWheelIntent(wheel({ deltaX: 90, deltaY: 12 }))
    expect(intent).toEqual({ kind: 'pan', dxPx: -90, dyPx: 0 })
  })

  it('prefers zoom when the vertical delta dominates', () => {
    expect(resolveWheelIntent(wheel({ deltaX: 12, deltaY: 90 })).kind).toBe('zoomX')
  })

  it('ctrl wins over alt and shift', () => {
    const intent = resolveWheelIntent(wheel({ deltaY: 10, ctrlKey: true, altKey: true, shiftKey: true }))
    expect(intent.kind).toBe('zoomX')
  })
})
