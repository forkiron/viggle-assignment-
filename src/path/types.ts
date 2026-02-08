/** Camera pose for keyframes and path playback (position, quaternion, fov). */
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
