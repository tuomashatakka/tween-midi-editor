// @flow

const META_PROPERTIES = {
  setTempo: 'tempo',
  trackName: 'name',
  timeSignature: 'signature',
}

const META_PARSERS = {
  tempo: (o, field) => { o.tempo = field.microsecondsPerBeat },
  name: (o, field)  => { o.trackNames[field.track || 0] = field.text },
  signature: (o, field) => {
    o.signature = [ field.numerator, field.denominator ]
    o.metronome =   field.metronome
    o.thirtystm =   field.thirtyseconds
  }
}

export default class MIDILexer {

  constructor ({ header , tracks }) {
    console.log(header, tracks)
    this.format = header.format
    this.trackCount = header.numTracks
    this.samples = header.ticksPerBeat * 4
    this._meta = new Set()
    this.tracks = []

    this.tracks = tracks.map(track => Object.values(track))
    for (let track in this.tracks)
      this.tracks[track] = this.parse(track)
    window.lexer = this
  }

  get meta () {
    let { format, trackCount, samples } = this
    let meta   = [ ...this._meta ]
    let reduce = {
      format,
      samples,
      trackCount,
      trackNames: [],
    }
    for (let field of meta) {
      let name = META_PROPERTIES[field.type]
      let parse = META_PARSERS[name]
      if (!name || !parse)
        continue
      parse(reduce, field)
    }
    return reduce
  }

  getNextTrack () {
    this._current = (typeof this._current === 'number' ? this._current : -1) + 1
    return this.tracks[this._current]
  }

  parse (track) {
    let messages = [ ...this.tracks[track ]]
    let undisclosed = new WeakSet()
    let data  = []
    let dt    = 0
    let message

    const getLastUndisclosed = (message: any) =>
      data.reduceRight((part, query) => {
        if (null !== part)
          return part
        if ((message.noteNumber === query.note) && undisclosed.has(query)) {
          undisclosed.delete(query)
          return query
        }
      }, null)


    const updateUndisclosed = (message: any, fn: () => { duration: number, end: number }) => {
      let part = getLastUndisclosed(message)
      if (part)
        Object.assign(part, fn(part))
    }

    while (message = messages.shift()) {
      dt += message.deltaTime

      if (message.type === 'noteOn') {
        let piece = {
          ch: message.channel,
          note: message.noteNumber,
          velocity: message.velocity,
          start: dt,
        }
        data.push(piece)
        undisclosed.add(piece)
      }
      else if (message.type === 'noteOff') {
        updateUndisclosed(message, head => ({
          duration: dt - head.start,
          end: dt,
        }))
      }
      else if (message.meta)
        this._meta.add(
          Object.assign(message, { track })
        )
    }

    return data.map(item =>
      item.end ?
      item :
      Object.assign(item, { end: dt, duration: dt - item.start }))
  }

  // sort () {
  //   this.messages = this.messages.sort(
  //     (prev, next) => prev.deltaTime < next.deltaTime ? 0-1: prev.deltaTime > next.deltaTime ? 1 : 0)
  //
  //   console.warn(...this.messages.map(o=>o.deltaTime))
  // }
}
