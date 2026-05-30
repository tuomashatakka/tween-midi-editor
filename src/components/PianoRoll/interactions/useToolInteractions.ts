import { useCallback, useRef } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { useAppStore } from '@/store/hooks'
import { selectAllNotes } from '@/store/selectors/noteSelectors'
import { selectViewport } from '@/store/selectors/viewportSelectors'
import {
  addNote,
  moveNotesBy,
  removeNote,
  updateNotes,
} from '@/store/slices/notesSlice'
import {
  addToSelection,
  clearSelection,
  selectOne,
  setSelection,
  toggleSelection,
} from '@/store/slices/selectionSlice'
import { panBy, zoomX, zoomY } from '@/store/slices/viewportSlice'
import { snapTicks, floorToGrid } from '@/domain/time'
import type { NoteId } from '@/domain/types'
import { rectFromPoints, xToTick, yToPitch, yToPitchLane } from '@/view/coords'
import { hitTestNote, notesInRect } from '@/view/hitTest'
import type { Draft } from './types'

interface Gesture {
  startX: number
  startY: number
  lastX: number
  lastY: number
  anchorStart: number // dragged note's original start (move) or end (resize base)
  resizeBase: number // start+duration of grabbed note (resize)
}

export function useToolInteractions(
  draftRef: React.MutableRefObject<Draft>,
  requestRedraw: () => void,
) {
  const store = useAppStore()
  const gesture = useRef<Gesture | null>(null)

  const localPoint = (e: React.PointerEvent): [number, number] => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  const snap = (t: number): number => {
    const { snapEnabled, division, triplet } = store.getState().tool
    return snapEnabled ? snapTicks(t, division, triplet) : Math.round(t)
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const state = store.getState()
      const tool = state.tool.active
      const vp = selectViewport(state)
      const notes = selectAllNotes(state)
      const [px, py] = localPoint(e)
      if (px < vp.keyboardWidth || py < vp.rulerHeight) return
      e.currentTarget.setPointerCapture(e.pointerId)
      gesture.current = { startX: px, startY: py, lastX: px, lastY: py, anchorStart: 0, resizeBase: 0 }

      const hit = hitTestNote(px, py, notes, vp)

      if (tool === 'pan') return

      if (tool === 'marquee') {
        draftRef.current = { kind: 'marquee', x1: px, y1: py, x2: px, y2: py, additive: e.shiftKey }
        requestRedraw()
        return
      }

      if (tool === 'draw') {
        if (hit) {
          store.dispatch(removeNote(hit.id))
          return
        }
        const pitch = yToPitchLane(py, vp)
        const start = floorToGrid(xToTick(px, vp), state.tool.division, state.tool.triplet)
        const id = nanoid()
        store.dispatch(addNote({ id, pitch, start, duration: state.tool.defaultNoteDuration, velocity: 100 }))
        store.dispatch(selectOne(id))
        gesture.current.resizeBase = start + state.tool.defaultNoteDuration
        draftRef.current = { kind: 'resize', noteIds: [id], deltaDuration: 0 }
        requestRedraw()
        return
      }

      // select tool
      if (!hit) {
        if (!e.shiftKey) store.dispatch(clearSelection())
        return
      }

      const selected = state.selection.selectedIds
      const isSelected = selected.includes(hit.id)

      if (e.shiftKey && hit.edge === 'body') {
        store.dispatch(toggleSelection([hit.id]))
        return
      }
      if (!isSelected) store.dispatch(selectOne(hit.id))

      const targetIds: NoteId[] = isSelected ? selected : [hit.id]
      const anchor = notes.find((n) => n.id === hit.id)!

      if (hit.edge === 'resize-right') {
        gesture.current.resizeBase = anchor.start + anchor.duration
        draftRef.current = { kind: 'resize', noteIds: targetIds, deltaDuration: 0 }
      } else {
        gesture.current.anchorStart = anchor.start
        draftRef.current = { kind: 'move', noteIds: targetIds, deltaTicks: 0, deltaPitch: 0 }
      }
      requestRedraw()
    },
    [store, draftRef, requestRedraw],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const g = gesture.current
      const draft = draftRef.current
      if (!g) return
      const state = store.getState()
      const vp = selectViewport(state)
      const [px, py] = localPoint(e)

      if (state.tool.active === 'pan') {
        store.dispatch(panBy({ dxPx: px - g.lastX, dyPx: py - g.lastY }))
        g.lastX = px
        g.lastY = py
        return
      }
      if (!draft) return

      if (draft.kind === 'marquee') {
        draftRef.current = { ...draft, x2: px, y2: py }
      } else if (draft.kind === 'move') {
        const rawDelta = xToTick(px, vp) - xToTick(g.startX, vp)
        const deltaTicks = snap(g.anchorStart + rawDelta) - g.anchorStart
        const deltaPitch = Math.round(yToPitch(py, vp) - yToPitch(g.startY, vp))
        draftRef.current = { ...draft, deltaTicks, deltaPitch }
      } else if (draft.kind === 'resize') {
        const rawDelta = xToTick(px, vp) - xToTick(g.startX, vp)
        const deltaDuration = snap(g.resizeBase + rawDelta) - g.resizeBase
        draftRef.current = { ...draft, deltaDuration }
      }
      g.lastX = px
      g.lastY = py
      requestRedraw()
    },
    [store, draftRef, requestRedraw],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const draft = draftRef.current
      const g = gesture.current
      gesture.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      if (!draft) {
        return
      }
      const state = store.getState()
      const vp = selectViewport(state)
      const notes = selectAllNotes(state)

      if (draft.kind === 'marquee' && g) {
        const rect = rectFromPoints(g.startX, g.startY, draft.x2, draft.y2)
        const ids = notesInRect(rect, notes, vp)
        store.dispatch(draft.additive ? addToSelection(ids) : setSelection(ids))
      } else if (draft.kind === 'move') {
        if (draft.deltaTicks !== 0 || draft.deltaPitch !== 0) {
          store.dispatch(moveNotesBy({ ids: draft.noteIds, deltaTicks: draft.deltaTicks, deltaPitch: draft.deltaPitch }))
        }
      } else if (draft.kind === 'resize') {
        if (draft.deltaDuration !== 0) {
          const byId = new Map(notes.map((n) => [n.id, n]))
          const updates = draft.noteIds
            .map((id) => byId.get(id))
            .filter((n): n is NonNullable<typeof n> => !!n)
            .map((n) => ({ id: n.id, changes: { duration: Math.max(1, n.duration + draft.deltaDuration) } }))
          store.dispatch(updateNotes(updates))
        }
      }

      draftRef.current = null
      requestRedraw()
    },
    [store, draftRef, requestRedraw],
  )

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      const state = store.getState()
      const vp = selectViewport(state)
      const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top

      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
        store.dispatch(zoomX({ factor, anchorTicks: xToTick(px, vp) }))
      } else if (e.altKey) {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
        store.dispatch(zoomY({ factor, anchorPitch: yToPitch(py, vp) }))
      } else {
        store.dispatch(panBy({ dxPx: -e.deltaX, dyPx: -e.deltaY }))
      }
    },
    [store],
  )

  return { onPointerDown, onPointerMove, onPointerUp, onWheel }
}
