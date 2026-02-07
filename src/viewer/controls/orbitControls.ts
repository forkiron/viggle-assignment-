import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Camera, Vector3, WebGLRenderer } from 'three'

export class OrbitControlWrapper {
  private controls: OrbitControls

  constructor(camera: Camera, renderer: WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = false
    this.controls.dampingFactor = 0
    this.controls.screenSpacePanning = true
  }

  enable() {
    this.controls.enabled = true
  }

  disable() {
    this.controls.enabled = false
  }

  update() {
    this.controls.update()
  }

  setTarget(target: Vector3) {
    this.controls.target.copy(target)
  }

  setRotateSpeed(value: number) {
    this.controls.rotateSpeed = value
  }

  getTarget() {
    return this.controls.target.clone()
  }

  dispose() {
    this.controls.dispose()
  }
}
