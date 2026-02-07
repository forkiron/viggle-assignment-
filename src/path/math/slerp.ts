import type { CameraPose } from '../types'

export const slerpQuaternion = (a: CameraPose['quaternion'], b: CameraPose['quaternion'], t: number) => {
  // TODO(step-4): implement quaternion slerp across segments.
  // Placeholder: linear blend (not a true slerp).
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ] as CameraPose['quaternion']
}
