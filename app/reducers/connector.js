import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

function get (comp) {
  let key = comp.store_key
  let actions = comp.actions // require(__dirname + '/../views/' + comp.name)[comp.name]
  console.warn("actions", actions)

  if (!key)
    throw new ReferenceError(`Components must have a static \`store_key\` property of type \`string\`.`, comp)

  if (!actions)
    throw new ReferenceError(`Components must have an object as a static \`actions\` property.`, comp)

  let mapState = state => {
    if (!state[key])
      throw new ReferenceError(`Store must have a key ${key} property.`, comp)
    return Object.assign({},
      state[key],
      { getState: () => state })
  }
  let mapDispatch = dispatch => {
    let bound = bindActionCreators(actions, dispatch)
    console.log(bound, actions)
    return bound

  }
  return [ mapState, mapDispatch ]
}

export default function connectComponent (comp) {
  let fn = get(comp)
  const connection = connect(...fn)
  return connection(comp)
}
