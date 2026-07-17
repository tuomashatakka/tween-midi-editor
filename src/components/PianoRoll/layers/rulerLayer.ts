import { ticksPerBar, ticksPerBeat } from '@/domain/time'
import type { LoopRegion, Ticks, TimeSignature } from '@/domain/types'
import { tickToX } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { BRACE_BAND_RATIO } from '@/view/rulerHitTest'
import { theme } from '@/view/theme'


export interface RulerData {
  timeSignature: TimeSignature
  visibleTicks:  { start: number; end: number }
  loop:          LoopRegion
  clipEndTicks:  Ticks
}

export function drawRuler (ctx: CanvasRenderingContext2D, vp: Viewport, data: RulerData) {
  const { timeSignature, visibleTicks, loop, clipEndTicks } = data
  const barStep                                             = ticksPerBar(timeSignature)
  const beatStep                                            = ticksPerBeat(timeSignature)

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

  drawLoopBrace(ctx, vp, loop)
  drawClipEndMarker(ctx, vp, clipEndTicks)
  ctx.restore()
}

/** Ableton-style loop brace in the upper ruler band; dimmed when disabled. */
function drawLoopBrace (ctx: CanvasRenderingContext2D, vp: Viewport, loop: LoopRegion) {
  const bandH  = vp.rulerHeight * BRACE_BAND_RATIO
  const startX = tickToX(loop.startTicks, vp)
  const endX   = tickToX(loop.endTicks, vp)
  if (endX < vp.keyboardWidth || startX > vp.width)
    return

  const color = loop.enabled ? theme.loopBrace : theme.loopBraceDim

  ctx.fillStyle = color
  ctx.fillRect(startX, 2, Math.max(1, endX - startX), bandH - 4)

  // Square edge handles signal the draggable bounds.
  ctx.fillStyle = loop.enabled ? theme.loopHandle : theme.loopBraceDim
  ctx.fillRect(startX - 2, 1, 4, bandH - 2)
  ctx.fillRect(endX - 2, 1, 4, bandH - 2)
}

/** Clip end: a downward flag marking where playback stops when loop is off. */
function drawClipEndMarker (ctx: CanvasRenderingContext2D, vp: Viewport, clipEndTicks: Ticks) {
  const x = tickToX(clipEndTicks, vp)
  if (x < vp.keyboardWidth || x > vp.width)
    return

  const bandH   = vp.rulerHeight * BRACE_BAND_RATIO
  ctx.fillStyle = theme.clipEnd
  ctx.beginPath()
  ctx.moveTo(x, 1)
  ctx.lineTo(x - 7, 1)
  ctx.lineTo(x, bandH)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(x - 1, 1, 2, vp.rulerHeight - 2)
}
