type KeyState = Record<string, boolean>

export class InputManager {
  private keyState: KeyState = {}
  private mouseDelta = { x: 0, y: 0 }
  private element: HTMLElement | null = null
  private pointerLockEnabled = false

  private onKeyDown = (event: KeyboardEvent) => {
    this.keyState[event.code] = true
  }

  private onKeyUp = (event: KeyboardEvent) => {
    this.keyState[event.code] = false
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.pointerLockEnabled || document.pointerLockElement !== this.element) return
    this.mouseDelta.x += event.movementX
    this.mouseDelta.y += event.movementY
  }

  private onPointerLockChange = () => {
    if (!this.pointerLockEnabled) return
    if (document.pointerLockElement !== this.element) {
      this.mouseDelta.x = 0
      this.mouseDelta.y = 0
    }
  }

  attach(element: HTMLElement) {
    if (this.element) return
    this.element = element
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    element.addEventListener('click', this.requestPointerLock)
  }

  detach() {
    if (!this.element) return
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    this.element.removeEventListener('click', this.requestPointerLock)
    this.element = null
    this.keyState = {}
    this.mouseDelta = { x: 0, y: 0 }
  }

  setPointerLockEnabled(enabled: boolean) {
    this.pointerLockEnabled = enabled
    if (!enabled) {
      this.releasePointerLock()
    }
  }

  requestPointerLock = () => {
    if (!this.pointerLockEnabled || !this.element) return
    if (document.pointerLockElement === this.element) return
    if (this.element.requestPointerLock) {
      this.element.requestPointerLock()
    }
  }

  releasePointerLock() {
    if (document.pointerLockElement && document.exitPointerLock) {
      document.exitPointerLock()
    }
  }

  isPointerLocked() {
    return document.pointerLockElement === this.element
  }

  isKeyDown(code: string) {
    return !!this.keyState[code]
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y }
    this.mouseDelta.x = 0
    this.mouseDelta.y = 0
    return delta
  }
}
