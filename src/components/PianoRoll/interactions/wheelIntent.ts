// Pure mapping from a wheel event's deltas + modifiers to an editor intent.
// Kept free of React/DOM so the priority rules are unit-testable.

export type WheelIntent =
  | { kind: 'zoomX'; factor: number } |
  { kind: 'zoomY'; factor: number } |
  { kind: 'pan'; dxPx: number; dyPx: number }

export interface WheelInput {
  deltaX:   number
  deltaY:   number
  ctrlKey:  boolean
  metaKey:  boolean
  altKey:   boolean
  shiftKey: boolean
}

// Exponential factor keeps pinch-quality trackpad deltas smooth while a
// notched mouse wheel click (deltaY ~100) lands near the familiar 1.25x step.
const wheelZoomFactor = (deltaY: number): number => Math.exp(-deltaY * 0.0022)

export function resolveWheelIntent (e: WheelInput): WheelIntent {
  if (e.ctrlKey || e.metaKey)
    return { kind: 'zoomX', factor: wheelZoomFactor(e.deltaY) }
  if (e.altKey)
    return { kind: 'zoomY', factor: wheelZoomFactor(e.deltaY) }
  if (e.shiftKey)
    // Vertical-scroll fallback. Browsers disagree on whether shift moves the
    // delta into deltaX; passing both through handles either convention.
    return { kind: 'pan', dxPx: -e.deltaX, dyPx: -e.deltaY }
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY))
    // Dominant horizontal axis: trackpad sideways swipe pans the timeline.
    return { kind: 'pan', dxPx: -e.deltaX, dyPx: 0 }
  return { kind: 'zoomX', factor: wheelZoomFactor(e.deltaY) }
}
