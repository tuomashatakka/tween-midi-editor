import type { Note } from '@/domain/types'
import { ticksToSeconds } from '@/domain/time'
import { noteRect } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'
import { envelopeAt, sawtoothAt, visualCycleCount } from '@/audio/waveform'


export interface WaveformData {
  notes: Note[]
  bpm:   number
}

const MIN_WIDTH_PX = 6 // skip notes too narrow to read

/**
 * Melodyne-style transparent overlay: for each note it draws the oscillator's
 * amplitude envelope as a filled band plus a mirrored sawtooth waveform line,
 * centred on the note. The shape is derived from the synth (see audio/waveform),
 * so it reflects what is heard without a live capture.
 */
export function drawWaveform (ctx: CanvasRenderingContext2D, vp: Viewport, data: WaveformData) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(vp.keyboardWidth, vp.rulerHeight, vp.width - vp.keyboardWidth, vp.height - vp.rulerHeight)
  ctx.clip()

  for (const note of data.notes) {
    const r = noteRect(note, vp)
    if (r.w < MIN_WIDTH_PX || r.x + r.w < vp.keyboardWidth || r.x > vp.width)
      continue

    const centerY     = r.y + r.h / 2
    const halfH       = (r.h - 2) / 2
    const cycles      = visualCycleCount(note, data.bpm, r.w)
    const durationSec = Math.max(ticksToSeconds(note.duration, data.bpm), 1e-3)
    const steps       = Math.max(8, Math.min(Math.round(r.w), 256))

    // Filled envelope band (very transparent).
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const p = i / steps
      const e = envelopeAt(p, durationSec, note.velocity)
      const x = r.x + p * r.w
      const y = centerY - e * halfH
      if (i === 0)
        ctx.moveTo(x, y)
      else
        ctx.lineTo(x, y)
    }
    for (let i = steps; i >= 0; i--) {
      const p = i / steps
      const e = envelopeAt(p, durationSec, note.velocity)
      ctx.lineTo(r.x + p * r.w, centerY + e * halfH)
    }
    ctx.closePath()
    ctx.fillStyle = theme.waveformFill
    ctx.fill()

    // Mirrored sawtooth waveform line modulated by the envelope.
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const p   = i / steps
      const e   = envelopeAt(p, durationSec, note.velocity)
      const osc = sawtoothAt(p * cycles)
      const x   = r.x + p * r.w
      const y   = centerY - osc * e * halfH
      if (i === 0)
        ctx.moveTo(x, y)
      else
        ctx.lineTo(x, y)
    }
    ctx.lineWidth   = 1
    ctx.strokeStyle = theme.waveformLine
    ctx.stroke()
  }

  ctx.restore()
}
