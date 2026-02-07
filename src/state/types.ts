export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ControlMode = 'orbit' | 'fly'

export interface ViewerState {
  status: ViewerStatus
  progress: number
  fps: number
  pointCount: number | null
  sceneUrl: string
  controlMode: ControlMode
  moveSpeed: number
  lookSensitivity: number
  error?: string
}
