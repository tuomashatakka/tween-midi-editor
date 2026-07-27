// The only module that touches navigator.requestMIDIAccess. It owns the live
// MIDIAccess and port objects — a module-level registry, exactly like
// `src/audio/engine.ts` does for the AudioEngine — so nothing serializable-only
// ever has to hold a MIDIPort.

import type { MidiPortInfo } from '@/domain/types'
import { describePort } from './portInfo'


export type MidiSupport = 'unknown' | 'unsupported' | 'prompt' | 'granted' | 'denied'

export interface MidiAccessListener {
  onPorts: (inputs: MidiPortInfo[], outputs: MidiPortInfo[]) => void
  onState: (support: MidiSupport, error: string | null) => void
}

let access: MIDIAccess | null          = null
let inputs                             = new Map<string, MIDIInput>()
let outputs                            = new Map<string, MIDIOutput>()
let onStateChange: (() => void) | null = null

/**
 * Web MIDI needs a secure context and is missing entirely in some browsers, so
 * this is checked before anything else touches the API.
 */
export const isMidiSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  'requestMIDIAccess' in navigator &&
  (typeof isSecureContext === 'undefined' || isSecureContext)

/** MIDIInputMap/MIDIOutputMap only expose forEach — not iterable, no get(). */
type ForEachMap<T> = { forEach: (cb: (value: T, key: string) => void) => void }

function collect<T extends MIDIInput | MIDIOutput> (map: ForEachMap<T>): Map<string, T> {
  const out = new Map<string, T>()
  map.forEach((port, id) => out.set(id, port))
  return out
}

const describeAll = (): [ MidiPortInfo[], MidiPortInfo[] ] => [
  [ ...inputs.values() ].map(describePort),
  [ ...outputs.values() ].map(describePort),
]

/** Install a MIDIAccess directly. Exported as a seam for tests. */
export const setMidiAccess = (next: MIDIAccess | null): void => {
  access  = next
  inputs  = next ? collect<MIDIInput>(next.inputs) : new Map()
  outputs = next ? collect<MIDIOutput>(next.outputs) : new Map()
}

/**
 * Ask the browser for MIDI access. Must be called from a user gesture:
 * Chromium prompts for permission even with `sysex: false`, and an unprompted
 * dialog on page load would be hostile.
 */
export async function requestMidiAccess (listener: MidiAccessListener): Promise<boolean> {
  if (!isMidiSupported()) {
    listener.onState('unsupported', null)
    return false
  }

  listener.onState('unknown', null)
  try {
    const granted = await navigator.requestMIDIAccess({ sysex: false })
    setMidiAccess(granted)

    onStateChange = () => {
      setMidiAccess(granted)
      listener.onPorts(...describeAll())
    }
    granted.addEventListener('statechange', onStateChange)

    listener.onState('granted', null)
    listener.onPorts(...describeAll())
    return true
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'MIDI access was refused'
    listener.onState('denied', message)
    return false
  }
}

export const getInputPort = (id: string): MIDIInput | null => inputs.get(id) ?? null
export const getOutputPort = (id: string): MIDIOutput | null => outputs.get(id) ?? null

export const listInputPorts = (): MIDIInput[] => [ ...inputs.values() ]

export function releaseMidiAccess (): void {
  if (access && onStateChange)
    access.removeEventListener('statechange', onStateChange)
  onStateChange = null
  setMidiAccess(null)
}
