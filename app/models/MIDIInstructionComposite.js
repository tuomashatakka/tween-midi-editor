// @flow

import MIDIInstruction from './MIDIInstruction'

export type MIDIInstructions = Array<MIDIProperties>

export default class MIDIInstructionComposite {

  instructions: Array<MIDIInstruction>

  static from (state): MIDIInstructionComposite {
    let list = new MIDIInstructionComposite()
    list.consumeState(state)
    return list
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
