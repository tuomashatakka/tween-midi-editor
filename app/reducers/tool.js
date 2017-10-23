// @flow
import { SET_TOOL } from '../actions/tool'

export type toolStateType = {
  +tool: string
} | {}

type actionType = {
  +type: string,
  +params: object,
}

export default function counter(state: toolStateType = {}, action: actionType) {
  let { type, params } = action
  let update = (updates: any = {}): toolStateType => Object.assign({}, state, updates)

  if(SET_TOOL === type)
    return update({ tool: params.tool })

  return state
}
