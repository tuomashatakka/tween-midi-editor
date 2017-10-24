// @flow

/**
 * @class MIDIInstruction
 * @namespace MIDIInstruction
 */

const sources = new WeakMap()

export type MIDIProperties = {
  velocity?: number,
  start?: number,
  note?: number,
  end?: number,
}

export default class MIDIInstruction {

  static from (block): MIDIInstruction {
    let instr = new MIDIInstruction()
    sources.set(instr, block)
    return instr
  }
  get end () {      return sources.get(this).properties.end }
  get note () {     return sources.get(this).properties.note }
  get start () {    return sources.get(this).properties.start }
  get velocity () { return sources.get(this).properties.velocity }

  serialize (): MIDIProperties {
    let { velocity, note, start, end } = this
    return { velocity, note, start, end }
  }

}
