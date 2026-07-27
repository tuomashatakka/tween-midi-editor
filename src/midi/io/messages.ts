// Pure MIDI wire-protocol layer: bytes in, discriminated unions out, and byte
// builders for everything we send. Keeping this pure is what lets the rest of
// the live-MIDI layer be thin, untested plumbing.
//
// Web MIDI is specified to deliver complete messages, so the decoder is
// stateless and does not implement running status; a leading data byte is
// treated as malformed rather than silently misread.

import type { MidiChannel, MidiNote, Velocity } from '@/domain/types'


export type MidiChannelMessage =
  | { kind: 'noteOn'; channel: MidiChannel; pitch: MidiNote; velocity: Velocity } |
  { kind: 'noteOff'; channel: MidiChannel; pitch: MidiNote; velocity: Velocity } |
  { kind: 'polyPressure'; channel: MidiChannel; pitch: MidiNote; pressure: number } |
  { kind: 'controlChange'; channel: MidiChannel; controller: number; value: number } |
  { kind: 'programChange'; channel: MidiChannel; program: number } |
  { kind: 'channelPressure'; channel: MidiChannel; pressure: number } |
  { kind: 'pitchBend'; channel: MidiChannel; value: number } // -8192..8191

export type MidiRealtimeMessage =
  | { kind: 'clock' } |
  { kind: 'start' } |
  { kind: 'continue' } |
  { kind: 'stop' } |
  { kind: 'activeSensing' } |
  { kind: 'systemReset' } |
  { kind: 'songPosition'; sixteenths: number }

export type MidiMessage = MidiChannelMessage | MidiRealtimeMessage

export const CLOCK_BYTE = 0xf8
export const START_BYTE = 0xfa
export const CONTINUE_BYTE = 0xfb
export const STOP_BYTE = 0xfc
export const SPP_BYTE = 0xf2
export const ACTIVE_SENSING_BYTE = 0xfe
export const SYSTEM_RESET_BYTE = 0xff

/** MIDI clock resolution: 24 pulses per quarter note. */
export const CLOCK_PPQN = 24

const REALTIME_MESSAGES: Record<number, MidiRealtimeMessage> = {
  [CLOCK_BYTE]:          { kind: 'clock' },
  [START_BYTE]:          { kind: 'start' },
  [CONTINUE_BYTE]:       { kind: 'continue' },
  [STOP_BYTE]:           { kind: 'stop' },
  [ACTIVE_SENSING_BYTE]: { kind: 'activeSensing' },
  [SYSTEM_RESET_BYTE]:   { kind: 'systemReset' },
}

export const isRealtime = (message: MidiMessage): message is MidiRealtimeMessage =>
  !('channel' in message)

export function decodeMidiMessage (bytes: Uint8Array | number[]): MidiMessage | null {
  const status = bytes[0]
  if (status === undefined || status < 0x80)
    return null

  const realtime = REALTIME_MESSAGES[status]
  if (realtime)
    return realtime

  if (status === SPP_BYTE) {
    if (bytes.length < 3)
      return null
    return { kind: 'songPosition', sixteenths: (bytes[2] << 7) + bytes[1] }
  }

  // Any other system message (SysEx, MTC, tune request) is not something we act
  // on, and SysEx in particular is variable-length.
  if (status >= 0xf0)
    return null

  const channel = status & 0x0f
  const kind    = status & 0xf0

  switch (kind) {
    case 0x80: {
      if (bytes.length < 3)
        return null
      return { kind: 'noteOff', channel, pitch: bytes[1], velocity: bytes[2] }
    }
    case 0x90: {
      if (bytes.length < 3)
        return null
      // Note-on with velocity 0 is a note-off by convention, same as smfParse.
      return bytes[2] === 0
        ? { kind: 'noteOff', channel, pitch: bytes[1], velocity: 0 }
        : { kind: 'noteOn', channel, pitch: bytes[1], velocity: bytes[2] }
    }
    case 0xa0: {
      if (bytes.length < 3)
        return null
      return { kind: 'polyPressure', channel, pitch: bytes[1], pressure: bytes[2] }
    }
    case 0xb0: {
      if (bytes.length < 3)
        return null
      return { kind: 'controlChange', channel, controller: bytes[1], value: bytes[2] }
    }
    case 0xc0: {
      if (bytes.length < 2)
        return null
      return { kind: 'programChange', channel, program: bytes[1] }
    }
    case 0xd0: {
      if (bytes.length < 2)
        return null
      return { kind: 'channelPressure', channel, pressure: bytes[1] }
    }
    case 0xe0: {
      if (bytes.length < 3)
        return null
      return { kind: 'pitchBend', channel, value: (bytes[2] << 7) + bytes[1] - 8192 }
    }
    default:
      return null
  }
}

// MIDIOutput.send takes a plain number[], so every builder returns one.

const clamp7       = (n: number): number => Math.max(0, Math.min(127, Math.round(n)))
const clampChannel = (n: number): number => Math.max(0, Math.min(15, Math.round(n)))

export const noteOnBytes = (channel: number, pitch: number, velocity: number): number[] =>
  [ 0x90 | clampChannel(channel), clamp7(pitch), Math.max(1, clamp7(velocity)) ]

export const noteOffBytes = (channel: number, pitch: number): number[] =>
  [ 0x80 | clampChannel(channel), clamp7(pitch), 0 ]

export const controlChangeBytes = (channel: number, controller: number, value: number): number[] =>
  [ 0xb0 | clampChannel(channel), clamp7(controller), clamp7(value) ]

/** Song Position Pointer, in MIDI beats (sixteenth notes), 14-bit LSB first. */
export const songPositionBytes = (sixteenths: number): number[] => {
  const value = Math.max(0, Math.min(0x3fff, Math.round(sixteenths)))
  return [ SPP_BYTE, value & 0x7f, value >> 7 & 0x7f ]
}

/** All-sound-off, all-notes-off and sustain-off: the panic trio. */
export const allSoundOffBytes = (channel: number): number[][] => [
  controlChangeBytes(channel, 120, 0),
  controlChangeBytes(channel, 123, 0),
  controlChangeBytes(channel, 64, 0),
]
