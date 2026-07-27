import { describe, expect, it } from 'vitest'
import {
  allSoundOffBytes,
  CLOCK_BYTE,
  CONTINUE_BYTE,
  decodeMidiMessage,
  isRealtime,
  noteOffBytes,
  noteOnBytes,
  songPositionBytes,
  START_BYTE,
  STOP_BYTE,
} from './messages'


describe('decodeMidiMessage — channel messages', () => {
  it('decodes note on', () => {
    expect(decodeMidiMessage([ 0x92, 60, 100 ]))
      .toEqual({ kind: 'noteOn', channel: 2, pitch: 60, velocity: 100 })
  })

  it('decodes note off', () => {
    expect(decodeMidiMessage([ 0x81, 64, 40 ]))
      .toEqual({ kind: 'noteOff', channel: 1, pitch: 64, velocity: 40 })
  })

  it('treats note on with velocity 0 as note off', () => {
    expect(decodeMidiMessage([ 0x90, 60, 0 ]))
      .toEqual({ kind: 'noteOff', channel: 0, pitch: 60, velocity: 0 })
  })

  it('decodes control change, program change and pressures', () => {
    expect(decodeMidiMessage([ 0xb0, 7, 90 ]))
      .toEqual({ kind: 'controlChange', channel: 0, controller: 7, value: 90 })
    expect(decodeMidiMessage([ 0xc3, 12 ]))
      .toEqual({ kind: 'programChange', channel: 3, program: 12 })
    expect(decodeMidiMessage([ 0xd0, 55 ]))
      .toEqual({ kind: 'channelPressure', channel: 0, pressure: 55 })
    expect(decodeMidiMessage([ 0xa0, 60, 20 ]))
      .toEqual({ kind: 'polyPressure', channel: 0, pitch: 60, pressure: 20 })
  })

  it.each([
    [ 0, 0, -8192 ], // minimum
    [ 0x00, 0x40, 0 ], // centre
    [ 0x7f, 0x7f, 8191 ], // maximum
  ])('decodes 14-bit pitch bend %i/%i', (lsb, msb, expected) => {
    expect(decodeMidiMessage([ 0xe0, lsb, msb ]))
      .toEqual({ kind: 'pitchBend', channel: 0, value: expected })
  })
})

describe('decodeMidiMessage — system messages', () => {
  it.each([
    [ CLOCK_BYTE, 'clock' ],
    [ START_BYTE, 'start' ],
    [ CONTINUE_BYTE, 'continue' ],
    [ STOP_BYTE, 'stop' ],
    [ 0xfe, 'activeSensing' ],
    [ 0xff, 'systemReset' ],
  ])('decodes realtime byte 0x%s', (byte, kind) => {
    expect(decodeMidiMessage([ byte as number ])).toEqual({ kind })
  })

  it('decodes a song position pointer', () => {
    expect(decodeMidiMessage([ 0xf2, 0x08, 0x01 ]))
      .toEqual({ kind: 'songPosition', sixteenths: 136 })
  })

  it('round-trips a song position', () => {
    for (const beats of [ 0, 1, 127, 128, 4095, 0x3fff ])
      expect(decodeMidiMessage(songPositionBytes(beats)))
        .toEqual({ kind: 'songPosition', sixteenths: beats })
  })
})

describe('decodeMidiMessage — malformed input', () => {
  it.each([
    [ 'empty', []],
    [ 'a leading data byte (running status)', [ 60, 100 ]],
    [ 'a truncated note on', [ 0x90, 60 ]],
    [ 'a truncated program change', [ 0xc0 ]],
    [ 'a truncated song position', [ 0xf2, 1 ]],
    [ 'sysex', [ 0xf0, 0x7e, 0xf7 ]],
  ])('returns null for %s', (_label, bytes) => {
    expect(decodeMidiMessage(bytes as number[])).toBeNull()
  })
})

describe('isRealtime', () => {
  it('separates system messages from channel messages', () => {
    expect(isRealtime({ kind: 'clock' })).toBe(true)
    expect(isRealtime({ kind: 'songPosition', sixteenths: 4 })).toBe(true)
    expect(isRealtime({ kind: 'noteOn', channel: 0, pitch: 60, velocity: 1 })).toBe(false)
  })
})

describe('byte builders', () => {
  it('encode notes on the given channel and decode back', () => {
    expect(decodeMidiMessage(noteOnBytes(5, 72, 90)))
      .toEqual({ kind: 'noteOn', channel: 5, pitch: 72, velocity: 90 })
    expect(decodeMidiMessage(noteOffBytes(5, 72)))
      .toEqual({ kind: 'noteOff', channel: 5, pitch: 72, velocity: 0 })
  })

  it('clamp channel, pitch and velocity into range', () => {
    expect(noteOnBytes(99, 300, 999)).toEqual([ 0x9f, 127, 127 ])
    expect(noteOnBytes(-3, -7, -7)).toEqual([ 0x90, 0, 1 ])
  })

  it('never emits a zero velocity note on, which would read as note off', () => {
    expect(noteOnBytes(0, 60, 0)[2]).toBe(1)
  })

  it('builds the panic trio on the right channel', () => {
    expect(allSoundOffBytes(3)).toEqual([
      [ 0xb3, 120, 0 ],
      [ 0xb3, 123, 0 ],
      [ 0xb3, 64, 0 ],
    ])
  })
})
