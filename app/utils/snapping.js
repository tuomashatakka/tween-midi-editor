// @flow

type Bounds = {
  low: number,
  high: number ,
}

export default class SnapGrid {
  constructor (...co: Array<number>) {
    if (!co.length || typeof co[0] !== 'number')
      throw new TypeError(`SnapGrid constructor's parameters (snap coordinates) must be numerical values.`)
    this.grid = {
      x: [ co[0] ],
      y: [ co.length > 1 ? co[1] : co[0] ],
      offset: {
        x: 0,
        y: 0,
      }
    }
  }

  set vertical (...snap) {
    this.grid.y = snap
  }

  set horizontal (...snap) {
    this.grid.x = snap
  }

  locationForCoordinates (x, y): { x: number, y: number } {
    x = this.getHorizontalPosition(x)
    y = this.getVerticalPosition(y)
    console.warn(x, y)
    return { x, y }
  }

  locationForEvent (event: MouseEvent | TouchEvent): { x: number, y: number } {
    return this.locationForCoordinates(event.pageX, event.pageY)
  }

  locationForElement (el: HTMLElement): { x: Bounds, y: Bounds } {
    let rect = el.getBoundingClientRect()
    let x = this.getHorizontalPosition(rect.left)
    let y = this.getVerticalPosition(rect.top)
    let x2 = this.getHorizontalPosition(rect.left + rect.width)
    let y2 = this.getHorizontalPosition(rect.top + rect.height)
    return {
      x: {
        low: x,
        high: x2
      },
      y: {
        low: y,
        high: y2
      },
    }
  }

  getClosestPosition (pos: number, axis: 'x' | 'y' = 'x'): number {
    let ivy = 0, previous = 0
    let sequence = []
    let rehydrate = () => {
      sequence = [ ...this.grid[axis] ]
      return sequence
    }

    while (pos > ivy) {
      if (!sequence.length)
        sequence = rehydrate()
      console.log(pos, ivy, previous, sequence)
      previous = ivy
      ivy += sequence.shift()
    }
    return previous
  }

  getVerticalPosition   = (y: number): number =>  this.getClosestPosition(y, 'y')

  getHorizontalPosition = (x: number): number =>  this.getClosestPosition(x, 'x')

}
