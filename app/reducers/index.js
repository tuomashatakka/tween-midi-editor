// @flow
import { combineReducers } from 'redux'
import counter from './counter'
import editor from './editor'
import tool from './tool'

export type Action = {
  +type: string,
  +params: object,
}

const reducer = combineReducers({
  counter,
  editor,
  tool,
})

export default reducer
