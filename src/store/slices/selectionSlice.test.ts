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
    const state = reducer({ selectedIds: [ 'a', 'b' ], activeTrackId: 't1' }, selectOne('c'))
    expect(state.selectedIds).toEqual([ 'c' ])
  })

  it('toggleSelection adds and removes ids', () => {
    let state = reducer({ selectedIds: [ 'a' ], activeTrackId: 't1' }, toggleSelection([ 'b' ]))
    expect(state.selectedIds).toEqual([ 'a', 'b' ])
    state = reducer(state, toggleSelection([ 'a' ]))
    expect(state.selectedIds).toEqual([ 'b' ])
  })

  it('addToSelection is idempotent', () => {
    const state = reducer({ selectedIds: [ 'a' ], activeTrackId: 't1' }, addToSelection([ 'a', 'b' ]))
    expect(state.selectedIds).toEqual([ 'a', 'b' ])
  })

  it('setSelection dedupes', () => {
    const state = reducer({ selectedIds: [], activeTrackId: 't1' }, setSelection([ 'a', 'a', 'b' ]))
    expect(state.selectedIds).toEqual([ 'a', 'b' ])
  })

  it('clearSelection empties', () => {
    expect(reducer({ selectedIds: [ 'a' ], activeTrackId: 't1' }, clearSelection()).selectedIds).toEqual([])
  })
})
