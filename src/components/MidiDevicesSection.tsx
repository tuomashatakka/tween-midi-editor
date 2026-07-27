import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setRecordLatencyMs, setThru, toggleInput } from '@/store/slices/midiSlice'
import {
  selectEnabledInputIds,
  selectMidiError,
  selectMidiInputs,
  selectMidiSupport,
  selectMidiThru,
  selectRecordLatencyMs,
} from '@/store/selectors/midiSelectors'
import { requestMidiPermission } from '@/midi/io/midiBridge'


export const MidiDevicesSection = () => {
  const dispatch = useAppDispatch()
  const support  = useAppSelector(selectMidiSupport)
  const error    = useAppSelector(selectMidiError)
  const inputs   = useAppSelector(selectMidiInputs)
  const enabled  = useAppSelector(selectEnabledInputIds)
  const thru     = useAppSelector(selectMidiThru)
  const latency  = useAppSelector(selectRecordLatencyMs)

  return <section className="preferences__section" aria-label="MIDI devices">
    <h3>MIDI devices</h3>

    {support === 'unsupported'
      ? <p>
        This browser has no Web MIDI support, or the page is not served over a
        secure connection. Everything else in the editor still works.
      </p>
      : null}

    {support === 'denied'
      ? <p>MIDI access was refused{error ? `: ${error}` : '.'}</p>
      : null}

    {support === 'prompt' || support === 'denied'
      ? <button
        type="button"
        className="tool-btn tool-btn--text"
        onClick={ () => void requestMidiPermission() }>
        Enable MIDI devices
      </button>
      : null}

    {support === 'granted'
      ? <>
        <p>Inputs to listen on. Arm a track in the drawer to record from them.</p>

        <div className="preferences__ports">
          {inputs.length === 0
            ? <span className="preferences__note">No MIDI inputs found.</span>
            : inputs.map(port =>
              <label key={ port.id } className="preferences__row preferences__row--checkbox">
                <input
                  type="checkbox"
                  checked={ enabled.includes(port.id) }
                  onChange={ () => dispatch(toggleInput(port.id)) } />

                <span>{port.name}{port.connected ? '' : ' (disconnected)'}</span>
              </label>
            )}
        </div>

        <label className="preferences__row preferences__row--checkbox">
          <input
            type="checkbox"
            checked={ thru }
            onChange={ e => dispatch(setThru(e.target.checked)) } />

          <span>Play incoming notes through the armed tracks</span>
        </label>

        <label className="preferences__row">
          <span>Input latency (ms)</span>

          <input
            type="number"
            min={ -500 }
            max={ 500 }
            value={ latency }
            onChange={ e => dispatch(setRecordLatencyMs(Number(e.target.value))) } />
        </label>
      </>
      : null}
  </section>
}
