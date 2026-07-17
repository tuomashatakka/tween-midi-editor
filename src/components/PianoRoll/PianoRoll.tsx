import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setViewportSize } from '@/store/slices/viewportSlice'
import { useCanvasRenderer } from './useCanvasRenderer'
import { usePianoRollInteractions } from './interactions/usePianoRollInteractions'
import type { Draft } from './interactions/types'


const TOOL_CURSOR: Record<string, string> = {
  select: 'default',
  pan:    'grab',
  draw:   'crosshair',
}

export const PianoRoll = () => {
  const dispatch     = useAppDispatch()
  const canvasRef    = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draftRef     = useRef<Draft>(null)
  const tool         = useAppSelector(s => s.tool.active)

  const requestRedraw = useCanvasRenderer(canvasRef, draftRef)
  const handlers      = usePianoRollInteractions(canvasRef, draftRef, requestRedraw)

  // Keep the viewport size in sync with the container.
  useEffect(() => {
    const el = containerRef.current
    if (!el)
      return

    const update = () =>
      dispatch(setViewportSize({ width: el.clientWidth, height: el.clientHeight }))
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ dispatch ])

  return <div ref={ containerRef } className="piano-roll">
    <canvas
      ref={ canvasRef }
      className="piano-roll__canvas"
      style={{ cursor: TOOL_CURSOR[tool] ?? 'default' }}
      onPointerDown={ handlers.onPointerDown }
      onPointerMove={ handlers.onPointerMove }
      onPointerUp={ handlers.onPointerUp }
      onPointerCancel={ handlers.onPointerUp } />
  </div>
}
