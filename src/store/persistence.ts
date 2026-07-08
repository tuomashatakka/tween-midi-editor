import type { Middleware } from '@reduxjs/toolkit'
import { initialToolState, type ToolState } from './slices/toolSlice'
import type { GridDivision } from '@/domain/types'

const STORAGE_KEY = 'tween-midi-editor.preferences'
const DIVISIONS: GridDivision[] = [ 1, 2, 4, 8, 16, 32 ]

type PersistedPreferences = Pick<
  ToolState,
  'snapEnabled' | 'division' | 'triplet' | 'defaultNoteDuration' | 'showWaveform' | 'playOnDraw'
>

const isGridDivision = (value: unknown): value is GridDivision =>
  typeof value === 'number' && DIVISIONS.includes(value as GridDivision)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const loadToolPreferences = (): Partial<ToolState> => {
  if (typeof window === 'undefined')
    return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return {}

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed))
      return {}

    const preferences: Partial<ToolState> = {}

    if (typeof parsed.snapEnabled === 'boolean')
      preferences.snapEnabled = parsed.snapEnabled
    if (isGridDivision(parsed.division))
      preferences.division = parsed.division
    if (typeof parsed.triplet === 'boolean')
      preferences.triplet = parsed.triplet
    if (typeof parsed.defaultNoteDuration === 'number' && Number.isFinite(parsed.defaultNoteDuration))
      preferences.defaultNoteDuration = Math.max(1, Math.round(parsed.defaultNoteDuration))
    if (typeof parsed.showWaveform === 'boolean')
      preferences.showWaveform = parsed.showWaveform
    if (typeof parsed.playOnDraw === 'boolean')
      preferences.playOnDraw = parsed.playOnDraw

    return preferences
  } catch {
    return {}
  }
}

const selectPersistedPreferences = (tool: ToolState): PersistedPreferences => ({
  snapEnabled:         tool.snapEnabled,
  division:            tool.division,
  triplet:             tool.triplet,
  defaultNoteDuration: tool.defaultNoteDuration,
  showWaveform:        tool.showWaveform,
  playOnDraw:          tool.playOnDraw,
})

export const persistedToolState: ToolState = {
  ...initialToolState,
  ...loadToolPreferences(),
}

export const preferencesMiddleware: Middleware = storeApi => next => action => {
  const result = next(action)

  if (typeof window === 'undefined')
    return result

  try {
    const state = storeApi.getState() as { tool: ToolState }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectPersistedPreferences(state.tool)))
  } catch {
    // Persistence is best-effort: private browsing and storage quotas should not break editing.
  }

  return result
}
