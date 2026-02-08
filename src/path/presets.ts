import type { CameraPose, Keyframe } from './types'
import { Object3D, Vector3 } from 'three'

export type PresetType = 'turntable' | 'dolly-in' | 'crane-up' | 'figure-8'

interface PresetOptions {
  target: Vector3
  radius: number
  height: number
  fov: number
  duration: number
}

const createPose = (position: Vector3, target: Vector3, fov: number): CameraPose => {
  const helper = new Object3D()
  helper.position.copy(position)
  helper.lookAt(target)
  return {
    position: [position.x, position.y, position.z],
    quaternion: [helper.quaternion.x, helper.quaternion.y, helper.quaternion.z, helper.quaternion.w],
    fov,
  }
}

const buildKeyframes = (poses: CameraPose[], duration: number): Keyframe[] => {
  const count = poses.length
  return poses.map((pose, index) => ({
    id: `preset_${index}_${Math.random().toString(16).slice(2)}`,
    pose,
    t: count <= 1 ? 0 : (duration * index) / (count - 1),
  }))
}

export const generateTurntable = (options: PresetOptions): Keyframe[] => {
  const { target, radius, height, fov, duration } = options
  const poses: CameraPose[] = []
  const steps = 8
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / (steps - 1)) * Math.PI * 2
    const position = new Vector3(
      target.x + Math.cos(angle) * radius,
      target.y + height,
      target.z + Math.sin(angle) * radius,
    )
    poses.push(createPose(position, target, fov))
  }
  return buildKeyframes(poses, duration)
}

export const generateDollyIn = (options: PresetOptions): Keyframe[] => {
  const { target, radius, height, fov, duration } = options
  const poses: CameraPose[] = []
  const steps = 4
  const start = Math.max(radius * 1.2, 1)
  const end = Math.max(radius * 0.45, 0.5)
  for (let i = 0; i < steps; i += 1) {
    const t = steps <= 1 ? 0 : i / (steps - 1)
    const dist = start + (end - start) * t
    const position = new Vector3(target.x, target.y + height, target.z + dist)
    poses.push(createPose(position, target, fov))
  }
  return buildKeyframes(poses, duration)
}

export const generateCraneUp = (options: PresetOptions): Keyframe[] => {
  const { target, radius, height, fov, duration } = options
  const poses: CameraPose[] = []
  const steps = 4
  const startY = target.y + height * 0.2
  const endY = target.y + height * 1.6
  for (let i = 0; i < steps; i += 1) {
    const t = steps <= 1 ? 0 : i / (steps - 1)
    const y = startY + (endY - startY) * t
    const position = new Vector3(target.x, y, target.z + radius)
    poses.push(createPose(position, target, fov))
  }
  return buildKeyframes(poses, duration)
}

export const generateFigure8 = (options: PresetOptions): Keyframe[] => {
  const { target, radius, height, fov, duration } = options
  const poses: CameraPose[] = []
  const steps = 8
  for (let i = 0; i < steps; i += 1) {
    const t = steps <= 1 ? 0 : i / (steps - 1)
    const angle = t * Math.PI * 2
    const x = Math.sin(angle) * radius
    const z = Math.sin(angle * 2) * (radius * 0.5)
    const position = new Vector3(target.x + x, target.y + height, target.z + z)
    poses.push(createPose(position, target, fov))
  }
  return buildKeyframes(poses, duration)
}
