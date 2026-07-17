import { useCallback, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/hooks'
import { selectViewport } from '@/store/selectors/viewportSelectors'
import { seek, setClipEnd, setLoop } from '@/store/slices/transportSlice'
import { divisionTicks, snapTicks } from '@/domain/time'
import { xToTick } from '@/view/coords'
import { rulerHitTest } from '@/view/rulerHitTest'
import type { RulerHit } from '@/view/rulerHitTest'
import { localPoint } from './utils'


interface RulerGesture {
  hit:             RulerHit
  grabOffsetTicks: number // tick distance from pointer to loop start (body drag)
  loopLen:         number
}

/**
 * Ruler gestures: click/scrub to seek, drag the loop brace (body moves it,
 * edges resize it) and the clip-end marker. Dispatches live on every move —
 * none of this state is in the undo history (same precedent as panning).
 */
export function useRulerInteractions (requestRedraw: () => void) {
  const store   = useAppStore()
  const gesture = useRef<RulerGesture | null>(null)

  const apply = useCallback(
    (px: number) => {
      const g = gesture.current
      if (!g)
        return

      const state                              = store.getState()
      const vp                                 = selectViewport(state)
      const { loop }                           = state.transport
      const { snapEnabled, division, triplet } = state.tool
      const minLen                             = divisionTicks(division, triplet)
      const tick                               = xToTick(px, vp)
      const snap                               = (t: number): number =>
        snapEnabled ? snapTicks(t, division, triplet) : Math.round(t)

      switch (g.hit.kind) {
        case 'seek': {
          store.dispatch(seek(Math.max(0, snap(tick))))
          break
        }
        case 'loop-body': {
          const start = Math.max(0, snap(tick - g.grabOffsetTicks))
          store.dispatch(setLoop({ startTicks: start, endTicks: start + g.loopLen }))
          break
        }
        case 'loop-start': {
          const start = Math.max(0, Math.min(snap(tick), loop.endTicks - minLen))
          store.dispatch(setLoop({ startTicks: start }))
          break
        }
        case 'loop-end': {
          const end = Math.max(snap(tick), loop.startTicks + minLen)
          store.dispatch(setLoop({ endTicks: end }))
          break
        }
        case 'clip-end': {
          store.dispatch(setClipEnd(Math.max(minLen, snap(tick))))
          break
        }
      }
      requestRedraw()
    },
    [ store, requestRedraw ],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const state                  = store.getState()
      const vp                     = selectViewport(state)
      const { loop, clipEndTicks } = state.transport
      const [ px, py ]             = localPoint(e)
      const hit                    = rulerHitTest(px, py, vp, loop, clipEndTicks, e.pointerType)

      gesture.current = {
        hit,
        grabOffsetTicks: xToTick(px, vp) - loop.startTicks,
        loopLen:         loop.endTicks - loop.startTicks,
      }
      apply(px)
    },
    [ store, apply ],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const [ px ] = localPoint(e)
      apply(px)
    },
    [ apply ],
  )

  const onPointerUp = useCallback(
    () => {
      gesture.current = null
    },
    [],
  )

  /** Abandon the in-flight gesture (e.g. a pinch began). */
  const cancel = useCallback(
    () => {
      gesture.current = null
    },
    [],
  )

  return useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, cancel }),
    [ onPointerDown, onPointerMove, onPointerUp, cancel ],
  )
}
