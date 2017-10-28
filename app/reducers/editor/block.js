// @flow
import type { Action } from '..'
import type { BlockType } from '../../actions/editor'
import type { EditorState } from '.'
import {
  ADD_BLOCK,
  READ_INSTRUCTIONS,
  REMOVE_BLOCK,
  SELECT_BLOCK,
  SELECT_BLOCKS,
  DESELECT_BLOCKS,
  CLEAR_SELECTION,
  TOGGLE_SELECTION,
  SET_BLOCK_NOTE,
  SET_BLOCK_START,
  SET_BLOCK_DURATION,
} from '../../actions/editor'

function getSelected (state) {
  return state.blocks.filter(iter => state.selected.indexOf(iter.id) > -1)
}

// eslint-disable-next-line complexity
export default function block (state: EditorState = {}, action: Action): EditorState {

  let { type, params } = action

  const updateEachSelected = (params) =>
    getSelected(state).reduce((s, blk) =>
    updateBlockProperties(s, blk.id, params), { ...state })

  function updateBlockProperties (state, id, { properties = null, detail = {} }) {
    let blocks = [ ...state.blocks ]
    let index  = blocks.findIndex(iter => id === iter.id)
    if (index === -1)
      throw new ReferenceError(`Could not find a block with id ${id}.`)

    let block = blocks.splice(index, 1)[0]
    let attrs =  (detail.relative) ? Object.keys(properties).reduce((props, attr) => {
      props[attr] += properties[attr]
      return props
    }, block.properties) : properties

    Object.assign(block.properties, attrs)
    block.properties.end = block.properties.start + block.properties.duration
    return Object.assign({}, state, { blocks: [ block, ...blocks ] })
  }

  let update = (block: BlockType | any | null = {}): EditorState => {
    let blocks = [ ...state.blocks ]
    let index  = blocks.findIndex(iter => block.id === iter.id)
    let bloc   = blocks.splice(index, 1)[0]
    let start  = bloc.properties.start
    Object.assign(bloc.properties, block.properties)
    let diff   = bloc.properties.start - start

    if (!bloc.properties.end)
      bloc.properties.end = block.properties.start + bloc.properties.duration
    if (diff) {
      bloc.properties.end += diff
      bloc.properties.duration += diff
    }

    return Object.assign({}, state, { blocks: [ bloc, ...blocks ] })
  }

  let relative = (block, p) => {
    let props = { ...block.properties }
    if (params.detail && params.detail.relative)
      props[p] += params.properties[p]
    else
      props[p] = params.properties[p]
    return props
  }

  if(ADD_BLOCK === type)
    return Object.assign({}, state, { blocks: [ ...state.blocks, params ]})

  if(READ_INSTRUCTIONS === type)
    return Object.assign({}, state, {
      document: params.properties,
      blocks: [
        ...state.blocks,
        ...params.blocks
          .map(properties => ({ properties, id: properties.id }))
      ]
    })

  if(REMOVE_BLOCK === type) {
    let blocks = [ ...state.blocks ]
    let index = blocks.findIndex(iter => params.id === iter.id)
    blocks.splice(index, 1)
    return Object.assign({}, state, { blocks })
  }

  if (
    (SET_BLOCK_NOTE === type) ||
    (SET_BLOCK_DURATION === type) ||
    (SET_BLOCK_START === type)) {
    if (params.id)
      return update({ id: params.id, ...params })
    return updateEachSelected(params)
  }

  if(SET_BLOCK_DURATION === type) {
    let id = params.id || state.selected[0] //FIXME
    let block  = state.blocks.find(iter => id === iter.id)
    let properties = Object.assign({}, relative(block, 'duration'))
    properties.end = properties.start + properties.duration
    return update({ id, properties })
  }

  if(SELECT_BLOCK === type)
    return Object.assign({}, state, { selected: [ params.id ]})

  if(SELECT_BLOCKS === type)
    return Object.assign({}, state, { selected: [ ...state.selected, ...params.blocks ]})

  if(DESELECT_BLOCKS === type)
    return Object.assign({}, state, { selected: []})

  if(TOGGLE_SELECTION === type) {
    let selected = [ ...state.selected ]
    for (let id of params.blocks) {
      let pos = selected.indexOf(id)
      if (pos > -1)
        selected.splice(pos, 1)
      else
        selected.push(id)
    }
    return Object.assign({}, state, { selected })
  }

  if(CLEAR_SELECTION === type)
    return Object.assign({}, state, { selected: []})

  if(!type.startsWith('@'))
    return update(params)

  return state
}
