import { describe, expect, it } from 'vitest'
import reducer, {
  addToSelection,
  clearSelection,
  selectOne,
  setSelection,
  toggleSelection,
} from './selectionSlice'

describe('selectionSlice', () => {
  it('selectOne replaces the selection', () => {
    let state = reducer({ selectedIds: ['a', 'b'] }, selectOne('c'))
    expect(state.selectedIds).toEqual(['c'])
  })

  it('toggleSelection adds and removes ids', () => {
    let state = reducer({ selectedIds: ['a'] }, toggleSelection(['b']))
    expect(state.selectedIds).toEqual(['a', 'b'])
    state = reducer(state, toggleSelection(['a']))
    expect(state.selectedIds).toEqual(['b'])
  })

  it('addToSelection is idempotent', () => {
    const state = reducer({ selectedIds: ['a'] }, addToSelection(['a', 'b']))
    expect(state.selectedIds).toEqual(['a', 'b'])
  })

  it('setSelection dedupes', () => {
    const state = reducer({ selectedIds: [] }, setSelection(['a', 'a', 'b']))
    expect(state.selectedIds).toEqual(['a', 'b'])
  })

  it('clearSelection empties', () => {
    expect(reducer({ selectedIds: ['a'] }, clearSelection()).selectedIds).toEqual([])
  })
})
