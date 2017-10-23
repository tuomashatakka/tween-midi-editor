// @flow
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { createHashHistory } from 'history'
import { createStore, applyMiddleware, compose } from 'redux'

import rootReducer from '../reducers'
import * as counterActions from '../actions/counter'
import * as toolActions from '../actions/tool'

const history = createHashHistory()

const configureStore = (initialState: {}) => {
  const middleware = []
  const enhancers = []

  // Thunk Middleware
  middleware.push(thunk)

  // Logging Middleware
  const logger = createLogger({
    level: 'info',
    collapsed: true
  })
  middleware.push(logger)

  // Redux DevTools Configuration
  const actionCreators = {
    ...counterActions,
    ...toolActions,
  }
  console.log(actionCreators)
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ actionCreators })
    : compose
  enhancers.push(applyMiddleware(...middleware))

  const enhancer = composeEnhancers(...enhancers)
  console.log(initialState)
  const store = createStore(rootReducer, initialState, enhancer)

  if (module.hot)
    module.hot.accept('../reducers', () => store.replaceReducer(require('../reducers')))
  return store
}

export default { configureStore, history }
