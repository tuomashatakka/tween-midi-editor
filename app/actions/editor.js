// @flow
import type { Action } from '../reducers'
import Note from '../models/Note'
import MIDIInstruction from '../models/MIDIInstruction'

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

export const SCALE_UNIFORM      = 'SCALE_UNIFORM'
export const SCALE_VERTICAL     = 'SCALE_VERTICAL'
export const SCALE_HORIZONTAL   = 'SCALE_HORIZONTAL'

export const MOVE_UNIFORM       = 'MOVE_UNIFORM'
export const MOVE_VERTICAL      = 'MOVE_VERTICAL'
export const MOVE_HORIZONTAL    = 'MOVE_HORIZONTAL'

export const INCREASE_RESOLUTION  = 'INCREASE_RESOLUTION'
export const DECREASE_RESOLUTION  = 'DECREASE_RESOLUTION'

export const READ_INSTRUCTIONS  = 'READ_INSTRUCTIONS'

const LABEL_BLOCK               = 'block'
const LABEL_WORKSPACE           = 'workspace'

export const LABELS             = [ LABEL_BLOCK, LABEL_WORKSPACE ]

const generateID = () => parseInt(Math.random() * 100000000)

type BlockProperties = {
  note: number,
  velocity: number,
  start: number,
  end: number,
  duration: number,
  ch?: number,
}

export type BlockType = {
  id: number,
  properties: BlockProperties,
  detail?: { relative: Boolean, }
}

const blockDefaultProperties: BlockProperties = {
  start:    0,
  end:      0,
  duration: 0,
  note:     0,
  velocity: 100,
}

export const scaleHorizontal = (percent: number = 1) => ({
  type: SCALE_HORIZONTAL,
  label: LABEL_WORKSPACE,
  params: { percent }
})

export const increaseResolution = (increment: number = 1) => ({
  type: INCREASE_RESOLUTION,
  label: LABEL_WORKSPACE,
  params: { increment }
})

export const decreaseResolution = (decrement: number = 1) => ({
  type: DECREASE_RESOLUTION,
  label: LABEL_WORKSPACE,
  params: { decrement }
})

export function readInstructions (instructions: MIDIInstructionComposite): Action {

  console.log(instructions)

  const mapInstruction = properties =>
    Object.assign({ id: generateID() }, blockDefaultProperties, properties)

  let serializedData = instructions.serialize()
  let blocks = serializedData.notes.map(mapInstruction)
  console.info("blocks.", blocks)
  return {
    type:   READ_INSTRUCTIONS,
    label:  LABEL_BLOCK,
    params: {
      properties: serializedData.properties,
      blocks
    },
  }
}

export function addBlock (properties: {}) {
  properties = Object.assign({}, blockDefaultProperties, properties)
  let id = generateID()

  return {
    type:   ADD_BLOCK,
    label:  LABEL_BLOCK,
    params: { id, properties, },
  }
}

export function updateBlock (id: number, properties: {}) {
  return {
    type:   UPDATE_BLOCK,
    label:  LABEL_BLOCK,
    params: { id, properties }
  }
}

export const removeBlock = (id: number) => ({
  type:   REMOVE_BLOCK,
  label:  LABEL_BLOCK,
  params: { id }
})

export const selectBlock = (id: number) => ({
  type:   SELECT_BLOCK,
  label:  LABEL_BLOCK,
  params: { id }
})

export const toggleSelection = (...blocks: Array<number>) => ({
  type:   TOGGLE_SELECTION,
  label:  LABEL_BLOCK,
  params: { blocks }
})

export const selectBlocks = (...blocks: Array<number>) => ({
  type:   SELECT_BLOCKS,
  label:  LABEL_BLOCK,
  params: { blocks }
})

export const deselectBlocks = (...blocks: Array<number>) => ({
  type:   DESELECT_BLOCKS,
  label:  LABEL_BLOCK,
  params: { blocks }
})

export const clearSelection = () => ({
  type:   CLEAR_SELECTION,
  label:  LABEL_BLOCK,
  params: {}
})

export function setBlockNote (id: number | null, note?: number) {
  if (!note) {
    note = id
    id = null
  }
  return {
    type:   SET_BLOCK_NOTE,
    label:  LABEL_BLOCK,
    params: {
      id,
      properties: { note },
      detail: { relative: id ? false : true },
    }
  }
}

export function setBlockStart (id: number | null , start?: number) {
  if (!start) {
    start = id
    id = null
  }
  return {
    type:   SET_BLOCK_START,
    label:  LABEL_BLOCK,
    params: {
      id,
      properties: { start },
      detail: { relative: id ? false : true },
    }
  }
}

export function setBlockDuration (id: number | null , duration?: number) {
  if (!duration) {
    duration = id
    id = null
  }
  return {
    type:   SET_BLOCK_DURATION,
    label:  LABEL_BLOCK,
    params: {
      id,
      properties: { duration },
      detail: { relative: id ? false : true },
    }
  }
}

export function setBlockVelocity (id: number, velocity: number) {
  if (velocity > Note.MAX_VELOCITY)
    velocity = Note.MAX_VELOCITY
  if (velocity < Note.MIN_VELOCITY)
    velocity = Note.MIN_VELOCITY
  return {
    type:   SET_BLOCK_VELOCITY,
    label:  LABEL_BLOCK,
    params: {
      id,
      properties: { velocity },
    }
  }
}
