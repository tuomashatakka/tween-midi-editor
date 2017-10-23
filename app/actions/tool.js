// @flow

export const SET_TOOL = 'SET_TOOL'

export function setTool (tool) {
  return {
    type: SET_TOOL,
    params: { tool }
  }
}
