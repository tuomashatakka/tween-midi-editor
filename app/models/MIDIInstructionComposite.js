// @flow
import MIDILexer from './MIDILexer'
import fs from 'fs'
import { parseMidi, writeMidi } from 'midi-file'

import MIDIInstruction from './MIDIInstruction'

export type MIDIInstructions = Array<MIDIProperties>

export default class MIDIInstructionComposite {

  instructions: Array<MIDIInstruction>

  constructor () {
    this.instructions = []
  }

  static from (state): MIDIInstructionComposite {
    let list = new MIDIInstructionComposite()
    list.consumeState(state)
    return list
  }

  static fromFile (fp: string) {
    let track
    let list = new MIDIInstructionComposite()
    let file = fs.readFileSync(fp)

    let content = parseMidi(file)
    let lexer   = new MIDILexer(content)

    while (track = lexer.getNextTrack()) {
      let instructions = track.map(properties => MIDIInstruction.from({ properties }))
      list.instructions.push(...instructions)
    }
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
