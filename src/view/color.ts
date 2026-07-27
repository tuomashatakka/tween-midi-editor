// Pure hex-colour helpers for deriving per-track shades. No DOM, no canvas.

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export const isHexColor = (value: string): boolean => HEX_RE.test(value)

const clampByte = (n: number): number => Math.max(0, Math.min(255, Math.round(n)))

/** Expand #abc to [0xaa, 0xbb, 0xcc]; returns null for anything unparseable. */
const parseHex = (hex: string): [ number, number, number ] | null => {
  if (!isHexColor(hex))
    return null

  const body = hex.slice(1)
  const full = body.length === 3
    ? body.split('').map(c => c + c)
      .join('')
    : body
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

const toHex = (rgb: [ number, number, number ]): string =>
  '#' + rgb.map(c => clampByte(c).toString(16)
    .padStart(2, '0')).join('')

/**
 * Move a colour toward black by `amount` (0 = unchanged, 1 = black). Invalid
 * input passes through unchanged so a user-entered colour can never break a draw.
 */
export const darken = (hex: string, amount: number): string => {
  const rgb = parseHex(hex)
  if (!rgb)
    return hex

  const t = Math.max(0, Math.min(1, amount))
  return toHex([ rgb[0] * (1 - t), rgb[1] * (1 - t), rgb[2] * (1 - t) ])
}
