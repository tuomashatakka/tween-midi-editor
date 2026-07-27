import { Circle, Play, RadioTower, Repeat, Square } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { seek, setBpm, stop, togglePlay, toggleLoop } from '@/store/slices/transportSlice'
import { canRecord, toggleRecording } from '@/thunks/recordingThunks'
import { ticksPerBar } from '@/domain/time'


export const TransportControls = () => {
  const dispatch   = useAppDispatch()
  const isPlaying  = useAppSelector(s => s.transport.isPlaying)
  const bpm        = useAppSelector(s => s.transport.bpm)
  const loop       = useAppSelector(s => s.transport.loop)
  const ts         = useAppSelector(s => s.transport.timeSignature)
  const position   = useAppSelector(s => s.transport.positionTicks)
  const recording  = useAppSelector(s => s.recording)
  const sync       = useAppSelector(s => s.sync)
  const recordable = useAppSelector(canRecord)

  const bar = Math.floor(position / ticksPerBar(ts)) + 1

  // While following an external clock the transport is not ours to drive.
  const following   = sync.mode === 'follow'
  const followTitle = 'Controlled by external MIDI clock'

  const recordClass = [
    'tool-btn',
    recording.isRecording ? 'tool-btn--rec' : '',
    recording.countingIn ? 'tool-btn--counting' : '',
  ].filter(Boolean).join(' ')

  return <div className="transport">
    <button
      type="button"
      title={ following ? followTitle : 'Play / Stop (Space)' }
      aria-label={ isPlaying ? 'Stop' : 'Play' }
      disabled={ following }
      className={ `tool-btn${isPlaying ? ' tool-btn--active' : ''}` }
      onClick={ () => dispatch(togglePlay()) }>
      {isPlaying ? <Square size={ 16 } /> : <Play size={ 16 } />}
    </button>

    <button
      type="button"
      title={ following ? followTitle : 'Stop and return to start' }
      aria-label="Stop"
      disabled={ following }
      className="tool-btn"
      onClick={ () => {
        dispatch(stop())
        dispatch(seek(loop.enabled ? loop.startTicks : 0))
      } }>
      <Square size={ 16 } />
    </button>

    <button
      type="button"
      title={ recordable ? 'Record (R)' : 'Arm a track in the drawer to record' }
      aria-label="Record"
      aria-pressed={ recording.isRecording }
      disabled={ !recordable }
      className={ recordClass }
      onClick={ () => dispatch(toggleRecording()) }>
      <Circle size={ 16 } />
    </button>

    <button
      type="button"
      title="Loop (Ctrl/Cmd+L)"
      aria-pressed={ loop.enabled }
      className={ `tool-btn${loop.enabled ? ' tool-btn--active' : ''}` }
      onClick={ () => dispatch(toggleLoop()) }>
      <Repeat size={ 16 } />
    </button>

    <label className="transport__bpm">
      <span>BPM</span>

      <input
        type="number"
        min={ 20 }
        max={ 300 }
        disabled={ following }
        title={ following ? followTitle : undefined }
        value={ Math.round(bpm) }
        onChange={ e => dispatch(setBpm(Number(e.target.value))) } />
    </label>

    <span className="transport__pos">Bar {bar}</span>

    {sync.mode === 'off'
      ? null
      : <span
        className={ `transport__sync${sync.status === 'waiting' ? ' transport__sync--waiting' : ''}` }
        role="status">
        <RadioTower size={ 12 } />

        {sync.mode === 'send'
          ? 'SEND'
          : `EXT ${sync.externalBpm?.toFixed(1) ?? '--'}`}
      </span>}
  </div>
}
