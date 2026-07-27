import { describe, expect, it } from 'vitest'
import { darken, isHexColor } from './color'
import { TRACK_PALETTE, trackColorAt } from './trackPalette'
import { theme } from './theme'


describe('isHexColor', () => {
  it('accepts 3- and 6-digit hex in either case', () => {
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('#5B8DEF')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isHexColor('5b8def')).toBe(false)
    expect(isHexColor('#12345')).toBe(false)
    expect(isHexColor('rgb(1,2,3)')).toBe(false)
  })
})

describe('darken', () => {
  it('leaves a colour unchanged at amount 0', () => {
    expect(darken('#5b8def', 0)).toBe('#5b8def')
  })

  it('halves each channel at amount 0.5', () => {
    expect(darken('#804020', 0.5)).toBe('#402010')
  })

  it('reaches black at amount 1', () => {
    expect(darken('#5b8def', 1)).toBe('#000000')
  })

  it('expands shorthand hex', () => {
    expect(darken('#abc', 0)).toBe('#aabbcc')
  })

  it('clamps out-of-range amounts', () => {
    expect(darken('#5b8def', -2)).toBe('#5b8def')
    expect(darken('#5b8def', 9)).toBe('#000000')
  })

  it('passes invalid input through untouched', () => {
    expect(darken('not-a-colour', 0.5)).toBe('not-a-colour')
  })
})

describe('trackColorAt', () => {
  it('starts at theme.note so a single-track project is unchanged', () => {
    expect(trackColorAt(0)).toBe(theme.note)
  })

  it('cycles through the palette', () => {
    expect(trackColorAt(TRACK_PALETTE.length)).toBe(TRACK_PALETTE[0])
    expect(trackColorAt(TRACK_PALETTE.length + 2)).toBe(TRACK_PALETTE[2])
  })

  it('handles negative indices', () => {
    expect(trackColorAt(-1)).toBe(TRACK_PALETTE[TRACK_PALETTE.length - 1])
  })

  it('avoids amber, which is reserved for the selection highlight', () => {
    // theme.noteSelected is #ffd166. Reject any palette entry that is both
    // bright and red-dominant-with-high-green, i.e. reads as yellow/amber.
    for (const hex of TRACK_PALETTE) {
      const r       = parseInt(hex.slice(1, 3), 16)
      const g       = parseInt(hex.slice(3, 5), 16)
      const b       = parseInt(hex.slice(5, 7), 16)
      const isAmber = r > 0xd0 && g > 0xa0 && b < 0x90
      expect(isAmber).toBe(false)
    }
  })
})
