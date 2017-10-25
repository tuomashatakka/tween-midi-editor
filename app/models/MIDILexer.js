

export default class MIDILexer {

  constructor (m) {
    this.messages = Object.values(m.tracks[1])
    this.sort()
  }

  sort () {
    this.messages = this.messages.sort(
      (prev, next) => prev.deltaTime < next.deltaTime ? 0-1: prev.deltaTime > next.deltaTime ? 1 : 0)

    console.warn(...this.messages.map(o=>o.deltaTime))
  }
  findTail (head) {

  }
}
