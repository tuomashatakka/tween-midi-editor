// @flow

import React from 'react'
import { connect } from 'react-redux'
// import bindMove from '../utils/interactions'
import { selectBlock, toggleSelection, setBlockStart, setBlockDuration } from '../actions/editor'

export type Note = {

}

const getBlockPosition = (block, delta) => {
  let { properties, samples, grid } = block
  let { start, end } = properties
  let { horizontal: w } = grid
  let x  = start / samples * w
  let x2 = (end - start) / samples * w
  return {
    left: (x + delta[0]) + 'px',
    width: (x2 + delta[2]) + 'px',
  }
}

const toSamples = (block, px) => {
  let { samples, grid } = block
  let { horizontal: w } = grid
  let value = px * samples / w
  return value
}

const mapBlockProperties = (state, props) => {
  let block = state.editor.blocks.find(iter => iter.id === props.id)
  return {
    id: block.id,
    properties: {
      ...block.properties,
      end: Math.max(block.properties.end, block.properties.start),
      duration: block.properties.end - block.properties.start,
    },
    selected: state.editor.selected.indexOf(block.id) > -1,
    mode: state.tool.tool,
    grid: state.editor.grid,
    samples: state.editor.document.samples,
    signature: state.editor.document.signature,
  }
}

const mapBlockDispatch = (dispatch, props, ...args) => {
  return {
    select: (event) => {
      if (!event.shiftKey)
        dispatch(selectBlock(props.id))
      else
        dispatch(toggleSelection(props.id))
    },
    move: (diff) => {
      if (diff)
        dispatch(setBlockStart(props.id, diff))
    },
    resize: (diff) => {
      if (diff)
        dispatch(setBlockDuration(props.id, diff))
    },
  }
}

class NoteBlock extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      move: false,
      co: [],
      delta: [ 0, 0, 0, 0 ],
    }
    this.onDrag = this.onDrag.bind(this)
    this.onDragEnd = this.onDragEnd.bind(this)
    this.onDragStart = this.onDragStart.bind(this)
  }

  onDragStart (event) {
    if (!this.props.selected || event.shiftKey)
      this.props.select(event)
    this.setState({
      move: true,
      co: [ event.clientX, event.clientY ],
      delta: [ 0, 0, 0, 0 ]
    })
    document.addEventListener('mousemove', this.onDrag)
    document.addEventListener('mouseup', this.onDragEnd)
    event.stopPropagation()
    return false
  }

  onDrag (event) {
    let g        = this.props.grid
    let [ x, y ] = this.state.co
    let dx       = (event.clientX - x)
    let dy       = event.clientY - y
    let snap_x   = g.horizontal / g.sub
    let snap_y   = g.vertical / g.sub
    let edge_x   = (dx % snap_x) > snap_x / 2 ? 1 : 0
    let edge_y   = (dy % snap_y) > snap_y / 2 ? 1 : 0
    dx = dx - dx % snap_x + edge_x * snap_x
    dy = dy - dy % snap_y + edge_y * snap_y

    let delta = (this.props.mode === 'resize')
      ? [ 0, 0, dx, dy ]
      : [ dx, dy, 0, 0 ]
    this.setState({ delta })
    event.stopPropagation()
    return false
  }

  onDragEnd (event) {
    let block = this.props
    if (this.props.mode === 'resize') {
      let amount = toSamples(block, this.state.delta[2])
      this.props.resize(amount + this.props.properties.duration)
    }
    else {
      let amount = toSamples(block, this.state.delta[0])
      this.props.move(amount + this.props.properties.start)
    }
    this.setState({ move: false, co: [ event.clientX, event.clientY ], delta: [ 0, 0, 0, 0 ] })
    document.removeEventListener('mousemove', this.onDrag)
    document.removeEventListener('mouseup', this.onDragEnd)
    event.stopPropagation()
    return false
  }

  render () {
    let block = this.props
    let className = 'note block'
    if (block.selected)
      className += ' selected'
    return <span
      className={className}
      onMouseDown={this.onDragStart}
      style={getBlockPosition(block, this.state.delta)}
      key={block.id}>
      {block.properties.note}
    </span>
  }
}

export default connect(mapBlockProperties, mapBlockDispatch)(NoteBlock)
