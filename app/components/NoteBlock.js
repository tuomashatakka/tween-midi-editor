// @flow

import React from 'react'
import { connect } from 'react-redux'
// import bindMove from '../utils/interactions'
import { selectBlock, toggleSelection, setBlockStart, setBlockDuration } from '../actions/editor'

const getBlockPosition = (block, d) => {
  let { start, end } = block.properties
  return {
    left: (start + d[0]) + 'px',
    width: (end - start + d[2]) + 'px',
  }
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
  }
}

const mapBlockDispatch = (dispatch, props) => {
  return {
    select: (event) => {
      if (!event.shiftKey)
        dispatch(selectBlock(props.id))
      else
        dispatch(toggleSelection(props.id))

      event.stopPropagation()
      return false
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
    this.props.select(event)
    this.setState({ move: true, co: [ event.clientX, event.clientY ], delta: [ 0, 0, 0, 0 ] })
    document.addEventListener('mousemove', this.onDrag)
    document.addEventListener('mouseup', this.onDragEnd)
  }

  onDrag (event) {
    let [ x, y ] = this.state.co
    let dx = event.clientX - x
    let dy = event.clientY - y
    let delta = (this.props.mode === 'resize')
      ? [ 0, 0, dx, dy ]
      : [ dx, dy, 0, 0 ]
    this.setState({ delta })
  }

  onDragEnd (event) {
    if (this.props.mode === 'resize')
      this.props.resize(this.state.delta[2] + this.props.properties.duration)
    else
      this.props.move(this.state.delta[0] + this.props.properties.start)

    this.setState({ move: false, co: [ event.clientX, event.clientY ], delta: [ 0, 0, 0, 0 ] })
    document.removeEventListener('mousemove', this.onDrag)
    document.removeEventListener('mouseup', this.onDragEnd)
  }

  render () {
    let block = this.props
    let className = 'note block'
    if (block.selected)
      className += ' selected'
    return <span
      className={className}
      onMouseDown={this.onDragStart}
      onClick={block.select}
      style={getBlockPosition(block, this.state.delta)}
      key={block.id}>
      {block.properties.note}
    </span>
  }
}

export default connect(mapBlockProperties, mapBlockDispatch)(NoteBlock)
