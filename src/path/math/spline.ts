import type { CameraPose } from '../types'

export const sampleCatmullRom = (poses: CameraPose[], t: number): CameraPose => {
  // TODO(step-4): sample position via Catmull-Rom spline (needs ≥4 points; handle endpoints).
  // Placeholder: return the closest pose for now.
  const index = Math.max(0, Math.min(poses.length - 1, Math.round(t * (poses.length - 1))))
  return poses[index]
}
