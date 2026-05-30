import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import {
  selectViewport,
  selectVisiblePitchRange,
  selectVisibleTickRange,
} from '@/store/selectors/viewportSelectors'
import type { GridDivision, Note, TimeSignature } from '@/domain/types'
import { drawGrid } from './layers/gridLayer'
import { drawNotes } from './layers/notesLayer'
import { drawRuler } from './layers/rulerLayer'
import { drawKeyboard } from './layers/keyboardLayer'
import { drawPlayhead } from './layers/playheadLayer'
import { drawOverlay } from './layers/overlayLayer'
import type { Draft } from './interactions/types'

/**
 * Drives a single requestAnimationFrame loop that redraws the canvas whenever
 * something relevant changes (store updates set inputs; the draft ref is polled
 * each frame during a gesture). Returns a `requestRedraw` callback.
 */
export function useCanvasRenderer (
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  draftRef: React.MutableRefObject<Draft>,
) {
  const viewport      = useAppSelector(selectViewport)
  const notes         = useAppSelector(selectAllNotes)
  const selectedIds   = useAppSelector(s => s.selection.selectedIds)
  const positionTicks = useAppSelector(s => s.transport.positionTicks)
  const division      = useAppSelector(s => s.tool.division)
  const triplet       = useAppSelector(s => s.tool.triplet)
  const timeSignature = useAppSelector(s => s.transport.timeSignature)
  const visibleTicks  = useAppSelector(selectVisibleTickRange)
  const visiblePitch  = useAppSelector(selectVisiblePitchRange)

  const selected = useMemo(() => new Set(selectedIds), [ selectedIds ])

  const dirty         = useRef(true)
  const requestRedraw = useCallback(() => {
    dirty.current = true
  }, [])

  // Snapshot of everything the draw loop needs, refreshed each render.
  const inputs = useRef({
    viewport,
    notes,
    selected,
    positionTicks,
    division,
    triplet,
    timeSignature,
    visibleTicks,
    visiblePitch,
  })
  inputs.current = {
    viewport,
    notes,
    selected,
    positionTicks,
    division,
    triplet,
    timeSignature,
    visibleTicks,
    visiblePitch,
  }
  // Any store-derived change marks the canvas dirty.
  dirty.current = true

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!dirty.current)
        return
      dirty.current = false
      draw(canvasRef.current, inputs.current, draftRef.current)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ canvasRef, draftRef ])

  return requestRedraw
}

type Inputs = {
  viewport:      ReturnType<typeof selectViewport>
  notes:         Note[]
  selected:      Set<string>
  positionTicks: number
  division:      GridDivision
  triplet:       boolean
  timeSignature: TimeSignature
  visibleTicks:  { start: number; end: number }
  visiblePitch:  { lo: number; hi: number }
}

function draw (
  canvas: HTMLCanvasElement | null,
  inp: Inputs,
  draft: Draft,
) {
  if (!canvas)
    return

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const vp  = inp.viewport
  const dpr = window.devicePixelRatio || 1

  // Resize backing store to match CSS size * dpr.
  const targetW = Math.round(vp.width * dpr)
  const targetH = Math.round(vp.height * dpr)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width  = targetW
    canvas.height = targetH
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Apply an in-progress move/resize as a pure preview, without touching the store.
  let renderNotes = inp.notes
  if (draft && (draft.kind === 'move' || draft.kind === 'resize')) {
    const affected = new Set(draft.noteIds)
    renderNotes = inp.notes.map(n => {
      if (!affected.has(n.id))
        return n
      if (draft.kind === 'move')
        return {
          ...n,
          start: Math.max(0, n.start + draft.deltaTicks),
          pitch: n.pitch + draft.deltaPitch,
        }
      return { ...n, duration: Math.max(1, n.duration + draft.deltaDuration) }
    })
  }

  drawGrid(ctx, vp, {
    timeSignature: inp.timeSignature,
    division:      inp.division,
    triplet:       inp.triplet,
    visibleTicks:  inp.visibleTicks,
    visiblePitch:  inp.visiblePitch,
  })
  drawNotes(ctx, vp, { notes: renderNotes, selected: inp.selected })
  drawOverlay(ctx, vp, draft)
  drawRuler(ctx, vp, { timeSignature: inp.timeSignature, visibleTicks: inp.visibleTicks })
  drawKeyboard(ctx, vp, { visiblePitch: inp.visiblePitch })
  drawPlayhead(ctx, vp, { positionTicks: inp.positionTicks })
}
