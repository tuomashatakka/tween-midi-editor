// @flow
import React, { Component } from 'react'
import type { Children } from 'react'
import { setBlockNote, setBlockStart, setBlockDuration } from '../actions/editor'

export default class App extends Component {

  props: {
    children: Children,
    dispatch: Function,
  }

  componentWillMount () {
    this.resolveKey = this._resolveKey.bind(this)
    document.addEventListener('keydown', this.resolveKey)
  }

  componentWillUnmount () {
    document.removeEventListener('keydown', this.resolveKey)
  }

  _resolveKey (event) {
    console.log(event.key, event.shiftKey)
    if (event.key === 'ArrowRight')
      if (event.shiftKey)
        return this.props.dispatch(setBlockDuration(20))
      else
        return this.props.dispatch(setBlockStart(20))
    if (event.key === 'ArrowLeft')
      if (event.shiftKey)
        return this.props.dispatch(setBlockDuration(-20))
      else
        return this.props.dispatch(setBlockStart(-20))
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
