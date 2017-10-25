// @flow
import { SET_TOOL, TOGGLE_PREFERENCES } from '../actions/tool'

export type toolStateType = {
  +tool: string,
  preferences: {
    isOpen: boolean,
  }
} | {}

type actionType = {
  +type: string,
  +params: object,
}

export default function counter(state: toolStateType = {}, action: actionType) {
  let { type, params } = action
  let update = (updates: any = {}): toolStateType => Object.assign({}, state, updates)
  let updateSub = (...key: string | {}): toolStateType => {
    let updates = key.pop()
    let updated = Object.assign({}, state)
    let recurse = updated
    let current

    while (current = key.shift())
      recurse = recurse[current]
    Object.assign(recurse, updates)
    console.log(recurse, updated)
    return updated
  }

  if(SET_TOOL === type)
    return update({ tool: params.tool })

  if(TOGGLE_PREFERENCES === type) {
    if (params.isOpen === true)
      return updateSub('preferences', { isOpen: true } )
    if (params.isOpen === false)
      return updateSub('preferences', { isOpen: false } )
    return updateSub('preferences', { isOpen: !state.preferences.isOpen } )
  }
  return state
}
