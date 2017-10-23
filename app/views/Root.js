// @flow
import React from 'react'
import { Provider } from 'react-redux'
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
      <App dispatch={store.dispatch}>
        <ToolMenu />
        <Editor />
      </App>
    </Provider>
  )
}
