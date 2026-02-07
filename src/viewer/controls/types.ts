export type CameraPose = {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  fov: number
}

export type ControlMode = 'orbit' | 'fly'
