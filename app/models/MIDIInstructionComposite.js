// @flow
import MIDILexer from './MIDILexer'
import fs from 'fs'
import { parseMidi, writeMidi } from 'midi-file'

import MIDIInstruction from './MIDIInstruction'

export type Instructions = {
  notes: Array<{
    velocity: number,
    note: number,
    start: number,
    end: number,
  }>,
  properties: {
    title?: string,
    tempo?: number,
    format: number,
    samples: number,
    trackCount: number,
    trackNames: Array<string>,
    signature: Array<number>,
    metronome: number,
    thirtystm: number,
  }
}

export default class MIDIInstructionComposite {

  instructions: Array<MIDIInstruction>

  constructor (props: {} = {}, instructions: Array<MIDIInstruction>) {
    this.instructions = instructions
    this.properties   = props
  }

  static from (state): MIDIInstructionComposite {
    let list = new MIDIInstructionComposite()
    list.consumeState(state)
    return list
  }

  static fromFile (fp: string) {
    let track
    let instructions = []
    let file    = fs.readFileSync(fp)
    let content = parseMidi(file)
    let lexer   = new MIDILexer(content)

    while (track = lexer.getNextTrack()) {
      let chunk  = track.map(properties => MIDIInstruction.from({ properties }))
      instructions.push(...chunk)
    }

    return new MIDIInstructionComposite(lexer.meta, instructions)
  }

  consumeState (state) {
    // TODO: Map to MIDIInstruction s
    this.instructions = state.editor.blocks.map(MIDIInstruction.from)
  }

  serialize (): Instructions {
    let notes = []
    let properties = this.properties
    for (let instr of this.instructions)
      notes.push(instr.serialize())
    return {
      notes,
      properties,
    }
  }
}
