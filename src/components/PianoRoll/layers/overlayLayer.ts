import { noteRect, rectFromPoints } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'
import type { Draft } from '../interactions/types'


export function drawOverlay (ctx: CanvasRenderingContext2D, vp: Viewport, draft: Draft) {
  if (!draft)
    return

  if (draft.kind === 'marquee') {
    const r       = rectFromPoints(draft.x1, draft.y1, draft.x2, draft.y2)
    ctx.fillStyle = theme.marquee
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = theme.marqueeBorder
    ctx.lineWidth   = 1
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h)
  }

  if (draft.kind === 'draw') {
    const r = noteRect(
      { id: '_', pitch: draft.pitch, start: draft.start, duration: draft.duration, velocity: 100 },
      vp,
    )
    ctx.fillStyle = theme.draftNote
    ctx.fillRect(r.x, r.y + 0.5, Math.max(1, r.w - 1), Math.max(1, r.h - 1))
  }
}
