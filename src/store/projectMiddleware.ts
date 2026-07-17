import type { Middleware } from '@reduxjs/toolkit'
import { markDirty } from './slices/projectSlice'
import type { ProjectState } from './slices/projectSlice'

// Actions that change document content (as opposed to view/selection/transport
// position) flip the project's dirty flag until the next save/load.
const CONTENT_ACTION_PREFIXES = [ 'notes/' ]
const CONTENT_ACTION_TYPES    = new Set([
  'transport/setBpm',
  'transport/setTimeSignature',
  'transport/setLoop',
  'transport/setClipEnd',
  '@@redux-undo/UNDO',
  '@@redux-undo/REDO',
])

const isContentAction = (type: string): boolean =>
  CONTENT_ACTION_TYPES.has(type) ||
  CONTENT_ACTION_PREFIXES.some(prefix => type.startsWith(prefix))

export const projectMiddleware: Middleware = storeApi => next => action => {
  const result = next(action)

  const { type }  = action as { type: string }
  const { dirty } = (storeApi.getState() as { project: ProjectState }).project
  if (!dirty && isContentAction(type))
    storeApi.dispatch(markDirty())

  return result
}
