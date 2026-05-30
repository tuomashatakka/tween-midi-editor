import type { Note, NoteId } from '@/domain/types'
import { noteRect } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'


export interface NotesData {
  notes:    Note[]
  selected: Set<NoteId>
}

export function drawNotes (ctx: CanvasRenderingContext2D, vp: Viewport, data: NotesData) {
  // Clip to the grid area so notes never paint over keyboard/ruler.
  ctx.save()
  ctx.beginPath()
  ctx.rect(vp.keyboardWidth, vp.rulerHeight, vp.width - vp.keyboardWidth, vp.height - vp.rulerHeight)
  ctx.clip()

  for (const note of data.notes) {
    const r          = noteRect(note, vp)
    const isSelected = data.selected.has(note.id)
    const alpha      = 0.45 + note.velocity / 127 * 0.55

    ctx.globalAlpha = alpha
    ctx.fillStyle   = isSelected ? theme.noteSelected : theme.note
    roundRect(ctx, r.x, r.y + 0.5, Math.max(1, r.w - 1), Math.max(1, r.h - 1), 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.lineWidth   = isSelected ? 2 : 1
    ctx.strokeStyle = isSelected ? theme.noteSelected : theme.noteBorder
    roundRect(ctx, r.x, r.y + 0.5, Math.max(1, r.w - 1), Math.max(1, r.h - 1), 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function roundRect (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
