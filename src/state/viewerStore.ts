/**
 * External store for viewer UI state: status, progress, fps, point count,
 * scene URL, control mode, move speed, look sensitivity, frustum visibility, error.
 */
import { useSyncExternalStore } from 'react'
import type { ViewerState, ViewerStatus } from './types'

const DEFAULT_STATE: ViewerState = {
  status: 'idle',
  progress: 0,
  fps: 0,
  pointCount: null,
  sceneUrl: '',
  controlMode: 'orbit',
  moveSpeed: 4,
  lookSensitivity: 0.002,
  smoothing: 0.7,
  error: undefined,
}

type Listener = () => void

let state: ViewerState = { ...DEFAULT_STATE }
const listeners = new Set<Listener>()

const notify = () => {
  listeners.forEach((listener) => listener())
}

export const getViewerState = () => state

export const setViewerState = (next: Partial<ViewerState>) => {
  state = { ...state, ...next }
  notify()
}

export const resetViewerError = () => {
  setViewerState({ error: undefined })
}

export const setViewerStatus = (status: ViewerStatus) => {
  setViewerState({ status })
}

export const setViewerProgress = (progress: number) => {
  setViewerState({ progress })
}

export const setViewerFps = (fps: number) => {
  setViewerState({ fps })
}

export const setViewerPointCount = (pointCount: number | null) => {
  setViewerState({ pointCount })
}

export const setViewerSceneUrl = (sceneUrl: string) => {
  setViewerState({ sceneUrl })
}

export const setViewerControlMode = (controlMode: ViewerState['controlMode']) => {
  setViewerState({ controlMode })
}

export const setViewerMoveSpeed = (moveSpeed: number) => {
  setViewerState({ moveSpeed })
}

export const setViewerLookSensitivity = (lookSensitivity: number) => {
  setViewerState({ lookSensitivity })
}

export const setSmoothing = (smoothing: number) => {
  setViewerState({ smoothing })
}

export const setViewerError = (error: string) => {
  setViewerState({ error })
}

export const subscribeViewerStore = (listener: Listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useViewerStore = <T,>(selector: (next: ViewerState) => T): T =>
  useSyncExternalStore(subscribeViewerStore, () => selector(state), () => selector(state))
