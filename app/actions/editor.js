// @flow

export const ADD_BLOCK          = 'ADD_BLOCK'
export const REMOVE_BLOCK       = 'REMOVE_BLOCK'
export const SELECT_BLOCK       = 'SELECT_BLOCK'
export const SELECT_BLOCKS      = 'SELECT_BLOCKS'
export const DESELECT_BLOCKS    = 'DESELECT_BLOCKS'
export const CLEAR_SELECTION    = 'CLEAR_SELECTION'
export const TOGGLE_SELECTION   = 'TOGGLE_SELECTION'

export const UPDATE_BLOCK       = 'UPDATE_BLOCK'
export const SET_BLOCK_NOTE     = 'SET_BLOCK_NOTE'
export const SET_BLOCK_START    = 'SET_BLOCK_START'
export const SET_BLOCK_DURATION = 'SET_BLOCK_DURATION'
export const SET_BLOCK_VELOCITY = 'SET_BLOCK_VELOCITY'

export const SCALE_UNIFORM = 'SCALE_UNIFORM'
export const SCALE_VERTICAL = 'SCALE_VERTICAL'
export const SCALE_HORIZONTAL = 'SCALE_HORIZONTAL'

export const MOVE_UNIFORM = 'MOVE_UNIFORM'
export const MOVE_VERTICAL = 'MOVE_VERTICAL'
export const MOVE_HORIZONTAL = 'MOVE_HORIZONTAL'

type BlockProperties = {
  note: number,
  velocity: number,
  start: number,
  end: number,
  duration: number,
}

export type BlockType = {
  id: number,
  properties: BlockProperties,
  detail?: { relative: Boolean, }
}

const blockDefaultProperties = {
  note: 64,
  velocity: 100,
  start: 0,
  end: 0,
  duration: 0,
}

export function addBlock (properties: {}) {
  let id = parseInt(Math.random() * 100000)
  return {
    type: ADD_BLOCK,
    params: {
      id,
      properties: Object.assign({}, blockDefaultProperties: BlockProperties, properties),
    },
  }
}

export function updateBlock (id: number, properties: {}) {
  return {
    type: UPDATE_BLOCK,
    params: {
      id,
      properties,
    }
  }
}

export const removeBlock = (id: number) => ({
  type: REMOVE_BLOCK,
  params: { id }
})

export const selectBlock = (id: number) => ({
  type: SELECT_BLOCK,
  params: { id }
})

export const toggleSelection = (...blockIds: Array<number>) => ({
  type: TOGGLE_SELECTION,
  params: { blocks: blockIds }
})

export const selectBlocks = (...blockIds: Array<number>) => ({
  type: SELECT_BLOCKS,
  params: { blocks: blockIds }
})

export const deselectBlocks = (...blockIds: Array<number>) => ({
  type: DESELECT_BLOCKS,
  params: { blocks: blockIds }
})

export const clearSelection = () => ({
  type: CLEAR_SELECTION,
  params: {}
})

export function setBlockNote (id: number | null, note?: number) {
  if (!note) {
    note = id
    id = null
  }
  return {
    type: SET_BLOCK_NOTE,
    params: {
      id,
      properties: { note },
      detail: { relative: id ? false : true },
    }
  }
}

export function setBlockStart (id: number | null, start?: number) {
  if (!start) {
    start = id
    id = null
  }
  return {
    type: SET_BLOCK_START,
    params: {
      id,
      properties: { start },
      detail: { relative: id ? false : true },
    }
  }
}

export function setBlockDuration (id: number | null, duration?: number) {
  if (!duration) {
    duration = id
    id = null
  }
  return {
    type: SET_BLOCK_DURATION,
    params: {
      id,
      properties: { duration },
      detail: { relative: id ? false : true },
    }
  }
}

export function setBlockVelocity (id: number, velocity: number) {
  if (velocity > 127)
    velocity = 127
  if (velocity < 0)
    velocity = 0
  return {
    type: SET_BLOCK_VELOCITY,
    params: {
      id,
      properties: { velocity },
    }
  }
}
