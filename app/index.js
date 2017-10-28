import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import Root from './views/Root'
import { configureStore, history } from './store/configureStore'
import { applyStyles, write } from './utils/theme'
import './styles/index.less'

const state = require('./store/initialState')
const store = configureStore(state)
const host  = document.getElementById('root')

const mount = (element, ComponentClass) => {
  applyStyles()
  write()
  render(
    <AppContainer>
      <ComponentClass store={store} history={history} />
    </AppContainer>,
    element
  )
}

mount(host, Root)

if (module.hot)
  module.hot.accept('./views/Root', () => {
  const Root = require('./views/Root')
  mount(host, Root)
})
