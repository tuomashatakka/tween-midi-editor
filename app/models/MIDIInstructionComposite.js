// @flow
import M from './MIDILexer'
var fs = require('fs')
var parseMidi = require('midi-file').parseMidi
var writeMidi = require('midi-file').writeMidi

import MIDIInstruction from './MIDIInstruction'

export type MIDIInstructions = Array<MIDIProperties>

export default class MIDIInstructionComposite {

  instructions: Array<MIDIInstruction>

  static from (state): MIDIInstructionComposite {
    let list = new MIDIInstructionComposite()
    list.consumeState(state)
    return list
  }

  static fromFile (fp: string) {
    let list = new MIDIInstructionComposite()
    let f = fs.readFileSync(fp)
    let c = parseMidi(f)
    console.log(f, c)
    console.log(new M(c))
  }

  consumeState (state) {
    // TODO: Map to MIDIInstruction s
    this.instructions = state.editor.blocks.map(MIDIInstruction.from)
  }

  serialize (): MIDIInstructions {
    let data = []
    for (let instr of this.instructions)
      data.push(instr.serialize())
    return data
  }
}
