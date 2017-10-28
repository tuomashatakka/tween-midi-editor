// @flow
import type { Action } from '..'
import type { EditorState } from '.'
import { INCREASE_RESOLUTION, DECREASE_RESOLUTION,
  SCALE_UNIFORM, SCALE_VERTICAL, SCALE_HORIZONTAL } from '../../actions/editor'

const MIN_RESOLUTION = 2
const MAX_RESOLUTION = 64

export default function workspace (state: EditorState, action: Action): EditorState {

  let { type, params } = action

  if (INCREASE_RESOLUTION === type) {
    let sub = Math.min(state.grid.sub * (params.increment * 2), MAX_RESOLUTION)
    return Object.assign({}, state, { grid: { ...state.grid, sub } })
  }

  if (DECREASE_RESOLUTION === type) {
    let sub = Math.max(state.grid.sub / (params.decrement * 2), MIN_RESOLUTION)
    return Object.assign({}, state, { grid: { ...state.grid, sub } })
  }

  console.log(SCALE_HORIZONTAL, type)
  if (SCALE_HORIZONTAL === type) {
    let horizontal = state.grid.horizontal + params.percent
    let s = Object.assign({}, state, { grid: { ...state.grid, horizontal } })
    console.warn(s)
    return s
  }

  console.log("No action in workspace reducer")

  return state
}
