// @flow

export const SET_TOOL = 'SET_TOOL'
export const TOGGLE_PREFERENCES = 'TOGGLE_PREFERENCES'

export const setTool = (tool) => ({
  type: SET_TOOL,
  params: { tool }
})

export const togglePreferences = (setTo: boolean | null = null) => {
  let params = (setTo !== null)
    ? { isOpen: setTo }
    : {}
  return { type: TOGGLE_PREFERENCES, params }
}
