// @flow

import React, { Component } from 'react'

const Radio = (props) => {
  let options = Object.keys(props.properties)
  return <ol>
    {options.map(key =>
      <li key={key}>
        <label className='field'>
          <input type='radio' name={props.name} value={key} />
          <h4>{props.properties[key].title}</h4>
        </label>
      </li>
    )}
  </ol>
}

export default class Preferences extends Component {
  props: {
  }

  fields = {
    "display-additional-notes": {
      title: "Display of off-scale notes",
      type: 'radio',
      properties: {
        show: {
          title: 'Show all notes'
        },
        dim: {
          title: 'Dimmed',
          description: 'Highlight the notes belonging to the current scale'
        },
        hide: {
          title: 'Only scale',
          description: 'Hide notes that are not part of current scale'
        }
      }
    }
  }
  constructor (props) {
    super(props)
    this.state = {
    }
  }

  render () {
    return <div className='preferences panel'>

      {Object.keys(this.fields).map(name => {

        let setting = this.fields[name]

        let Field   = (props) => setting.type === 'radio' ?
          <Radio {...props} name={name} /> :
          null

        return <section key={name} className='group'>
          <h3>{setting.title}</h3>
          <Field {...setting} />
        </section>
      })}

    </div>
  }
}
