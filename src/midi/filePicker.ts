// Transient <input type="file"> wrapper for opening a MIDI file. Callable from
// both toolbar clicks and keyboard shortcuts (keydown counts as activation).

export function openMidiPicker (): Promise<File | null> {
  return new Promise(resolve => {
    const input  = document.createElement('input')
    input.type   = 'file'
    input.accept = '.mid,.midi,audio/midi'

    input.addEventListener('change', () => {
      resolve(input.files?.[0] ?? null)
    })
    // No reliable cancel event exists across browsers; resolving on the next
    // focus return would be brittle. Unresolved promises are garbage-collected
    // with the input, so leaking a cancelled pick is harmless.
    input.click()
  })
}
