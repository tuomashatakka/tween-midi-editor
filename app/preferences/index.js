import { resolve } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'

let configuration = null

export const configFilePath = resolve(__dirname, '../preferences/configuration.json')

function read () {
  if (!existsSync(configFilePath))
    write({})
  if (!configuration)
    configuration = JSON.parse(readFileSync(configFilePath, 'utf8'))
  return Object.assign({}, configuration)
}

function write (config) {
  writeFileSync(configFilePath, JSON.stringify(config, null, 4), 'utf8')
  return Object.assign({}, config)
}

function save (config) {
  configuration = Object.assign({}, read(), config)
  return write(configuration)
}

function update (val, ...path) {
  let config  = read()
  let current = config
  let iter
  while(path.length) {
    iter = path.shift()
    if (!current[iter]) current[iter] = {}
    if (path.length) current = current[iter]
    else Object.assign(current, { [iter]: val })
  }
  return save(config)
}

export function set (descriptor, value) {
  let path = descriptor.split('.')
  return update(value, ...path)
}

export function get (...descriptors) {
  let path  = descriptors.length ? descriptors.join('.').split('.') : []
  let value = read()
  while (path.length) {
    let iter = path.shift()
    value    = value[iter]
  }
  return value
}

export function clear (...descriptors) {
  // YODO
  let path  = descriptors.length ? descriptors.join('.').split('.') : []
  return update({}, ...path)
}
