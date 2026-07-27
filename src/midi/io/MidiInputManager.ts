import { decodeMidiMessage, isRealtime } from './messages'
import type { MidiChannelMessage, MidiRealtimeMessage } from './messages'
import { getInputPort } from './midiAccess'


export interface MidiInputEvent {
  portId: string

  /** Event time in the performance.now() epoch. */
  perfMs: number
}

export interface MidiInputHandlers {
  onChannel:  (message: MidiChannelMessage, event: MidiInputEvent) => void
  onRealtime: (message: MidiRealtimeMessage, event: MidiInputEvent) => void
}

/**
 * Some drivers report a timestamp of 0. Otherwise `MIDIMessageEvent.timeStamp`
 * is a DOMHighResTimeStamp, which is exactly the epoch recording and clock
 * estimation want.
 */
export const normaliseTimeStamp = (raw: number): number =>
  Number.isFinite(raw) && raw > 0 ? raw : performance.now()

/**
 * Subscribes to a set of input ports and forwards decoded messages. Deliberately
 * thin: it holds no application logic, so the interesting parts stay in pure,
 * tested modules.
 */
export class MidiInputManager {
  // Keyed by port id so removeEventListener gets the very same reference back.
  private listeners = new Map<string, (event: Event) => void>()

  constructor (private handlers: MidiInputHandlers) {}

  /** Idempotent: subscribes what is new, unsubscribes what has gone. */
  setPorts (ids: string[]) {
    const wanted = new Set(ids)

    for (const [ id, listener ] of this.listeners)
      if (!wanted.has(id)) {
        getInputPort(id)?.removeEventListener('midimessage', listener)
        this.listeners.delete(id)
      }

    for (const id of wanted) {
      if (this.listeners.has(id))
        continue

      const port = getInputPort(id)
      if (!port)
        continue

      const listener = (event: Event) => this.handle(id, event as MIDIMessageEvent)
      void port.open()
      port.addEventListener('midimessage', listener)
      this.listeners.set(id, listener)
    }
  }

  private handle (portId: string, event: MIDIMessageEvent) {
    if (!event.data)
      return

    const message = decodeMidiMessage(event.data)
    if (!message)
      return

    const input: MidiInputEvent = { portId, perfMs: normaliseTimeStamp(event.timeStamp) }
    if (isRealtime(message))
      this.handlers.onRealtime(message, input); else
      this.handlers.onChannel(message, input)
  }

  dispose () {
    this.setPorts([])
  }
}
