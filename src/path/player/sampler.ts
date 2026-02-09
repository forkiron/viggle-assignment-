import type { CameraPose, Keyframe } from '../types'
import { easeInOutCubic } from '../math/easing'
import { catmullRom, lerpVec3 } from '../math/catmullRom'
import { slerpQuat } from '../math/quat'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Interpolates camera pose at global time t: position via Catmull-Rom (or linear if <3 keyframes),
 * rotation via SLERP, FOV via linear; segment time is eased with easeInOutCubic.
 */
export const samplePoseAtTime = (
  keyframes: Keyframe[],
  tGlobal: number,
  smoothingStrength = 1,
): CameraPose | null => {
  if (keyframes.length === 0) return null
  if (keyframes.length === 1) return keyframes[0].pose

  const sorted = keyframes
  const startT = sorted[0].t
  const endT = sorted[sorted.length - 1].t
  if (endT <= startT) return sorted[0].pose

  const clampedT = Math.max(startT, Math.min(endT, tGlobal))

  let segmentIndex = 0
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (clampedT >= sorted[i].t && clampedT <= sorted[i + 1].t) {
      segmentIndex = i
      break
    }
  }

  const k1 = sorted[segmentIndex]
  const k2 = sorted[segmentIndex + 1]
  const denom = k2.t - k1.t
  const u = denom > 0 ? (clampedT - k1.t) / denom : 0
  const eased = easeInOutCubic(u)

  const p1 = k1.pose.position
  const p2 = k2.pose.position

  let position: CameraPose['position']
  const linearPos = lerpVec3(p1, p2, eased)
  if (sorted.length < 3) {
    position = linearPos
  } else {
    const p0 = sorted[Math.max(0, segmentIndex - 1)].pose.position
    const p3 = sorted[Math.min(sorted.length - 1, segmentIndex + 2)].pose.position
    const splinePos = catmullRom(p0, p1, p2, p3, eased)
    const strength = Math.max(0, Math.min(1, smoothingStrength))
    position = lerpVec3(linearPos, splinePos, strength)
  }

  const rotation = slerpQuat(k1.pose.quaternion, k2.pose.quaternion, eased)
  const fov = lerp(k1.pose.fov, k2.pose.fov, eased)

  return {
    position,
    quaternion: rotation,
    fov,
  }
}
