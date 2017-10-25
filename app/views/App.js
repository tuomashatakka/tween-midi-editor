// @flow
import type { Children } from 'react'
import type { GridProperties } from '../components/EditorGrid'

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { setBlockNote, setBlockStart, setBlockDuration } from '../actions/editor'


class App extends Component {

  props: {
    children: Children,
    dispatch: Function,
    grid: GridProperties,
  }

  componentWillMount () {
    this.resolveKey = this._resolveKey.bind(this)
    document.addEventListener('keydown', this.resolveKey)
  }

  componentWillUnmount () {
    document.removeEventListener('keydown', this.resolveKey)
  }

  _resolveKey (event) { // eslint-disable-line complexity

    let g = this.props.grid

    if (event.key === 'ArrowRight')
      if (event.shiftKey)
        return this.props.dispatch(setBlockDuration(g.size))
      else
        return this.props.dispatch(setBlockStart(g.size))
    if (event.key === 'ArrowLeft')
      if (event.shiftKey)
        return this.props.dispatch(setBlockDuration(-g.size))
      else
        return this.props.dispatch(setBlockStart(-g.size))
    if (event.key === 'ArrowUp')
      if (event.shiftKey)
        return this.props.dispatch(setBlockNote(12))
      else
        return this.props.dispatch(setBlockNote(1))
    if (event.key === 'ArrowDown')
      if (event.shiftKey)
        return this.props.dispatch(setBlockNote(-12))
      else
        return this.props.dispatch(setBlockNote(-1))

  }

  render() {
    return <div>
      {this.props.children}
    </div>
  }
}

function mapState (state, props) {
  let grid = state.editor.grid
  return {
    ...props,
    grid,
  }
}


export default connect(mapState)(App)
