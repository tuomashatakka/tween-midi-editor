import { allSoundOffBytes, noteOffBytes, noteOnBytes } from './messages'
import { getOutputPort } from './midiAccess'


/** MIDIOutput.clear() is implemented by Chromium but absent from the DOM lib. */
type ClearablePort = MIDIOutput & { clear?: () => void }

/**
 * Sends bytes to output ports and knows how to shut everything up again.
 * Scheduling is not its job — timestamps come from the caller, which is what
 * keeps outgoing MIDI on the same clock as the audio.
 */
export class MidiOutputManager {
  // Channels touched per port, so panic only sprays the ones actually in use.
  private used = new Map<string, Set<number>>()

  // Pitches currently sounding per `${portId}:${channel}`.
  private sounding = new Map<string, Set<number>>()

  send (portId: string, bytes: number[], perfMs?: number) {
    // A port can vanish mid-playback when a device is unplugged; that must
    // never throw.
    const port = getOutputPort(portId)
    if (!port)
      return

    if (perfMs === undefined)
      port.send(bytes); else
      port.send(bytes, perfMs)
  }

  noteOn (portId: string, channel: number, pitch: number, velocity: number, perfMs?: number) {
    this.track(portId, channel, pitch, true)
    this.send(portId, noteOnBytes(channel, pitch, velocity), perfMs)
  }

  noteOff (portId: string, channel: number, pitch: number, perfMs?: number) {
    this.track(portId, channel, pitch, false)
    this.send(portId, noteOffBytes(channel, pitch), perfMs)
  }

  /**
   * Cancel queued future events and silence every channel we have touched.
   * `clear()` is the only way to recall events already handed to the driver
   * with a future timestamp, so it comes first; the all-sound-off trio and the
   * explicit note-offs then cover ports that do not implement it.
   */
  panic () {
    for (const [ portId, channels ] of this.used) {
      const port = getOutputPort(portId) as ClearablePort | null
      port?.clear?.()

      for (const channel of channels) {
        for (const bytes of allSoundOffBytes(channel))
          this.send(portId, bytes)

        const key = `${portId}:${channel}`
        for (const pitch of this.sounding.get(key) ?? [])
          this.send(portId, noteOffBytes(channel, pitch))
        this.sounding.delete(key)
      }
    }
  }

  dispose () {
    this.panic()
    this.used.clear()
    this.sounding.clear()
  }

  private track (portId: string, channel: number, pitch: number, on: boolean) {
    const channels = this.used.get(portId) ?? new Set<number>()
    channels.add(channel)
    this.used.set(portId, channels)

    const key    = `${portId}:${channel}`
    const active = this.sounding.get(key) ?? new Set<number>()
    if (on)
      active.add(pitch); else
      active.delete(pitch)
    this.sounding.set(key, active)
  }
}
