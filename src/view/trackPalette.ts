// Categorical colour series for tracks. Kept separate from `theme.ts`, which is
// a flat palette of semantic chrome colours — this is an indexed series, a
// different concept.
//
// Two constraints hold the palette together:
//   * index 0 is exactly `theme.note`, so a default single-track project looks
//     identical to how it did before tracks existed;
//   * no yellow/amber, because `theme.noteSelected` is #ffd166 and selection has
//     to stay the one unambiguous signal on the canvas.

export const TRACK_PALETTE = [
  '#5b8def', // blue (theme.note)
  '#4fc3a1', // teal
  '#e2725b', // terracotta
  '#a78bfa', // violet
  '#3fa9e8', // cyan
  '#e879a8', // pink
  '#7bc74d', // green
  '#c98b3e', // ochre
] as const

/** Palette colour for a track index, cycling and tolerating negative indices. */
export const trackColorAt = (index: number): string => {
  const n = TRACK_PALETTE.length
  const i = Math.trunc(index) % n
  return TRACK_PALETTE[(i + n) % n]
}
