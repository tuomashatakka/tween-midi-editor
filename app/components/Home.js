// @flow
import React, { Component } from 'react'
import ToolMenu from '../views/ToolMenu.js'

export default class Home extends Component {

  // eslint-disable-next-line
  render () {
    return (
      <section>
        <nav>
          <ToolMenu />
        </nav>
      </section>
    )
  }
}
