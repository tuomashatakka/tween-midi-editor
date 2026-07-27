import { describe, expect, it } from 'vitest'
import { describePort, findPortByName, resolvePort, samePortList } from './portInfo'
import type { MidiPortInfo } from '@/domain/types'


const info = (over: Partial<MidiPortInfo> & Pick<MidiPortInfo, 'id'>): MidiPortInfo => ({
  name:         'Port',
  manufacturer: '',
  connected:    true,
  ...over,
})

describe('describePort', () => {
  it('coalesces the nullable fields Web MIDI exposes', () => {
    expect(describePort({ id: 'p1', name: null, manufacturer: null, state: 'connected' }))
      .toEqual({ id: 'p1', name: 'Unknown port', manufacturer: '', connected: true })
  })

  it('marks a disconnected port', () => {
    expect(describePort({ id: 'p1', name: 'IAC', state: 'disconnected' }).connected).toBe(false)
  })
})

describe('samePortList', () => {
  it('is true for identical lists', () => {
    expect(samePortList([ info({ id: 'a' }) ], [ info({ id: 'a' }) ])).toBe(true)
  })

  it('is false on a length, order or connected-flag change', () => {
    expect(samePortList([ info({ id: 'a' }) ], [])).toBe(false)
    expect(samePortList(
      [ info({ id: 'a' }), info({ id: 'b' }) ],
      [ info({ id: 'b' }), info({ id: 'a' }) ],
    )).toBe(false)
    expect(samePortList(
      [ info({ id: 'a' }) ],
      [ info({ id: 'a', connected: false }) ],
    )).toBe(false)
  })
})

describe('resolvePort', () => {
  const ports = [ info({ id: 'new-id', name: 'IAC Driver Bus 1' }) ]

  it('prefers a matching id', () => {
    expect(resolvePort(ports, 'new-id', 'Something else')?.id).toBe('new-id')
  })

  it('falls back to the name when the id has changed', () => {
    expect(resolvePort(ports, 'stale-id', 'IAC Driver Bus 1')?.id).toBe('new-id')
  })

  it('gives up when neither matches', () => {
    expect(resolvePort(ports, 'stale-id', 'Gone')).toBeUndefined()
    expect(findPortByName(ports, 'Gone')).toBeUndefined()
  })
})
