// MIDI device and sync preferences are per-machine, so they persist next to the
// editor preferences rather than in the document. Port *names* are stored
// alongside ids because Web MIDI ids are stable only within one browser
// profile, while "IAC Driver Bus 1" is the same everywhere.

import type { Middleware } from '@reduxjs/toolkit'
import { initialMidiState } from './slices/midiSlice'
import type { MidiState } from './slices/midiSlice'
import { initialSyncState } from './slices/syncSlice'
import type { ExternalSync, SyncState } from './slices/syncSlice'


const STORAGE_KEY = 'tween-midi-editor.midi'

const MODES: ExternalSync[] = [ 'off', 'follow', 'send' ]

interface PersistedMidi {
  enabledInputs:   string[]
  enabledNames:    string[]
  thru:            boolean
  recordLatencyMs: number
  mode:            ExternalSync
  clockInputId:    string | null
  clockInputName:  string | null
  clockOutputId:   string | null
  clockOutputName: string | null
  offsetMs:        number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const stringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every(v => typeof v === 'string') ? value : undefined

const nullableString = (value: unknown): string | null | undefined =>
  value === null || typeof value === 'string' ? value : undefined

export interface PersistedMidiState {
  midi: MidiState
  sync: SyncState
}

export const loadMidiPreferences = (): PersistedMidiState => {
  const midi: MidiState = { ...initialMidiState }
  const sync: SyncState = { ...initialSyncState }

  if (typeof window === 'undefined')
    return { midi, sync }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return { midi, sync }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed))
      return { midi, sync }

    const inputs = stringArray(parsed.enabledInputs)
    if (inputs)
      midi.enabledInputs = inputs
    if (typeof parsed.thru === 'boolean')
      midi.thru = parsed.thru
    if (typeof parsed.recordLatencyMs === 'number' && Number.isFinite(parsed.recordLatencyMs))
      midi.recordLatencyMs = parsed.recordLatencyMs

    if (typeof parsed.mode === 'string' && MODES.includes(parsed.mode as ExternalSync))
      sync.mode = parsed.mode as ExternalSync

    const clockInputId    = nullableString(parsed.clockInputId)
    const clockInputName  = nullableString(parsed.clockInputName)
    const clockOutputId   = nullableString(parsed.clockOutputId)
    const clockOutputName = nullableString(parsed.clockOutputName)
    if (clockInputId !== undefined)
      sync.clockInputId = clockInputId
    if (clockInputName !== undefined)
      sync.clockInputName = clockInputName
    if (clockOutputId !== undefined)
      sync.clockOutputId = clockOutputId
    if (clockOutputName !== undefined)
      sync.clockOutputName = clockOutputName

    if (typeof parsed.offsetMs === 'number' && Number.isFinite(parsed.offsetMs))
      sync.offsetMs = parsed.offsetMs
  }
  catch {
    // Best-effort, like the editor preferences.
  }

  return { midi, sync }
}

const project = (state: PersistedMidiState): PersistedMidi => ({
  enabledInputs: state.midi.enabledInputs,
  enabledNames:  state.midi.enabledInputs.map(id =>
    state.midi.inputs.find(p => p.id === id)?.name ?? ''),
  thru:            state.midi.thru,
  recordLatencyMs: state.midi.recordLatencyMs,
  mode:            state.sync.mode,
  clockInputId:    state.sync.clockInputId,
  clockInputName:  state.sync.clockInputName,
  clockOutputId:   state.sync.clockOutputId,
  clockOutputName: state.sync.clockOutputName,
  offsetMs:        state.sync.offsetMs,
})

let lastWritten: string | null = null

export const midiPreferencesMiddleware: Middleware = storeApi => next => action => {
  const result = next(action)

  if (typeof window === 'undefined')
    return result

  try {
    const serialized = JSON.stringify(project(storeApi.getState() as PersistedMidiState))
    if (serialized === lastWritten)
      return result

    window.localStorage.setItem(STORAGE_KEY, serialized)
    lastWritten = serialized
  }
  catch {
    // Persistence is best-effort.
  }

  return result
}
