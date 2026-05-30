import { isBlackKey, pitchName } from '@/domain/time'
import { pitchToY } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'


export interface KeyboardData {
  visiblePitch: { lo: number; hi: number }
}

export function drawKeyboard (ctx: CanvasRenderingContext2D, vp: Viewport, data: KeyboardData) {
  ctx.fillStyle = theme.keyboardBg
  ctx.fillRect(0, vp.rulerHeight, vp.keyboardWidth, vp.height - vp.rulerHeight)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, vp.rulerHeight, vp.keyboardWidth, vp.height - vp.rulerHeight)
  ctx.clip()

  ctx.font         = '9px system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  for (let pitch = data.visiblePitch.lo; pitch <= data.visiblePitch.hi; pitch++) {
    const y       = pitchToY(pitch + 1, vp)
    const black   = isBlackKey(pitch)
    ctx.fillStyle = black ? theme.keyBlack : theme.keyWhite
    ctx.fillRect(0, y, vp.keyboardWidth, vp.rowHeight)
    ctx.strokeStyle = theme.keyBorder
    ctx.lineWidth   = 1
    ctx.strokeRect(0.5, y + 0.5, vp.keyboardWidth - 1, vp.rowHeight)

    // Label C notes (and any key tall enough to read).
    if (pitch % 12 === 0 || vp.rowHeight >= 14) {
      ctx.fillStyle = black ? theme.keyText : theme.keyText
      ctx.fillText(pitchName(pitch), 4, y + vp.rowHeight / 2)
    }
  }

  // Right edge separating keyboard from grid.
  ctx.strokeStyle = theme.keyBorder
  ctx.beginPath()
  ctx.moveTo(vp.keyboardWidth + 0.5, vp.rulerHeight)
  ctx.lineTo(vp.keyboardWidth + 0.5, vp.height)
  ctx.stroke()
  ctx.restore()
}
