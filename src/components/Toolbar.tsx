import {
  MousePointer2,
  Hand,
  Pencil,
  BoxSelect,
  Magnet,
  AudioWaveform,
  Volume2,
  Settings,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setDivision,
  setTool,
  toggleSnap,
  toggleTriplet,
  toggleWaveform,
  togglePlayOnDraw,
} from '@/store/slices/toolSlice'
import type { GridDivision, ToolKind } from '@/domain/types'


const TOOLS: { kind: ToolKind; label: string; Icon: typeof Hand; hint: string }[] = [
  { kind: 'select', label: 'Select', Icon: MousePointer2, hint: 'Select / move / resize' },
  { kind: 'pan', label: 'Pan', Icon: Hand, hint: 'Pan the view' },
  { kind: 'draw', label: 'Draw', Icon: Pencil, hint: 'Draw notes (B)' },
  { kind: 'marquee', label: 'Marquee', Icon: BoxSelect, hint: 'Rubber-band select' },
]

const DIVISIONS: GridDivision[] = [ 1, 2, 4, 8, 16, 32 ]

interface ToolbarProps {
  onOpenPreferences: () => void
}

export const Toolbar = ({ onOpenPreferences }: ToolbarProps) => {
  const dispatch     = useAppDispatch()
  const active       = useAppSelector(s => s.tool.active)
  const snap         = useAppSelector(s => s.tool.snapEnabled)
  const division     = useAppSelector(s => s.tool.division)
  const triplet      = useAppSelector(s => s.tool.triplet)
  const showWaveform = useAppSelector(s => s.tool.showWaveform)
  const playOnDraw   = useAppSelector(s => s.tool.playOnDraw)

  return <div className="toolbar">
    <div className="toolbar__group">
      {TOOLS.map(({ kind, label, Icon, hint }) =>
        <button
          key={ kind }
          type="button"
          title={ hint }
          aria-label={ label }
          aria-pressed={ active === kind }
          className={ `tool-btn${active === kind ? ' tool-btn--active' : ''}` }
          onClick={ () => dispatch(setTool(kind)) }>
          <Icon size={ 16 } />
        </button>
      )}
    </div>

    <div className="toolbar__group">
      <button
        type="button"
        title="Snap to grid (Ctrl/Cmd+4)"
        aria-pressed={ snap }
        className={ `tool-btn${snap ? ' tool-btn--active' : ''}` }
        onClick={ () => dispatch(toggleSnap()) }>
        <Magnet size={ 16 } />
      </button>

      <select
        className="toolbar__select"
        title="Grid division"
        value={ division }
        onChange={ e => dispatch(setDivision(Number(e.target.value) as GridDivision)) }>
        {DIVISIONS.map(d =>
          <option key={ d } value={ d }>
            1/{d}
          </option>
        )}
      </select>

      <button
        type="button"
        title="Triplet grid (Ctrl/Cmd+3)"
        aria-pressed={ triplet }
        className={ `tool-btn tool-btn--text${triplet ? ' tool-btn--active' : ''}` }
        onClick={ () => dispatch(toggleTriplet()) }>
        3T
      </button>
    </div>

    <div className="toolbar__group">
      <button
        type="button"
        title="Open preferences"
        aria-label="Open preferences"
        className="tool-btn"
        onClick={ onOpenPreferences }>
        <Settings size={ 16 } />
      </button>

      <button
        type="button"
        title="Waveform overlay on notes"
        aria-label="Toggle waveform overlay"
        aria-pressed={ showWaveform }
        className={ `tool-btn${showWaveform ? ' tool-btn--active' : ''}` }
        onClick={ () => dispatch(toggleWaveform()) }>
        <AudioWaveform size={ 16 } />
      </button>

      <button
        type="button"
        title="Play notes while drawing"
        aria-label="Toggle play on draw"
        aria-pressed={ playOnDraw }
        className={ `tool-btn${playOnDraw ? ' tool-btn--active' : ''}` }
        onClick={ () => dispatch(togglePlayOnDraw()) }>
        <Volume2 size={ 16 } />
      </button>
    </div>
  </div>
}
