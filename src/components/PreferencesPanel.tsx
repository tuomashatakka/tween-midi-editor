import { X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setDefaultNoteDuration,
  setDivision,
  setPlayOnDraw,
  setShowWaveform,
  setSnapEnabled,
  setTriplet,
} from '@/store/slices/toolSlice'
import { PPQ } from '@/domain/constants'
import type { GridDivision } from '@/domain/types'


interface PreferencesPanelProps {
  onClose: () => void
}

const DIVISIONS: GridDivision[] = [ 1, 2, 4, 8, 16, 32 ]

const DURATION_OPTIONS = [
  { label: '1 bar', ticks: PPQ * 4 },
  { label: '1/2 note', ticks: PPQ * 2 },
  { label: '1/4 note', ticks: PPQ },
  { label: '1/8 note', ticks: PPQ / 2 },
  { label: '1/16 note', ticks: PPQ / 4 },
  { label: '1/32 note', ticks: PPQ / 8 },
]

export const PreferencesPanel = ({ onClose }: PreferencesPanelProps) => {
  const dispatch = useAppDispatch()
  const tool     = useAppSelector(s => s.tool)

  return <div className="preferences" role="dialog" aria-modal="false" aria-labelledby="preferences-title">
    <div className="preferences__header">
      <div>
        <h2 id="preferences-title">Preferences</h2>
        <p>Editor defaults are saved in this browser.</p>
      </div>

      <button type="button" className="tool-btn" aria-label="Close preferences" onClick={ onClose }>
        <X size={ 16 } />
      </button>
    </div>

    <section className="preferences__section" aria-label="Grid preferences">
      <h3>Grid</h3>

      <label className="preferences__row preferences__row--checkbox">
        <input
          type="checkbox"
          checked={ tool.snapEnabled }
          onChange={ e => dispatch(setSnapEnabled(e.target.checked)) } />

        <span>Snap edits to the grid</span>
      </label>

      <label className="preferences__row">
        <span>Grid division</span>

        <select
          value={ tool.division }
          onChange={ e => dispatch(setDivision(Number(e.target.value) as GridDivision)) }>
          {DIVISIONS.map(d => <option key={ d } value={ d }>1/{d}</option>)}
        </select>
      </label>

      <label className="preferences__row preferences__row--checkbox">
        <input
          type="checkbox"
          checked={ tool.triplet }
          onChange={ e => dispatch(setTriplet(e.target.checked)) } />

        <span>Use triplet grid</span>
      </label>
    </section>

    <section className="preferences__section" aria-label="Drawing preferences">
      <h3>Drawing</h3>

      <label className="preferences__row">
        <span>Default note length</span>

        <select
          value={ tool.defaultNoteDuration }
          onChange={ e => dispatch(setDefaultNoteDuration(Number(e.target.value))) }>
          {DURATION_OPTIONS.map(option =>
            <option key={ option.ticks } value={ option.ticks }>{option.label}</option>
          )}
        </select>
      </label>

      <label className="preferences__row preferences__row--checkbox">
        <input
          type="checkbox"
          checked={ tool.playOnDraw }
          onChange={ e => dispatch(setPlayOnDraw(e.target.checked)) } />

        <span>Preview notes while drawing</span>
      </label>

      <label className="preferences__row preferences__row--checkbox">
        <input
          type="checkbox"
          checked={ tool.showWaveform }
          onChange={ e => dispatch(setShowWaveform(e.target.checked)) } />

        <span>Show waveform overlays on notes</span>
      </label>
    </section>
  </div>
}
