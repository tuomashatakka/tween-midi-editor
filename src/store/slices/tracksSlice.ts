import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'
import type { EntityState, PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_TRACK_ID, MIDI_CHANNELS } from '@/domain/constants'
import type { MidiChannel, Track, TrackId } from '@/domain/types'
import { trackColorAt } from '@/view/trackPalette'
import { deleteTrackWithNotes, loadDocument } from '../documentActions'


// No sortComparer: the adapter's `ids` array *is* the display and export order.
// A separate order array would be a second source of truth that desyncs on
// add/remove.
export const tracksAdapter = createEntityAdapter<Track>()

export type TracksState = EntityState<Track, TrackId>

const clampChannel = (c: number): MidiChannel =>
  Math.max(0, Math.min(MIDI_CHANNELS - 1, Math.round(c)))

const makeTrack = (id: TrackId, index: number, channel: MidiChannel): Track => ({
  id,
  name:    `Track ${index + 1}`,
  color:   trackColorAt(index),
  channel,
  muted:   false,
  soloed:  false,
  visible: true,
  // A brand new track is locked, so only the active track is editable until the
  // drawer's lock switch says otherwise. The very first track is the active one,
  // which ignores this flag anyway.
  locked:  index > 0,
})

/** Lowest channel not already taken, falling back to a wrap once all 16 are used. */
const nextFreeChannel = (state: TracksState): MidiChannel => {
  const taken = new Set(state.ids.map(id => state.entities[id]?.channel))
  for (let c = 0; c < MIDI_CHANNELS; c++)
    // Channel 9 is GM percussion but is deliberately not skipped: the rule stays
    // obvious and the channel is user-editable in the drawer.
    if (!taken.has(c))
      return c
  return state.ids.length % MIDI_CHANNELS
}

const initialState: TracksState = tracksAdapter.getInitialState(
  {},
  [ makeTrack(DEFAULT_TRACK_ID, 0, 0) ],
)

const tracksSlice = createSlice({
  name:     'tracks',
  initialState,
  reducers: {

    // The reducer derives name/colour/channel because `prepare` cannot read
    // state; the id is the only non-deterministic input.
    addTrack: {
      reducer: (state, action: PayloadAction<{ id: TrackId }>) => {
        tracksAdapter.addOne(
          state,
          makeTrack(action.payload.id, state.ids.length, nextFreeChannel(state)),
        )
      },
      prepare: (id?: TrackId) => ({ payload: { id: id ?? nanoid() }}),
    },

    /** No-op on the last track: the editor always has at least one. */
    removeTrack: (state, action: PayloadAction<TrackId>) => {
      if (state.ids.length <= 1)
        return
      tracksAdapter.removeOne(state, action.payload)
    },

    renameTrack: (state, action: PayloadAction<{ id: TrackId; name: string }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.name = action.payload.name.trim() || track.name
    },

    setTrackColor: (state, action: PayloadAction<{ id: TrackId; color: string }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.color = action.payload.color
    },

    setTrackChannel: (state, action: PayloadAction<{ id: TrackId; channel: number }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.channel = clampChannel(action.payload.channel)
    },

    setTrackMuted: (state, action: PayloadAction<{ id: TrackId; muted: boolean }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.muted = action.payload.muted
    },

    setTrackSoloed: (state, action: PayloadAction<{ id: TrackId; soloed: boolean }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.soloed = action.payload.soloed
    },

    setTrackVisible: (state, action: PayloadAction<{ id: TrackId; visible: boolean }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.visible = action.payload.visible
    },

    setTrackLocked: (state, action: PayloadAction<{ id: TrackId; locked: boolean }>) => {
      const track = state.entities[action.payload.id]
      if (track)
        track.locked = action.payload.locked
    },

    /** Reassign display order; ignored unless the payload is a permutation of the current ids. */
    reorderTracks: (state, action: PayloadAction<TrackId[]>) => {
      const next = action.payload
      if (next.length !== state.ids.length)
        return
      if (!next.every(id => state.entities[id] !== undefined))
        return
      if (new Set(next).size !== next.length)
        return
      state.ids = next
    },

    /** Replace the whole track list (file import). Ignored for an empty list. */
    setAllTracks: (state, action: PayloadAction<Track[]>) => {
      if (action.payload.length === 0)
        return
      tracksAdapter.setAll(state, action.payload)
    },
  },

  // Document-wide actions are handled here and in notesSlice so they undo as a
  // single step. See src/store/documentActions.ts.
  extraReducers: builder => {
    builder
      .addCase(deleteTrackWithNotes, (state, action) => {
        if (state.ids.length <= 1)
          return
        tracksAdapter.removeOne(state, action.payload.trackId)
      })
      .addCase(loadDocument, (state, action) => {
        if (action.payload.tracks.length === 0)
          return
        tracksAdapter.setAll(state, action.payload.tracks)
      })
  },
})

export const {
  addTrack,
  removeTrack,
  renameTrack,
  setTrackColor,
  setTrackChannel,
  setTrackMuted,
  setTrackSoloed,
  setTrackVisible,
  setTrackLocked,
  reorderTracks,
  setAllTracks,
} = tracksSlice.actions

export default tracksSlice.reducer
