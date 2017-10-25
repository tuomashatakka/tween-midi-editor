// @flow
import { Provider } from 'react-redux'
import React from 'react'

import App from './App'
import ToolMenu from './ToolMenu'
import Editor from './Editor'


type RootType = {
  store: {},
  history?: {}
}


export default function Root({ store }: RootType) {
  return (
    <Provider store={store}>

      <App dispatch={store.dispatch} >
        <ToolMenu />
        <Editor />
      </App>

    </Provider>
  )
}
