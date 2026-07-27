import { Plus, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTrackDrawerOpen } from '@/store/slices/toolSlice'
import {
  selectActiveTrackId,
  selectAllTracks,
} from '@/store/selectors/trackSelectors'
import { selectMidiOutputs, selectRouting } from '@/store/selectors/midiSelectors'
import { createTrack } from '@/thunks/trackThunks'
import { DEFAULT_ROUTING } from '@/store/slices/midiSlice'
import { TrackRow } from './TrackRow'


/**
 * Left drawer listing the project's tracks. Rendered as a flex sibling of the
 * piano roll rather than an overlay, so the canvas simply reflows — its
 * ResizeObserver already keeps the viewport in sync.
 */
export const TrackDrawer = () => {
  const dispatch = useAppDispatch()
  const tracks   = useAppSelector(selectAllTracks)
  const activeId = useAppSelector(selectActiveTrackId)
  const routing  = useAppSelector(selectRouting)
  const outputs  = useAppSelector(selectMidiOutputs)

  return <aside className="track-drawer" aria-label="Tracks">
    <header className="track-drawer__header">
      <h2>Tracks</h2>

      <div className="track-drawer__header-actions">
        <button
          type="button"
          className="tool-btn"
          aria-label="Add track"
          title="Add track"
          onClick={ () => dispatch(createTrack()) }>
          <Plus size={ 16 } />
        </button>

        <button
          type="button"
          className="tool-btn"
          aria-label="Close tracks"
          title="Close tracks (T)"
          onClick={ () => dispatch(setTrackDrawerOpen(false)) }>
          <X size={ 16 } />
        </button>
      </div>
    </header>

    <ul className="track-drawer__list" role="listbox" aria-label="Track list">
      {tracks.map(track => {
        const route = routing[track.id] ?? DEFAULT_ROUTING
        return <TrackRow
          key={ track.id }
          track={ track }
          active={ track.id === activeId }
          armed={ route.armed }
          outputId={ route.outputId }
          outputs={ outputs }
          canDelete={ tracks.length > 1 } />
      })}
    </ul>
  </aside>
}
