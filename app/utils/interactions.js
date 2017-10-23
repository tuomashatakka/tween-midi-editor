// @flow

import { CompositeDisposable, Disposable } from 'event-kit'
import React from 'react'


let xDown = null
let yDown = null
let direction = null

const boundElements = new WeakSet()
const swipeHandlers = new WeakMap()


export default function bindComponent (Component, handler) {
  console.log('el', Component)
  return (props) => (
    <span ref={ref => ref && addHandler(ref, handler)}>
      <Component {...props} />
    </span>
    )
}

export const onUp    = (element: any, handler: Function) => addHandler(element, 'up', handler)

export const onDown  = (element: any, handler: Function) => addHandler(element, 'down', handler)

export const onLeft  = (element: any, handler: Function) => addHandler(element, 'left', handler)

export const onRight = (element: any, handler: Function) => addHandler(element, 'right', handler)


function addListener (eventName, callback, target = document) {
  target.addEventListener(eventName, callback)
  return new Disposable(() => target.removeEventListener(eventName, callback))
}


function bindMoveEvents (element: HTMLElement) {

  if (!(element instanceof HTMLElement) || !element)
    throw new Error("Trying to bind touch events to an undefined element")

  let subs = new CompositeDisposable()

  if (boundElements.has(element))
    return subs

  const onStart = (e) => {
    let asubs = new CompositeDisposable()
    let detail = handleStart.call(element, e)
    console.info("Sttart", detail )

    const onEnd = (ev) => {
      handleEnd.call(element, ev, detail)
      asubs.dispose()
    }

    const onMove = (ev) => {
      let detail = handleMove.call(element, ev)
      console.info(detail)

    }

    asubs.add(
      addListener('mouseup',   onEnd),
      addListener('mousemove', onMove)
    )
  }

  subs.add(addListener('mousedown', onStart, element))

  boundElements.add(element)
  return subs
}



function addHandler (element, direction, handler) {
  let subs = bindMoveEvents(element)
  let handlersByDirection = swipeHandlers.get(element) || new Map()
  if (handler) {
    let handlersForDirection = handlersByDirection.get(direction) || new Set()
    handlersForDirection.add(handler)
    handlersByDirection.set(direction, handlersForDirection)
    swipeHandlers.set(element, handlersByDirection)
  }
  else {
    handler = direction
    let handlers = handlersByDirection.get('uni') || new Set()
    handlers.add(handler)
    handlersByDirection.set('uni', handlers)
    swipeHandlers.set(element, handlersByDirection)
  }
  return subs
}



function handleStart(evt) {
  console.info(evt)
  var x, y
  if (evt.touches && evt.touches.length) {
    x = evt.touches[0].clientX
    y = evt.touches[0].clientY
  }
  else {
    x = evt.clientX
    y = evt.clientY
  }
  xDown = x
  yDown = y
  return invoke({
    phase: 'start',
    delta: [ 0, 0 ],
    x, y, direction,
  })
}



function invoke (event, detail) {
  let directionlessHandlers = (swipeHandlers.get(this) || new Map()).get('uni') || new Set()
  let handlersForDirection = (swipeHandlers.get(this) || new Map()).get(direction) || new Set()
  console.log(detail, directionlessHandlers, "self.swipeahndlers:", swipeHandlers.get(this))
  for (let handler of handlersForDirection)
    handler.call(this, event, detail)
  for (let handler of directionlessHandlers)
    handler.call(this, event, detail)
  return detail
}



function handleEnd (event, detail) {
  return invoke(event, {
    ...detail,
    phase: 'end',
    direction
  })
}



function handleMove(evt) {
  if (!(xDown && yDown)) return
  var xUp = evt.touches ? evt.touches[0].clientX : evt.clientX
  var yUp = evt.touches ? evt.touches[0].clientY : evt.clientY
  var xDiff = xDown - xUp
  var yDiff = yDown - yUp
  let horizontal = Math.abs( xDiff ) > Math.abs( yDiff )
  xDown = null
  yDown = null

  if ( horizontal )
    if ( xDiff > 0 ) direction = 'left'
    else direction = 'right'

  else
    if ( yDiff > 0 ) direction = 'up'
    else direction = 'down'

  return invoke(event, {
    phase: 'move',
    delta: [ xDiff, yDiff ],
    direction,
  })
}
