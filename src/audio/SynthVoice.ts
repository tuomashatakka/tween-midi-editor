import { pitchToFrequency } from '@/domain/time'

const ATTACK = 0.005
const RELEASE = 0.06

/**
 * A single oscillator voice with a simple gain envelope. One voice plays one
 * scheduled note and self-cleans when it finishes.
 */
export class SynthVoice {
  private osc: OscillatorNode
  private gain: GainNode
  private stopTime: number

  constructor(
    ctx: AudioContext,
    destination: AudioNode,
    pitch: number,
    velocity: number,
    when: number,
    durationSec: number,
    onEnded?: () => void,
  ) {
    this.osc = ctx.createOscillator()
    this.gain = ctx.createGain()
    this.osc.type = 'sawtooth'
    this.osc.frequency.value = pitchToFrequency(pitch)

    const peak = (velocity / 127) * 0.25
    const start = when
    const end = when + Math.max(durationSec, ATTACK + 0.01)
    this.stopTime = end + RELEASE

    this.gain.gain.setValueAtTime(0, start)
    this.gain.gain.linearRampToValueAtTime(peak, start + ATTACK)
    this.gain.gain.setValueAtTime(peak, end)
    this.gain.gain.linearRampToValueAtTime(0, this.stopTime)

    this.osc.connect(this.gain)
    this.gain.connect(destination)
    this.osc.start(start)
    this.osc.stop(this.stopTime)
    this.osc.onended = () => {
      this.disconnect()
      onEnded?.()
    }
  }

  /** Immediately silence and stop this voice (panic / transport stop). */
  kill(ctx: AudioContext) {
    const now = ctx.currentTime
    try {
      this.gain.gain.cancelScheduledValues(now)
      this.gain.gain.setValueAtTime(this.gain.gain.value, now)
      this.gain.gain.linearRampToValueAtTime(0, now + 0.01)
      this.osc.stop(now + 0.02)
    } catch {
      // already stopped
    }
  }

  private disconnect() {
    try {
      this.osc.disconnect()
      this.gain.disconnect()
    } catch {
      // ignore
    }
  }
}
