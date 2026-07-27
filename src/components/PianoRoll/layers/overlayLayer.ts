import type { TrackId } from '@/domain/types'
import { noteRect, rectFromPoints } from '@/view/coords'
import type { Viewport } from '@/view/coords'
import { theme } from '@/view/theme'
import type { TrackStyle } from '@/store/selectors/trackSelectors'
import type { Draft } from '../interactions/types'


export interface OverlayData {
  draft:  Draft
  styles: Map<TrackId, TrackStyle>
}

export function drawOverlay (ctx: CanvasRenderingContext2D, vp: Viewport, data: OverlayData) {
  const { draft } = data
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
      {
        id:       '_',
        trackId:  draft.trackId,
        pitch:    draft.pitch,
        start:    draft.start,
        duration: draft.duration,
        velocity: 100,
      },
      vp,
    )
    // Preview in the destination track's colour so it is obvious where the note
    // will land.
    const style     = data.styles.get(draft.trackId)
    ctx.globalAlpha = 0.5
    ctx.fillStyle   = style?.fill ?? theme.draftNote
    ctx.fillRect(r.x, r.y + 0.5, Math.max(1, r.w - 1), Math.max(1, r.h - 1))
    ctx.globalAlpha = 1
  }
}
