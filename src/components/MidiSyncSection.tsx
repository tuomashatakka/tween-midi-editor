import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setClockInput,
  setClockOutput,
  setSyncMode,
  setSyncOffset,
} from '@/store/slices/syncSlice'
import type { ExternalSync } from '@/store/slices/syncSlice'
import { selectMidiInputs, selectMidiOutputs, selectMidiSupport } from '@/store/selectors/midiSelectors'
import type { MidiPortInfo } from '@/domain/types'


const MODES: { value: ExternalSync; label: string; hint: string }[] = [
  { value: 'off', label: 'Off', hint: 'Tween runs on its own clock' },
  { value: 'follow', label: 'Follow external clock', hint: 'Live drives Tween' },
  { value: 'send', label: 'Send clock', hint: 'Tween drives Live' },
]

const portOption = (port: MidiPortInfo) =>
  <option key={ port.id } value={ port.id }>
    {port.name}{port.connected ? '' : ' (disconnected)'}
  </option>

export const MidiSyncSection = () => {
  const dispatch = useAppDispatch()
  const support  = useAppSelector(selectMidiSupport)
  const inputs   = useAppSelector(selectMidiInputs)
  const outputs  = useAppSelector(selectMidiOutputs)
  const sync     = useAppSelector(s => s.sync)

  const status = sync.mode === 'off'
    ? 'Not syncing'
    : sync.mode === 'send'
      ? sync.clockOutputId ? 'Sending clock' : 'Choose a clock output'
      : sync.status === 'locked'
        ? `Locked — ${sync.externalBpm?.toFixed(1) ?? '?'} BPM`
        : 'Waiting for clock…'

  return <section className="preferences__section" aria-label="Ableton Live sync">
    <h3>Ableton Live sync</h3>

    <p>
      Sync over MIDI clock through a virtual port — an IAC bus on macOS,
      loopMIDI on Windows — with the matching Sync in/out enabled in Live.
    </p>

    {support !== 'granted'
      ? <p className="preferences__note">Enable MIDI devices above to use sync.</p>
      : null}

    <label className="preferences__row">
      <span>Mode</span>

      <select
        aria-label="External sync mode"
        disabled={ support !== 'granted' }
        value={ sync.mode }
        onChange={ e => dispatch(setSyncMode(e.target.value as ExternalSync)) }>
        {MODES.map(m => <option key={ m.value } value={ m.value }>{m.label}</option>)}
      </select>
    </label>

    {sync.mode === 'follow'
      ? <label className="preferences__row">
        <span>Clock input</span>

        <select
          aria-label="Clock input port"
          value={ sync.clockInputId ?? '' }
          onChange={ e => {
            const port = inputs.find(p => p.id === e.target.value)
            dispatch(setClockInput({ id: port?.id ?? null, name: port?.name ?? null }))
          } }>
          <option value="">None</option>
          {/* Excluding the send port keeps a single bus from feeding back. */}
          {inputs.filter(p => p.id !== sync.clockOutputId).map(portOption)}
        </select>
      </label>
      : null}

    {sync.mode === 'send'
      ? <>
        <label className="preferences__row">
          <span>Clock output</span>

          <select
            aria-label="Clock output port"
            value={ sync.clockOutputId ?? '' }
            onChange={ e => {
              const port = outputs.find(p => p.id === e.target.value)
              dispatch(setClockOutput({ id: port?.id ?? null, name: port?.name ?? null }))
            } }>
            <option value="">None</option>
            {outputs.filter(p => p.id !== sync.clockInputId).map(portOption)}
          </select>
        </label>

        <label className="preferences__row">
          <span>Clock offset (ms)</span>

          <input
            type="number"
            min={ -100 }
            max={ 100 }
            value={ sync.offsetMs }
            onChange={ e => dispatch(setSyncOffset(Number(e.target.value))) } />
        </label>
      </>
      : null}

    <p className="preferences__note" role="status">{status}</p>
  </section>
}
