import { Circle, Eye, EyeOff, Lock, LockOpen, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { renameTrack, setTrackChannel, setTrackColor, setTrackMuted, setTrackSoloed } from '@/store/slices/tracksSlice'
import { setTrackArmed, setTrackOutput } from '@/store/slices/midiSlice'
import {
  activateTrack,
  deleteTrack,
  toggleTrackLock,
  toggleTrackVisibility,
} from '@/thunks/trackThunks'
import { MIDI_CHANNELS } from '@/domain/constants'
import type { MidiPortInfo, Track } from '@/domain/types'


interface TrackRowProps {
  track:     Track
  active:    boolean
  armed:     boolean
  outputId:  string | null
  outputs:   MidiPortInfo[]
  canDelete: boolean
}

const CHANNELS = Array.from({ length: MIDI_CHANNELS }, (_, i) => i)

export const TrackRow = ({
  track,
  active,
  armed,
  outputId,
  outputs,
  canDelete,
}: TrackRowProps) => {
  const dispatch          = useAppDispatch()
  const [ name, setName ] = useState(track.name)

  // Mirror the store while the field is not being edited, so an undo or an
  // import is reflected without fighting the user's keystrokes.
  useEffect(() => setName(track.name), [ track.name ])

  // Commit on blur/Enter rather than per keystroke: a rename should be one
  // dirty-flag flip, not one per character.
  const commitName = () => {
    if (name !== track.name)
      dispatch(renameTrack({ id: track.id, name }))
  }

  // Clicking anywhere in the row selects the track, except on the controls it
  // contains — an absolutely positioned overlay button would be covered by them.
  const activateFromRow = (target: EventTarget | null) => {
    if (target instanceof Element && target.closest('button, input, select'))
      return
    dispatch(activateTrack(track.id))
  }

  return <li
    className={ `track-row${active ? ' track-row--active' : ''}` }
    style={{ '--track-color': track.color } as React.CSSProperties}
    role="option"
    aria-selected={ active }
    aria-label={ `Track ${track.name}` }
    tabIndex={ 0 }
    onClick={ e => activateFromRow(e.target) }
    onKeyDown={ e => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        dispatch(activateTrack(track.id))
      }
    } }>

    <label className="track-row__swatch" title="Track colour">
      <span className="track-row__swatch-dot" />

      <input
        type="color"
        aria-label={ `Colour of ${track.name}` }
        value={ track.color }
        onChange={ e => dispatch(setTrackColor({ id: track.id, color: e.target.value })) } />
    </label>

    <input
      className="track-row__name"
      aria-label={ `Name of ${track.name}` }
      value={ name }
      // Reaching for a track's name — by click or by tab — means you intend to
      // work on it. The row handler cannot cover this: it deliberately ignores
      // clicks on inputs so the controls do not steal the active track.
      onFocus={ () => dispatch(activateTrack(track.id)) }
      onChange={ e => setName(e.target.value) }
      onBlur={ commitName }
      onKeyDown={ e => {
        if (e.key === 'Enter')
          e.currentTarget.blur()
      } } />

    <div className="track-row__controls">
      <button
        type="button"
        className={ `tool-btn tool-btn--tiny${armed ? ' tool-btn--rec' : ''}` }
        aria-label={ `Record arm ${track.name}` }
        aria-pressed={ armed }
        title="Record arm"
        onClick={ () => dispatch(setTrackArmed({ id: track.id, armed: !armed })) }>
        <Circle size={ 12 } />
      </button>

      <button
        type="button"
        className={ `tool-btn tool-btn--tiny tool-btn--text${track.muted ? ' tool-btn--active' : ''}` }
        aria-label={ `Mute ${track.name}` }
        aria-pressed={ track.muted }
        title="Mute"
        onClick={ () => dispatch(setTrackMuted({ id: track.id, muted: !track.muted })) }>
        M
      </button>

      <button
        type="button"
        className={ `tool-btn tool-btn--tiny tool-btn--text${track.soloed ? ' tool-btn--active' : ''}` }
        aria-label={ `Solo ${track.name}` }
        aria-pressed={ track.soloed }
        title="Solo"
        onClick={ () => dispatch(setTrackSoloed({ id: track.id, soloed: !track.soloed })) }>
        S
      </button>

      <button
        type="button"
        className="tool-btn tool-btn--tiny"
        aria-label={ `${track.visible ? 'Hide' : 'Show'} ${track.name}` }
        aria-pressed={ !track.visible }
        title={ track.visible ? 'Hide track' : 'Show track' }
        onClick={ () => dispatch(toggleTrackVisibility(track.id)) }>
        {track.visible ? <Eye size={ 12 } /> : <EyeOff size={ 12 } />}
      </button>

      <button
        type="button"
        className="tool-btn tool-btn--tiny"
        // The active track ignores its own lock, so the label has to describe
        // the effective state rather than the stored flag.
        aria-label={ active
          ? `${track.name} is always editable while active`
          : `${track.locked ? 'Unlock' : 'Lock'} ${track.name}` }
        aria-pressed={ track.locked && !active }
        disabled={ active }
        title={ active ? 'The active track is always editable' : 'Editable alongside the active track' }
        onClick={ () => dispatch(toggleTrackLock(track.id)) }>
        {track.locked && !active ? <Lock size={ 12 } /> : <LockOpen size={ 12 } />}
      </button>

      <button
        type="button"
        className="tool-btn tool-btn--tiny"
        aria-label={ `Delete ${track.name}` }
        disabled={ !canDelete }
        title={ canDelete ? 'Delete track and its notes' : 'The last track cannot be deleted' }
        onClick={ () => dispatch(deleteTrack(track.id)) }>
        <Trash2 size={ 12 } />
      </button>
    </div>

    <div className="track-row__routing">
      <select
        className="toolbar__select"
        aria-label={ `MIDI channel of ${track.name}` }
        title="MIDI channel"
        value={ track.channel }
        onChange={ e => dispatch(setTrackChannel({ id: track.id, channel: Number(e.target.value) })) }>
        {CHANNELS.map(c => <option key={ c } value={ c }>Ch {c + 1}</option>)}
      </select>

      <select
        className="toolbar__select"
        aria-label={ `Output of ${track.name}` }
        title="Output"
        value={ outputId ?? '' }
        onChange={ e => dispatch(setTrackOutput({ id: track.id, outputId: e.target.value || null })) }>
        <option value="">Internal synth</option>

        {outputs.map(p =>
          <option key={ p.id } value={ p.id }>
            {p.name}{p.connected ? '' : ' (disconnected)'}
          </option>
        )}
      </select>
    </div>
  </li>
}
