// Pure helpers for turning live Web MIDI ports into the serializable
// descriptors the store holds. `PortLike` is structural so tests need no DOM.

import type { MidiPortInfo } from '@/domain/types'


export interface PortLike {
  id:            string
  name?:         string | null
  manufacturer?: string | null
  state?:        string | null
}

export const describePort = (port: PortLike): MidiPortInfo => ({
  id:           port.id,
  name:         port.name ?? 'Unknown port',
  manufacturer: port.manufacturer ?? '',
  connected:    port.state !== 'disconnected',
})

/**
 * Whether two port lists are equivalent. macOS's IAC bus fires `statechange`
 * spuriously, and skipping the dispatch keeps those from churning the store.
 */
export const samePortList = (a: MidiPortInfo[], b: MidiPortInfo[]): boolean => {
  if (a.length !== b.length)
    return false
  return a.every((port, i) =>
    port.id === b[i].id &&
    port.name === b[i].name &&
    port.manufacturer === b[i].manufacturer &&
    port.connected === b[i].connected)
}

/** Ports keep stable names across machines even when their ids do not. */
export const findPortByName = (
  ports: MidiPortInfo[],
  name: string,
): MidiPortInfo | undefined => ports.find(p => p.name === name)

/**
 * Resolve a remembered port: by id first, then by name, so a persisted
 * selection survives moving to another machine or browser profile.
 */
export const resolvePort = (
  ports: MidiPortInfo[],
  id: string | null,
  name: string | null,
): MidiPortInfo | undefined => {
  const byId = id === null ? undefined : ports.find(p => p.id === id)
  if (byId)
    return byId
  return name === null ? undefined : findPortByName(ports, name)
}
