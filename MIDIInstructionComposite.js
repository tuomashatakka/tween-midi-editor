// @flow

import type { MIDIInstruction } from './MIDIInstruction'

type MIDIInstructions = Array<MIDIInstruction>

export default class MIDIInstructionComposite {

  blocks: Array<MIDIInstruction>

  consumeState (state) {
    // TODO: Map to MIDIInstruction s
    this.blocks = state.editor.blocks.map(block => block)
  }

  serialize (): MIDIInstructions {
    let data = []
    for (let block of this.blocks) {
      data.push(block.serialize())
    }
    return data
  }
}
