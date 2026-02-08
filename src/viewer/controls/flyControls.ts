import { Euler, Quaternion, Vector3 } from 'three'
import type { Camera } from 'three'
import { InputManager } from './input'

export class FlyControls {
  private camera: Camera
  private input: InputManager
  private speed = 3
  private sprintMultiplier = 2.5
  private sensitivity = 0.002
  private enabled = false
  private yaw = 0
  private pitch = 0
  private euler = new Euler(0, 0, 0, 'YXZ')
  private quat = new Quaternion()
  private forward = new Vector3()
  private right = new Vector3()
  private up = new Vector3(0, 1, 0)
  private move = new Vector3()

  constructor(camera: Camera, input: InputManager) {
    this.camera = camera
    this.input = input
  }

  enable() {
    this.enabled = true
    this.syncFromCamera()
  }

  disable() {
    this.enabled = false
  }

  setSpeed(value: number) {
    this.speed = value
  }

  setSensitivity(value: number) {
    this.sensitivity = value
  }

  update(dt: number) {
    if (!this.enabled) return

    const delta = this.input.consumeMouseDelta()
    this.yaw -= delta.x * this.sensitivity
    this.pitch -= delta.y * this.sensitivity
    const maxPitch = Math.PI / 2 - 0.01
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch))

    this.euler.set(this.pitch, this.yaw, 0)
    this.quat.setFromEuler(this.euler)
    this.camera.quaternion.copy(this.quat)

    this.move.set(0, 0, 0)
    if (this.input.isKeyDown('KeyW')) this.move.z += 1
    if (this.input.isKeyDown('KeyS')) this.move.z -= 1
    if (this.input.isKeyDown('KeyA')) this.move.x -= 1
    if (this.input.isKeyDown('KeyD')) this.move.x += 1
    if (this.input.isKeyDown('Space')) this.move.y += 1
    if (this.input.isKeyDown('ControlLeft') || this.input.isKeyDown('ControlRight')) this.move.y -= 1

    if (this.move.lengthSq() > 0) {
      this.move.normalize()
      this.camera.getWorldDirection(this.forward)
      this.right.copy(this.forward).cross(this.up).normalize()
      const up = this.up

      const moveDir = new Vector3()
        .addScaledVector(this.forward, this.move.z)
        .addScaledVector(this.right, this.move.x)
        .addScaledVector(up, this.move.y)

      const sprint =
        this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight') ? this.sprintMultiplier : 1
      this.camera.position.addScaledVector(moveDir, this.speed * sprint * dt)
    }
  }

  private syncFromCamera() {
    this.euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
    this.pitch = this.euler.x
    this.yaw = this.euler.y
  }
}
