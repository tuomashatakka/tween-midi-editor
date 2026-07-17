// Variable-length quantity encoding used by Standard MIDI Files.

/** Encode a non-negative integer as a MIDI variable-length quantity. */
export function writeVarLen (n: number): number[] {
  let value = Math.max(0, Math.floor(n))
  const out = [ value & 0x7f ]
  value >>>= 7
  while (value > 0) {
    out.unshift(value & 0x7f | 0x80)
    value >>>= 7
  }
  return out
}

/** Decode a variable-length quantity; returns the value and the next offset. */
type ReadVarLenReturnType = { value: number; next: number }

export function readVarLen (bytes: Uint8Array, offset: number): ReadVarLenReturnType {
  let value = 0
  let i     = offset
  for (;;) {
    if (i >= bytes.length)
      throw new Error('Unexpected end of data while reading variable-length quantity')

    const byte = bytes[i]
    value      = value * 128 + (byte & 0x7f)
    i         += 1
    if ((byte & 0x80) === 0)
      break
  }
  return { value, next: i }
}
