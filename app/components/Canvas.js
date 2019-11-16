// @flow
import React, { Component, createRef } from "react"

type CanvasProps = {
  width:  number,
  height: number,
}

class Canvas extends Component<CanvasProps> {

  node = null

  constructor(props) {
    super(props)
    this.paint = this.paint.bind(this)
  }

  componentDidUpdate() {
    this.paint()
  }

  get drawingContext () {
    if (this.node)
      return this.node.getContext("2d")
    return null
  }

  paint() {
    const { width, height } = this.props
    const context = this.drawingContext

    if (!context)
      return

    context.clearRect(0, 0, width, height)
    context.save()

    context.fillStyle = "#F00"
    context.fillRect(20, 20, 100, 40)
    context.restore()
  }

  render() {
    const { width, height } = this.props
    return (
      <canvas
        ref={ (ref) => ref && (this.node = ref) }
        width={width}
        height={height}
      />
    );
  }
}

type CanvasStateProps = {
}

type CanvasStateState = {
  width:  number,
  height: number,
}

export default class CanvasState extends Component<CanvasStateProps, CanvasStateState> {

  updateRequest: *
  unsubscribe: *

  state = {
    width: 0,
    height: 0,
    rotation: 0
  }

  constructor(props) {
    super(props);
    this.update = this.update.bind(this)
  }

  componentDidMount() {

    const updateDimensions = () => {
      this.setState({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', updateDimensions)
    updateDimensions()

    this.updateRequest = requestAnimationFrame(this.update)
    this.unsubscribe = () => window.removeEventListener('resize', updateDimensions)

  }

  componentWillUnmount () {
    cancelAnimationFrame(this.updateRequest)
    this.unsubscribe()
  }

  update () {
    this.updateRequest = requestAnimationFrame(this.update)
  }

  render () {
    return <Canvas
      width={ this.state.width }
      height={ this.state.height }
    />
  }
}
