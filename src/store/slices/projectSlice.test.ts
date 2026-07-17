import { describe, expect, it } from 'vitest'
import reducer, { markClean, markDirty, setFileName } from './projectSlice'


const initial = reducer(undefined, { type: '@@INIT' })

describe('projectSlice', () => {
  it('starts clean and unnamed', () => {
    expect(initial).toEqual({ fileName: null, dirty: false })
  })

  it('sets and clears the file name', () => {
    const named = reducer(initial, setFileName('song.mid'))
    expect(named.fileName).toBe('song.mid')
    expect(reducer(named, setFileName(null)).fileName).toBeNull()
  })

  it('marks dirty and clean', () => {
    const dirty = reducer(initial, markDirty())
    expect(dirty.dirty).toBe(true)
    expect(reducer(dirty, markClean()).dirty).toBe(false)
  })
})
