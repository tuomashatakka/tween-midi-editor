// The single point where the live-MIDI layer reads track state. Everything
// else in `src/midi/io` takes these as provider callbacks, following the
// EngineProviders pattern, so no engine or manager imports a slice directly.

import type { AppStore } from '@/store/store'
import { DEFAULT_ROUTING } from '@/store/slices/midiSlice'
import type { TrackRouting } from '@/store/slices/midiSlice'
import { selectAllTracks } from '@/store/selectors/trackSelectors'
import { selectRecordTargets, selectRouting } from '@/store/selectors/midiSelectors'
import type { MidiChannel, Track, TrackId } from '@/domain/types'


export interface RoutedTrack {
  id:      TrackId
  channel: MidiChannel
  routing: TrackRouting
}

export interface RoutingProvider {
  getRouting:       (trackId: TrackId) => TrackRouting
  getChannel:       (trackId: TrackId) => MidiChannel
  getRecordTargets: () => RoutedTrack[]
}

export const createRoutingProvider = (store: AppStore): RoutingProvider => {
  const trackById = (id: TrackId): Track | undefined =>
    selectAllTracks(store.getState()).find(t => t.id === id)

  return {
    getRouting: id => selectRouting(store.getState())[id] ?? DEFAULT_ROUTING,
    getChannel: id => trackById(id)?.channel ?? 0,

    getRecordTargets: () => {
      const state   = store.getState()
      const routing = selectRouting(state)
      return selectRecordTargets(state).map(track => ({
        id:      track.id,
        channel: track.channel,
        routing: routing[track.id] ?? DEFAULT_ROUTING,
      }))
    },
  }
}
