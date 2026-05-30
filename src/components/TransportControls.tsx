import { Play, Square, Repeat } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { seek, setBpm, stop, togglePlay, toggleLoop } from '@/store/slices/transportSlice'
import { ticksPerBar } from '@/domain/time'

export function TransportControls() {
  const dispatch = useAppDispatch()
  const isPlaying = useAppSelector((s) => s.transport.isPlaying)
  const bpm = useAppSelector((s) => s.transport.bpm)
  const loop = useAppSelector((s) => s.transport.loop)
  const ts = useAppSelector((s) => s.transport.timeSignature)
  const position = useAppSelector((s) => s.transport.positionTicks)

  const bar = Math.floor(position / ticksPerBar(ts)) + 1

  return (
    <div className="transport">
      <button
        type="button"
        title="Play / Stop (Space)"
        aria-label={isPlaying ? 'Stop' : 'Play'}
        className={`tool-btn${isPlaying ? ' tool-btn--active' : ''}`}
        onClick={() => dispatch(togglePlay())}
      >
        {isPlaying ? <Square size={16} /> : <Play size={16} />}
      </button>
      <button
        type="button"
        title="Stop and return to start"
        aria-label="Stop"
        className="tool-btn"
        onClick={() => {
          dispatch(stop())
          dispatch(seek(loop.enabled ? loop.startTicks : 0))
        }}
      >
        <Square size={16} />
      </button>
      <button
        type="button"
        title="Loop (Ctrl/Cmd+L)"
        aria-pressed={loop.enabled}
        className={`tool-btn${loop.enabled ? ' tool-btn--active' : ''}`}
        onClick={() => dispatch(toggleLoop())}
      >
        <Repeat size={16} />
      </button>

      <label className="transport__bpm">
        <span>BPM</span>
        <input
          type="number"
          min={20}
          max={300}
          value={Math.round(bpm)}
          onChange={(e) => dispatch(setBpm(Number(e.target.value)))}
        />
      </label>

      <span className="transport__pos">Bar {bar}</span>
    </div>
  )
}
