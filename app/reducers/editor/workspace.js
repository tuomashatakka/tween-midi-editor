// @flow
import type { Action } from '..'
import type { EditorState } from '.'
import { INCREASE_RESOLUTION, DECREASE_RESOLUTION,
  SCALE_UNIFORM, SCALE_VERTICAL, SCALE_HORIZONTAL } from '../../actions/editor'

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

  console.log(SCALE_HORIZONTAL, type)
  if (SCALE_HORIZONTAL === type) {
    let horizontal = state.grid.horizontal + params.percent / 10
    let s = Object.assign({}, state, { grid: { ...state.grid, horizontal } })
    console.warn(s)
    return s
  }

  console.log("No action in workspace reducer")

  return state
}
