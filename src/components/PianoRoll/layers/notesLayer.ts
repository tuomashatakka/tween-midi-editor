import type { Note, NoteId, TrackId } from '@/domain/types'
import { noteRect } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'
import type { TrackStyle } from '@/store/selectors/trackSelectors'


export interface NotesData {
  notes:    Note[]
  selected: Set<NoteId>

  /** Resolved per-track paint styles; all track policy lives in the selector. */
  styles: Map<TrackId, TrackStyle>
}

// Only reached by a note whose track has vanished, which the document actions
// make impossible — a defensive default so a stray note can never break a frame.
const FALLBACK_STYLE: TrackStyle = { fill: theme.note, border: theme.noteBorder, alpha: 1 }

export function drawNotes (ctx: CanvasRenderingContext2D, vp: Viewport, data: NotesData) {
  // Clip to the grid area so notes never paint over keyboard/ruler.
  ctx.save()
  ctx.beginPath()
  ctx.rect(vp.keyboardWidth, vp.rulerHeight, vp.width - vp.keyboardWidth, vp.height - vp.rulerHeight)
  ctx.clip()

  for (const note of data.notes) {
    const r = noteRect(note, vp)
    if (r.x + r.w < vp.keyboardWidth || r.x > vp.width)
      continue

    const style      = data.styles.get(note.trackId) ?? FALLBACK_STYLE
    const isSelected = data.selected.has(note.id)
    const alpha      = 0.45 + note.velocity / 127 * 0.55

    ctx.globalAlpha = alpha * style.alpha
    ctx.fillStyle   = isSelected ? theme.noteSelected : style.fill
    roundRect(ctx, r.x, r.y + 0.5, Math.max(1, r.w - 1), Math.max(1, r.h - 1), 2)
    ctx.fill()

    ctx.globalAlpha = style.alpha
    ctx.lineWidth   = isSelected ? 2 : 1
    ctx.strokeStyle = isSelected ? theme.noteSelected : style.border
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
