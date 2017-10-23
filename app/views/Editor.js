// @flow

import React, { Component } from 'react'
import {connect} from 'react-redux'
import decorate from '../reducers/connector'
import * as actions from '../actions/editor'
import Block from '../components/NoteBlock'
import EditorGrid from '../components/EditorGrid'

function getBlocks (state, note) {
  let blocks = state.editor.blocks
  return blocks.filter(block => block.properties.note === note)
}

export class Editor extends Component {
  props: {
    addBlock: Function,
    blocks: Array<any>,
  }
  static actions   = require('../actions/editor')
  static store_key = 'editor'
  tools = [
    'draw',
    'resize'
  ]

  constructor (props) {
    super(props)
    this.state = {
      visible: {
        x: 0,
        y: 0,
        x2: 100,
        y2: 128,
      },
      grid: {
        x: 100,
        y: 32,
        sub: 4,
      }
    }
  }

  render () {
    let note = this.state.visible.y2
    let grid = {
      size: '2.4rem',
      vertical: this.state.grid.y,
      horizontal: this.state.grid.x,
      sub: this.state.grid.sub,
    }
    let gridStyle = {
      minHeight: this.state.grid.y,
      lineHeight: this.state.grid.y + 'px',
    }
    let rows = []
    while (--note >= this.state.visible.y)
      rows.push( <BoundRow key={note} note={note} /> )

    return <div className='editor'>
      <div className='btn' onClick={() => this.props.addBlock({ note: 61 })}>
        Add
      </div>

      <article className='note-area'>

        <EditorGrid {...grid} />
        <div className='grid' style={gridStyle}>{rows}</div>
      </article>

    </div>
  }
}

export type RowType = {
  note: number,
  blocks: Array<BlockType>,
  addBlock: Function,
  clearSelection: Function,
}

const NOTE_NAMES = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
]

const Row = ({ note, blocks, addBlock, clearSelection }: RowType) => {
  let n = note % 12
  let name   = NOTE_NAMES[n]
  if (n === 3) {
    let octave = (note - n) / 12 - 1
    name += ' ' + octave
  }
  return <div
    className='row'>
    <div
      onClick={() => addBlock({ note })}
      className={'row-number'}>
      { name }
    </div>
    <div className={'row-content'}
      onClick={clearSelection}>
      { blocks.map(block => <Block
        id={block.id}
        key={block.id}
      />) }
    </div>
  </div>
}

const mapRowProps = (state, props) => {
  return {
    ...props,
    blocks: getBlocks(state, props.note),
  }
}

const mapRowDispatch = (dispatch, props) => ({
  addBlock: () => dispatch(actions.addBlock({ note: props.note })),
  clearSelection: () => dispatch(actions.clearSelection()),
})

const BoundRow = connect(mapRowProps, mapRowDispatch)(Row)

export default decorate(Editor)
