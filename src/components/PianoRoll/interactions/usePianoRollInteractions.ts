import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/hooks'
import { selectViewport } from '@/store/selectors/viewportSelectors'
import { panBy, zoomX, zoomY } from '@/store/slices/viewportSlice'
import { xToTick, yToPitch, yToPitchLane } from '@/view/coords'
import { playPreview } from '@/audio/engine'
import type { Draft } from './types'
import { pinchDelta } from './pinch'
import type { PinchPair, PointerPt } from './pinch'
import { useRulerInteractions } from './useRulerInteractions'
import { useToolInteractions } from './useToolInteractions'
import { localPoint } from './utils'
import { resolveWheelIntent } from './wheelIntent'


type Mode = 'idle' | 'grid' | 'ruler' | 'pinch'

interface PinchState {
  ids:  [ number, number ]
  prev: PinchPair
}

/**
 * Routes pointer input by region (ruler / keyboard / note grid) and pointer
 * count: the first pointer drives a region gesture, a second pointer cancels
 * it and starts a two-finger pinch (zoom + pan). Owns pointer capture and the
 * native non-passive wheel listener (React's onWheel is passive, so it cannot
 * preventDefault browser page-zoom on ctrl+wheel).
 */
export function usePianoRollInteractions (
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  draftRef: React.MutableRefObject<Draft>,
  requestRedraw: () => void,
) {
  const store = useAppStore()
  const grid  = useToolInteractions(draftRef, requestRedraw)
  const ruler = useRulerInteractions(requestRedraw)

  const pointers = useRef(new Map<number, PointerPt>())
  const mode     = useRef<Mode>('idle')
  const pinch    = useRef<PinchState | null>(null)

  const cancelActiveGesture = useCallback(
    () => {
      switch (mode.current) {
        case 'grid': {
          grid.cancel()
          break
        }
        case 'ruler': {
          ruler.cancel()
          break
        }
      }
    },
    [ grid, ruler ],
  )

  const beginPinch = useCallback(
    () => {
      const entries = [ ...pointers.current.entries() ]
      if (entries.length < 2)
        return

      cancelActiveGesture()

      const [[ idA, a ], [ idB, b ]] = entries
      pinch.current                  = { ids: [ idA, idB ], prev: { a: { ...a }, b: { ...b }}}
      mode.current                   = 'pinch'
    },
    [ cancelActiveGesture ],
  )

  const movePinch = useCallback(
    () => {
      const p = pinch.current
      if (!p)
        return

      const a = pointers.current.get(p.ids[0])
      const b = pointers.current.get(p.ids[1])
      if (!a || !b)
        return

      const next  = { a: { ...a }, b: { ...b }}
      const delta = pinchDelta(p.prev, next)
      p.prev      = next

      // Anchor-stable zooms first, then translate with the centroid. The
      // viewport is re-read between dispatches so each anchor is exact.
      if (delta.factorX !== 1) {
        const vp = selectViewport(store.getState())
        store.dispatch(zoomX({ factor: delta.factorX, anchorTicks: xToTick(delta.centroid.x, vp) }))
      }
      if (delta.factorY !== 1) {
        const vp = selectViewport(store.getState())
        store.dispatch(zoomY({ factor: delta.factorY, anchorPitch: yToPitch(delta.centroid.y, vp) }))
      }
      if (delta.dxPx !== 0 || delta.dyPx !== 0)
        store.dispatch(panBy({ dxPx: delta.dxPx, dyPx: delta.dyPx }))
      requestRedraw()
    },
    [ store, requestRedraw ],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const [ px, py ] = localPoint(e)
      pointers.current.set(e.pointerId, { x: px, y: py })
      e.currentTarget.setPointerCapture(e.pointerId)

      if (pointers.current.size === 2) {
        beginPinch()
        return
      }
      if (pointers.current.size > 2)
        return

      const vp = selectViewport(store.getState())

      // Left keyboard column auditions the pitch under the pointer.
      if (px < vp.keyboardWidth) {
        if (py >= vp.rulerHeight)
          playPreview(yToPitchLane(py, vp), 100)
        return
      }
      if (py < vp.rulerHeight) {
        mode.current = 'ruler'
        ruler.onPointerDown(e)
        return
      }
      mode.current = 'grid'
      grid.onPointerDown(e)
    },
    [ store, grid, ruler, beginPinch ],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const tracked = pointers.current.get(e.pointerId)
      if (tracked) {
        const [ px, py ] = localPoint(e)
        tracked.x        = px
        tracked.y        = py
      }

      switch (mode.current) {
        case 'grid': {
          grid.onPointerMove(e)
          break
        }
        case 'ruler': {
          ruler.onPointerMove(e)
          break
        }
        case 'pinch': {
          if (tracked && pinch.current?.ids.includes(e.pointerId))
            movePinch()
          break
        }
      }
    },
    [ grid, ruler, movePinch ],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(e.pointerId)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      catch {
        // ignore: capture may already be gone (e.g. pointercancel)
      }

      switch (mode.current) {
        case 'grid': {
          grid.onPointerUp()
          mode.current = 'idle'
          break
        }
        case 'ruler': {
          ruler.onPointerUp()
          mode.current = 'idle'
          break
        }
        case 'pinch': {
          if (pinch.current?.ids.includes(e.pointerId)) {
            // The remaining finger stays inert until lifted and re-pressed.
            pinch.current = null
            mode.current  = 'idle'
          }
          break
        }
      }
    },
    [ grid, ruler ],
  )

  // Native non-passive wheel listener: scroll zooms, modifiers pan/zoom-Y.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas)
      return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      const vp     = selectViewport(store.getState())
      const rect   = canvas.getBoundingClientRect()
      const px     = e.clientX - rect.left
      const py     = e.clientY - rect.top
      const intent = resolveWheelIntent(e)

      switch (intent.kind) {
        case 'zoomX': {
          store.dispatch(zoomX({ factor: intent.factor, anchorTicks: xToTick(px, vp) }))
          break
        }
        case 'zoomY': {
          store.dispatch(zoomY({ factor: intent.factor, anchorPitch: yToPitch(py, vp) }))
          break
        }
        case 'pan': {
          store.dispatch(panBy({ dxPx: intent.dxPx, dyPx: intent.dyPx }))
          break
        }
      }
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [ canvasRef, store ])

  return useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp }),
    [ onPointerDown, onPointerMove, onPointerUp ],
  )
}
