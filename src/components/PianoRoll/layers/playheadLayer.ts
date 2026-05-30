import { tickToX } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'


export interface PlayheadData {
  positionTicks: number
}

export function drawPlayhead (ctx: CanvasRenderingContext2D, vp: Viewport, data: PlayheadData) {
  const x = tickToX(data.positionTicks, vp)
  if (x < vp.keyboardWidth || x > vp.width)
    return
  ctx.strokeStyle = theme.playhead
  ctx.lineWidth   = 1.5
  ctx.beginPath()
  ctx.moveTo(Math.round(x) + 0.5, 0)
  ctx.lineTo(Math.round(x) + 0.5, vp.height)
  ctx.stroke()
}
