import { divisionTicks, isBlackKey, ticksPerBar, ticksPerBeat } from '@/domain/time'
import type { GridDivision, TimeSignature } from '@/domain/types'
import { pitchToY, tickToX } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'


export interface GridData {
  timeSignature: TimeSignature
  division:      GridDivision
  triplet:       boolean
  visibleTicks:  { start: number; end: number }
  visiblePitch:  { lo: number; hi: number }
}

export function drawGrid (ctx: CanvasRenderingContext2D, vp: Viewport, data: GridData) {
  const { timeSignature, division, triplet, visibleTicks, visiblePitch } = data

  // Background.
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, vp.width, vp.height)

  // Horizontal pitch lanes (alternating shading for black keys).
  for (let pitch = visiblePitch.lo; pitch <= visiblePitch.hi; pitch++) {
    const y       = pitchToY(pitch + 1, vp)
    ctx.fillStyle = isBlackKey(pitch) ? theme.rowBlack : theme.rowWhite
    ctx.fillRect(vp.keyboardWidth, y, vp.width - vp.keyboardWidth, vp.rowHeight)
  }

  // Vertical grid lines: subdivisions, beats, bars.
  const subStep  = divisionTicks(division, triplet)
  const beatStep = ticksPerBeat(timeSignature)
  const barStep  = ticksPerBar(timeSignature)

  const firstSub = Math.floor(visibleTicks.start / subStep) * subStep
  ctx.lineWidth  = 1
  for (let t = firstSub; t <= visibleTicks.end; t += subStep) {
    const x = Math.round(tickToX(t, vp)) + 0.5
    if (x < vp.keyboardWidth)
      continue

    const isBar     = Math.abs(t % barStep) < 0.5
    const isBeat    = Math.abs(t % beatStep) < 0.5
    ctx.strokeStyle = isBar ? theme.gridBar : isBeat ? theme.gridBeat : theme.gridSub
    ctx.beginPath()
    ctx.moveTo(x, vp.rulerHeight)
    ctx.lineTo(x, vp.height)
    ctx.stroke()
  }
}
