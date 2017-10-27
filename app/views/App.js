// @flow
import type { Children } from 'react'
import type { GridProperties } from '../components/EditorGrid'

import React, { Component } from 'react'
import { connect } from 'react-redux'
import Preferences from './Preferences'
import * as action from '../actions/editor'


class App extends Component {

  props: {
    grid: GridProperties,
    view: Children,
    children: Children,
    preferences: Children,
    setBlockNote: Function,
    setBlockStart: Function,
    setBlockDuration: Function,
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
    let step = ( this.props.samples ) / (  g.sub )

    if (event.key === 'ArrowRight')

      if (event.shiftKey)
        return this.props.setBlockDuration(step)
      else
        return this.props.setBlockStart(step)

    if (event.key === 'ArrowLeft')
      if (event.shiftKey)
        return this.props.setBlockDuration(-step)
      else
        return this.props.setBlockStart(-step)

    if (event.key === 'ArrowUp')
      if (event.shiftKey)
        return this.props.setBlockNote(12)
      else
        return this.props.setBlockNote(1)

    if (event.key === 'ArrowDown')
      if (event.shiftKey)
        return this.props.setBlockNote(-12)
      else
        return this.props.setBlockNote(-1)

  }

  render() {
    return <div>
      {this.props.view}

      <section className='overlays'>
        {this.props.preferences ? <Preferences /> : null}
      </section>

    </div>
  }
}

function mapState (state, props) {
  let children    = props.children
  let samples     = state.editor.document.samples
  let grid        = state.editor.grid
  let view        = props.children
  let preferences = !! state.tool.preferences.isOpen ? <Preferences /> : null

  return {
    grid,
    view,
    children,
    preferences,
    samples,
  }
}

function mapDispatch (dispatch, props) {

  let setBlockNote = f => dispatch(action.setBlockNote(f))
  let setBlockStart = f => dispatch(action.setBlockStart(f))
  let setBlockDuration = l => dispatch(action.setBlockDuration(l))
  let setBlockVelocity = A => dispatch(action.setBlockVelocity(A))
  return {
    setBlockNote,
    setBlockStart,
    setBlockDuration,
    setBlockVelocity,
  }
}


export default connect(mapState, mapDispatch)(App)
