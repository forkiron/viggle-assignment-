/** Keyframe pose (tuple arrays + FOV). */
export type CameraPose = {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  fov: number
}

export type Keyframe = {
  id: string
  pose: CameraPose
  t: number
}
