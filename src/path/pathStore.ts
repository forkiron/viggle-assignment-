import { useSyncExternalStore } from 'react'
import type { CameraPose, Keyframe } from './types'

type Listener = () => void

type PathState = {
  keyframes: Keyframe[]
  selectedId: string | null
  isPreviewing: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  loop: boolean
  previewError?: string
}

const DEFAULT_STATE: PathState = {
  keyframes: [],
  selectedId: null,
  isPreviewing: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  loop: false,
  previewError: undefined,
}

let state: PathState = { ...DEFAULT_STATE }
const listeners = new Set<Listener>()

const notify = () => {
  listeners.forEach((listener) => listener())
}

const setState = (next: Partial<PathState>) => {
  state = { ...state, ...next }
  notify()
}

export const usePathStore = <T,>(selector: (next: PathState) => T): T =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => selector(state),
    () => selector(state),
  )

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `kf_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const addKeyframe = (pose: CameraPose) => {
  const next: Keyframe = {
    id: generateId(),
    pose,
    t: state.keyframes.length * 2,
  }
  console.info('[PathStore] addKeyframe', { id: next.id, t: next.t })
  setState({
    keyframes: [...state.keyframes, next],
    selectedId: next.id,
    previewError: undefined,
  })
}

export const deleteKeyframe = (id: string) => {
  console.info('[PathStore] deleteKeyframe', { id })
  const keyframes = state.keyframes.filter((frame) => frame.id !== id)
  const selectedId = state.selectedId === id ? keyframes[0]?.id ?? null : state.selectedId
  setState({ keyframes, selectedId })
}

export const moveKeyframe = (id: string, dir: -1 | 1) => {
  const index = state.keyframes.findIndex((frame) => frame.id === id)
  if (index < 0) return
  const nextIndex = index + dir
  if (nextIndex < 0 || nextIndex >= state.keyframes.length) return

  console.info('[PathStore] moveKeyframe', { id, dir })
  const keyframes = [...state.keyframes]
  const [removed] = keyframes.splice(index, 1)
  keyframes.splice(nextIndex, 0, removed)
  setState({ keyframes })
}

export const setSelected = (id: string | null) => {
  console.info('[PathStore] setSelected', { id })
  setState({ selectedId: id })
}

export const setPreviewing = (value: boolean) => {
  console.info('[PathStore] setPreviewing', { value })
  setState({ isPreviewing: value, previewError: undefined, isPaused: false })
}

export const setPaused = (value: boolean) => {
  setState({ isPaused: value })
}

export const setCurrentTime = (value: number) => {
  setState({ currentTime: value })
}

export const setDuration = (value: number) => {
  setState({ duration: value })
}

export const setLoop = (value: boolean) => {
  setState({ loop: value })
}

export const setPreviewError = (message: string) => {
  console.info('[PathStore] setPreviewError', { message })
  setState({ previewError: message })
}

export const clearPreviewError = () => {
  setState({ previewError: undefined })
}
