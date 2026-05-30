import { ticksPerBar, ticksPerBeat } from '@/domain/time'
import type { TimeSignature } from '@/domain/types'
import { tickToX } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'


export interface RulerData {
  timeSignature: TimeSignature
  visibleTicks:  { start: number; end: number }
}

export function drawRuler (ctx: CanvasRenderingContext2D, vp: Viewport, data: RulerData) {
  const { timeSignature, visibleTicks } = data
  const barStep                         = ticksPerBar(timeSignature)
  const beatStep                        = ticksPerBeat(timeSignature)

  ctx.fillStyle = theme.rulerBg
  ctx.fillRect(vp.keyboardWidth, 0, vp.width - vp.keyboardWidth, vp.rulerHeight)

  ctx.save()
  ctx.beginPath()
  ctx.rect(vp.keyboardWidth, 0, vp.width - vp.keyboardWidth, vp.rulerHeight)
  ctx.clip()

  ctx.font         = '10px system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  // Beat ticks.
  const firstBeat = Math.floor(visibleTicks.start / beatStep) * beatStep
  for (let t = firstBeat; t <= visibleTicks.end; t += beatStep) {
    const x         = Math.round(tickToX(t, vp)) + 0.5
    const isBar     = Math.abs(t % barStep) < 0.5
    ctx.strokeStyle = isBar ? theme.gridBar : theme.gridBeat
    ctx.beginPath()
    ctx.moveTo(x, isBar ? 6 : vp.rulerHeight - 6)
    ctx.lineTo(x, vp.rulerHeight)
    ctx.stroke()

    if (isBar) {
      const barNumber = Math.round(t / barStep) + 1
      ctx.fillStyle   = theme.rulerText
      ctx.fillText(String(barNumber), x + 3, vp.rulerHeight / 2)
    }
  }
  ctx.restore()
}
