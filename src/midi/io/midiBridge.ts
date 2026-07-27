import type { AppStore } from '@/store/store'
import { setMidiError, setPorts, setMidiSupport } from '@/store/slices/midiSlice'
import { setSyncStatus } from '@/store/slices/syncSlice'
import { getActiveEngine, previewNoteOff, previewNoteOn } from '@/audio/engine'
import { samePortList } from './portInfo'
import { isMidiSupported, releaseMidiAccess, requestMidiAccess } from './midiAccess'
import { MidiInputManager } from './MidiInputManager'
import type { MidiInputEvent } from './MidiInputManager'
import { MidiOutputManager } from './MidiOutputManager'
import { MidiNoteSink } from './MidiNoteSink'
import { MidiClockSink } from './MidiClockSink'
import { MidiClockBridge } from './MidiClockBridge'
import { RecordBridge, setActiveRecordBridge } from './recordBridge'
import { createRoutingProvider } from './routing'
import { noteOnBytes, noteOffBytes } from './messages'
import type { MidiChannelMessage, MidiRealtimeMessage } from './messages'


/** Extra lookahead while sending clock, so a throttled tab cannot starve it. */
const SEND_MODE_AHEAD_SEC = 0.25

/**
 * Side-effect layer connecting Web MIDI to the store, mirroring
 * `src/audio/transportBridge.ts`. React stays presentational; everything
 * stateful lives here or in the managers it owns.
 */
export function createMidiBridge (store: AppStore): () => void {
  const routing = createRoutingProvider(store)
  const output  = new MidiOutputManager()
  const record  = new RecordBridge(store, routing)
  const clock   = new MidiClockBridge(store, output)

  setActiveRecordBridge(record)

  const outputLatencyMs = (): number => 0

  const noteSink = new MidiNoteSink(output, {
    routing,
    getOffsetMs: () => store.getState().sync.offsetMs + outputLatencyMs(),
  })

  const clockSink = new MidiClockSink(output, {
    // Registered permanently but inert unless the mode is 'send', which also
    // guarantees we never echo clock back while following.
    getPortId: () => store.getState().sync.mode === 'send'
      ? store.getState().sync.clockOutputId
      : null,
    getOffsetMs: () => store.getState().sync.offsetMs + outputLatencyMs(),
  })

  const input = new MidiInputManager({
    onChannel:  (message, event) => handleChannel(message, event),
    onRealtime: (message, event) => handleRealtime(message, event),
  })

  // --- Input routing -----------------------------------------------------

  function handleChannel (message: MidiChannelMessage, event: MidiInputEvent) {
    record.handleChannelMessage(message, event)

    const state = store.getState()
    if (!state.midi.thru)
      return
    if (message.kind !== 'noteOn' && message.kind !== 'noteOff')
      return

    for (const target of routing.getRecordTargets()) {
      const portId = target.routing.outputId
      if (!portId) {
        if (message.kind === 'noteOn')
          previewNoteOn(message.pitch, message.velocity); else
          previewNoteOff(message.pitch)
        continue
      }

      // Untimed: live monitoring must be as immediate as the driver allows.
      output.send(portId, message.kind === 'noteOn'
        ? noteOnBytes(target.channel, message.pitch, message.velocity)
        : noteOffBytes(target.channel, message.pitch))
    }
  }

  function handleRealtime (message: MidiRealtimeMessage, event: MidiInputEvent) {
    const { sync } = store.getState()
    if (sync.mode !== 'follow')
      return
    // Only the nominated clock port drives the transport.
    if (sync.clockInputId !== null && event.portId !== sync.clockInputId)
      return

    clock.handleRealtime(message, event.perfMs)
  }

  // --- Device discovery --------------------------------------------------

  store.dispatch(setMidiSupport(isMidiSupported() ? 'prompt' : 'unsupported'))

  const listener = {
    onPorts: (inputs: Parameters<typeof setPorts>[0]['inputs'], outputs: Parameters<typeof setPorts>[0]['outputs']) => {
      const state = store.getState().midi
      // macOS's IAC bus fires statechange spuriously; skip the churn.
      if (samePortList(state.inputs, inputs) && samePortList(state.outputs, outputs))
        return
      store.dispatch(setPorts({ inputs, outputs }))
    },
    onState: (support: Parameters<typeof setMidiSupport>[0], error: string | null) => {
      if (support !== 'unknown')
        store.dispatch(setMidiSupport(support))
      store.dispatch(setMidiError(error))
    },
  }

  /** Prompting is deferred to a user gesture; this is the entry point for it. */
  const enable = (): Promise<boolean> => requestMidiAccess(listener)
  setEnableMidi(enable)

  // --- Store subscription ------------------------------------------------

  let disposeNoteSink: (() => void) | null  = null
  let disposeClockSink: (() => void) | null = null

  let prevInputs    = ''
  let prevPlaying   = store.getState().transport.isPlaying
  let prevPosition  = store.getState().transport.positionTicks
  let prevRecording = store.getState().recording.isRecording
  let prevMode      = store.getState().sync.mode

  const unsubscribe = store.subscribe(() => {
    const state = store.getState()

    // Sinks attach to the engine lazily: it only exists after the audio bridge
    // has mounted and, for the context, after the first user gesture.
    const engine = getActiveEngine()
    if (engine && !disposeNoteSink) {
      disposeNoteSink  = engine.addSink(noteSink)
      disposeClockSink = engine.addSink(clockSink)
    }

    // The clock port is listened to even when it is not among the enabled
    // inputs, so following works without also arming it for note input.
    const wanted = [ ...new Set([
      ...state.midi.enabledInputs,
      ...state.sync.mode === 'follow' && state.sync.clockInputId ? [ state.sync.clockInputId ] : [],
    ]) ]
    const key = wanted.join('|')
    if (key !== prevInputs) {
      prevInputs = key
      input.setPorts(wanted)
    }

    if (state.sync.mode !== prevMode) {
      prevMode = state.sync.mode
      clock.reset()
      engine?.setScheduleAhead(state.sync.mode === 'send' ? SEND_MODE_AHEAD_SEC : 0)
      if (state.sync.mode === 'follow')
        store.dispatch(setSyncStatus('waiting'))
    }

    // Transport edges drive outgoing clock. In follow mode we are the slave, so
    // these must not echo back out.
    const started = state.transport.isPlaying && !prevPlaying
    const stopped = !state.transport.isPlaying && prevPlaying

    if (state.sync.mode === 'send') {
      if (started)
        clock.onTransportStart(state.transport.positionTicks); else if (stopped)
        clock.onTransportStop()
    }

    // Only on the stop edge: panicking on every quiet store update would spray
    // all-notes-off continuously.
    if (stopped)
      output.panic()

    if (state.transport.positionTicks !== prevPosition) {
      record.handlePosition(state.transport.positionTicks)
      // While stopped, any position change is a user locate worth telling Live
      // about. While playing the engine authors positions continuously, and the
      // next start edge sends SPP + Continue anyway.
      if (state.sync.mode === 'send' && !state.transport.isPlaying)
        clock.onTransportLocate(state.transport.positionTicks)
      prevPosition = state.transport.positionTicks
    }
    prevPlaying = state.transport.isPlaying

    if (prevRecording && !state.recording.isRecording)
      record.reset()
    prevRecording = state.recording.isRecording
  })

  return () => {
    unsubscribe()
    disposeNoteSink?.()
    disposeClockSink?.()
    input.dispose()
    output.dispose()
    releaseMidiAccess()
    setActiveRecordBridge(null)
    setEnableMidi(null)
  }
}

// A module-level handle so the preferences UI can trigger the permission
// prompt from a click without threading the bridge through React.
let enableMidi: (() => Promise<boolean>) | null = null

const setEnableMidi = (fn: (() => Promise<boolean>) | null): void => {
  enableMidi = fn
}

export const requestMidiPermission = (): Promise<boolean> =>
  enableMidi?.() ?? Promise.resolve(false)
