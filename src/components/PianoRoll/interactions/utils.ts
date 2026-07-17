// Shared helpers for the interaction hooks.

export interface ClientPointLike {
  clientX:       number
  clientY:       number
  currentTarget: EventTarget & Element
}

/** Convert an event's client coordinates to canvas-local pixels. */
export const localPoint = (e: ClientPointLike): [number, number] => {
  const rect = e.currentTarget.getBoundingClientRect()
  return [ e.clientX - rect.left, e.clientY - rect.top ]
}
