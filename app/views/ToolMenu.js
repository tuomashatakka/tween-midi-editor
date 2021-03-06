// @flow

import React, { Component } from 'react'
import connect from '../reducers/connector'

export class ToolMenu extends Component {
  props: {
    setTool: Function,
    tool: string | null,
  }
  static actions   = require('../actions/tool')
  static store_key = 'tool'
  tools = [
    'draw',
    'resize'
  ]

  render () {
    return <ul>
      {this.tools.map((tool) => <ToolButton
        select={() => this.props.setTool(tool)}
        isSelected={tool === this.props.tool}
        name={tool}
        key={tool}
      />)}
    </ul>
  }
}

export type ToolButtonType = {
  name: string,
  isSelected: boolean,
  select: Function,
}

const ToolButton = ({ name, select, isSelected }: ToolButtonType) => {
  let className = 'btn tool'
  if (isSelected)
    className += ' selected'

  return <li onClick={select} className={className}>
    {name}
  </li>
}

export default connect(ToolMenu)
