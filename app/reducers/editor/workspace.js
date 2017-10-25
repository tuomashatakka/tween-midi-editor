// @flow
import type { Action } from '..'
import type { EditorState } from '.'
import { INCREASE_RESOLUTION, DECREASE_RESOLUTION } from '../../actions/editor'

export default function workspace (state: EditorState, action: Action): EditorState {

  let { type, params } = action

  if (INCREASE_RESOLUTION === type) {
    let size = state.grid.size / (params.increment * 2)
    return Object.assign({}, state, { grid: { ...state.grid, size, horizontal: size } })
  }

  if (DECREASE_RESOLUTION === type) {
    let size = state.grid.size * (params.decrement * 2)
    return Object.assign({}, state, { grid: { ...state.grid, size, horizontal: size } })
  }

  console.log("No action in workspace reducer")

  return state
}
