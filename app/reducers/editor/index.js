// @flow
import type { Action } from '..'
import type { BlockType } from '../../actions/editor'

export type EditorState = {
  blocks?: Array<BlockType>,
}

export default function editor (state = {}, action: Action): EditorState {
  if (!action.label)
    return state
  const subreducer = require(`./${action.label}`)
  return subreducer(state, action)
}
