/**
 * Wraps GaussianSplats3D Viewer: init, load .ply, frame/reset view, orbit/fly controls,
 * camera pose get/set, and renderToBlob for export.
 */
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { Vector2, Vector3, WebGLRenderTarget } from 'three'
import type { Camera, WebGLRenderer } from 'three'
import { InputManager } from './controls/input'
import { OrbitControlWrapper } from './controls/orbitControls'
import { FlyControls } from './controls/flyControls'
import type { CameraPose, ControlMode } from './controls/types'

type InternalPose = {
  position: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
  fov?: number
}

const resolveViewerClass = () => {
  const anyLib = GaussianSplats3D as unknown as {
    Viewer?: new (options: Record<string, unknown>) => unknown
    default?: { Viewer?: new (options: Record<string, unknown>) => unknown }
  }

  return anyLib.Viewer ?? anyLib.default?.Viewer
}

export class GaussianViewer {
  private viewer: any
  private container?: HTMLElement
  private initialPose?: InternalPose
  private input?: InputManager
  private orbitControls?: OrbitControlWrapper
  private flyControls?: FlyControls
  private controlMode: ControlMode = 'orbit'
  private controlsEnabled = true
  private moveSpeed = 4
  private lookSensitivity = 0.002
  private initialOrbitTarget?: Vector3
  private rafId = 0
  private lastFrameTime = 0

  /* ---- Off-screen export resources (reused across frames) ---- */
  private exportTarget: WebGLRenderTarget | null = null
  private exportPixelBuf: Uint8Array | null = null
  private exportCanvas: OffscreenCanvas | null = null

  init(containerEl: HTMLElement) {
    if (this.viewer) return

    const ViewerClass = resolveViewerClass()
    if (!ViewerClass) {
      throw new Error('GaussianSplats3D Viewer class not found')
    }

    console.info('[GaussianViewer] init: creating Viewer', { container: containerEl })
    this.container = containerEl
    this.viewer = new ViewerClass({
      container: containerEl,
      selfDrivenMode: true,
      useBuiltInControls: false,
      initialCameraPosition: [0, 10, 15],
      initialCameraLookAt: [0, 0, 0],
    })

    if (this.viewer?.camera) {
      this.viewer.camera.up.set(0, 1, 0)
    }
    this.initialPose = this.captureCameraPose()
    console.info('[GaussianViewer] init: captured initial camera pose', this.initialPose)
    console.info('[GaussianViewer] init: container size', {
      width: containerEl.clientWidth,
      height: containerEl.clientHeight,
    })

    this.setupControls()
  }

  async loadScene(plyUrl: string, onProgress?: (p: number) => void) {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    console.info('[GaussianViewer] loadScene: start', { plyUrl })
    if (typeof this.viewer?.addSplatScene === 'function') {
      const scenes = this.viewer?.splatMesh?.scenes
      if (Array.isArray(scenes) && scenes.length > 0 && typeof this.viewer?.removeSplatScenes === 'function') {
        const indexes = scenes.map((_: unknown, index: number) => index)
        console.info('[GaussianViewer] loadScene: removing existing scenes', { count: indexes.length })
        await this.viewer.removeSplatScenes(indexes, false)
      }

      await this.viewer.addSplatScene(plyUrl, {
        progressiveLoad: true,
        showLoadingUI: false,
        onProgress: (value: number) => {
          console.info('[GaussianViewer] loadScene: progress', { value })
          onProgress?.(value)
        },
      })

      if (typeof this.viewer?.start === 'function') {
        console.info('[GaussianViewer] loadScene: starting viewer')
        this.viewer.start()
      }
      this.ensureCanvasInContainer()
      this.resetOrbitTarget()
      if (typeof this.viewer?.getSceneCount === 'function') {
        console.info('[GaussianViewer] loadScene: scene count', {
          count: this.viewer.getSceneCount(),
        })
      }
      if (this.viewer?.renderer?.domElement) {
        const canvas = this.viewer.renderer.domElement
        console.info('[GaussianViewer] loadScene: canvas size', {
          width: canvas.width,
          height: canvas.height,
        })
      }
      if (this.viewer?.camera) {
        console.info('[GaussianViewer] loadScene: camera position', {
          x: this.viewer.camera.position?.x,
          y: this.viewer.camera.position?.y,
          z: this.viewer.camera.position?.z,
        })
      }
      console.info('[GaussianViewer] loadScene: complete')
      return
    }

    throw new Error('GaussianSplats3D load method not found')
  }

  frameScene() {
    if (!this.viewer) return

    if (typeof this.viewer?.frameScene === 'function') {
      this.viewer.frameScene()
      this.resetOrbitTarget()
      return
    }

    const camera = this.viewer?.camera
    const bounds = this.tryGetBounds()

    if (camera && bounds) {
      const distance = bounds.radius * 2.5
      const currentPos = camera.position?.clone?.() ?? new Vector3(0, 0, 1)
      const center = new Vector3(bounds.center.x, bounds.center.y, bounds.center.z)
      const direction = currentPos.sub(center).normalize()
      const offset = direction.multiplyScalar(distance)
      camera.position?.set(center.x + offset.x, center.y + offset.y, center.z + offset.z)
      if (typeof camera.lookAt === 'function') {
        camera.lookAt(bounds.center.x, bounds.center.y, bounds.center.z)
      }
      this.resetOrbitTarget(bounds.center)
      return
    }

    if (camera && typeof camera.lookAt === 'function') {
      camera.position?.set(0, 0, 3)
      camera.lookAt(0, 0, 0)
      this.resetOrbitTarget()
    }

  }

  resetView() {
    if (!this.viewer || !this.initialPose) return

    const camera = this.viewer?.camera
    if (!camera) return

    camera.position?.set(
      this.initialPose.position.x,
      this.initialPose.position.y,
      this.initialPose.position.z,
    )
    camera.quaternion?.set(
      this.initialPose.quaternion.x,
      this.initialPose.quaternion.y,
      this.initialPose.quaternion.z,
      this.initialPose.quaternion.w,
    )
    if (typeof this.initialPose.fov === 'number') {
      camera.fov = this.initialPose.fov
      camera.updateProjectionMatrix?.()
    }
    const initialLookAt = this.getInitialLookAt()
    if (initialLookAt) {
      camera.lookAt(initialLookAt.x, initialLookAt.y, initialLookAt.z)
    }
    this.resetOrbitTarget()
  }

  getPointCount(): number | null {
    const scene = this.viewer?.gaussianSplatScene ?? this.viewer?.scene

    if (scene?.pointCount && typeof scene.pointCount === 'number') {
      return scene.pointCount
    }

    if (typeof scene?.getPointCount === 'function') {
      return scene.getPointCount()
    }

    return null
  }

  dispose() {
    console.info('[GaussianViewer] dispose')
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
    if (this.viewer?.dispose) {
      this.viewer.dispose()
    }
    this.orbitControls?.dispose()
    this.input?.detach()
    this.viewer = null
    this.container = undefined
  }

  setControlMode(mode: ControlMode) {
    this.controlMode = mode
    if (!this.controlsEnabled) return
    if (mode === 'orbit') {
      if (this.viewer?.camera && this.orbitControls) {
        const camera = this.viewer.camera
        const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
        const target = new Vector3().copy(camera.position).addScaledVector(forward, 10)
        this.orbitControls.setTarget(target)
      }
      this.input?.setPointerLockEnabled(false)
      this.flyControls?.disable()
      this.orbitControls?.enable()
    } else {
      this.orbitControls?.disable()
      this.flyControls?.enable()
      this.input?.setPointerLockEnabled(true)
    }
  }

  setMoveSpeed(value: number) {
    this.moveSpeed = value
    this.flyControls?.setSpeed(value)
  }

  setLookSensitivity(value: number) {
    this.lookSensitivity = value
    this.flyControls?.setSensitivity(value)
    if (this.orbitControls) {
      const rotateSpeed = Math.max(0.1, Math.min(5, value * 500))
      this.orbitControls.setRotateSpeed(rotateSpeed)
    }
  }

  setControlsEnabled(enabled: boolean) {
    this.controlsEnabled = enabled
    if (!enabled) {
      this.input?.setPointerLockEnabled(false)
      this.flyControls?.disable()
      this.orbitControls?.disable()
    } else {
      this.setControlMode(this.controlMode)
    }
  }

  getOrbitTarget() {
    return this.orbitControls?.getTarget() ?? null
  }


  async renderToBlob(width: number, height: number): Promise<Blob> {
    const renderer = this.viewer?.renderer as WebGLRenderer | undefined
    if (!renderer) {
      throw new Error('Renderer unavailable')
    }

    const canvas = renderer.domElement as HTMLCanvasElement
    const prevSize = renderer.getSize(new Vector2())
    const prevPixelRatio = renderer.getPixelRatio()

    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)

    if (typeof this.viewer?.forceRenderNextFrame === 'function') {
      this.viewer.forceRenderNextFrame()
    }
    if (typeof this.viewer?.render === 'function') {
      this.viewer.render()
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Failed to capture frame'))
          return
        }
        resolve(result)
      }, 'image/png')
    })

    renderer.setPixelRatio(prevPixelRatio)
    renderer.setSize(prevSize.x, prevSize.y, false)

    return blob
  }

  /**
   * Render a single frame off-screen to a WebGLRenderTarget and return a PNG Blob.
   *
   * IMPORTANT: We must call `renderer.setSize()` before rendering so that the
   * GaussianSplats3D splat shader uses the correct viewport dimensions for
   * projecting 3D gaussians → 2D screen-space.  Without this the shader projects
   * splats using the *main canvas* dimensions, causing most splats to fall outside
   * the render-target bounds (the "half-empty frame" bug).
   *
   * The canvas buffer is briefly resized (CSS style is untouched), which clears
   * its content.  The library's self-driven render loop will repaint it on the
   * next rAF — at most one frame of blank.
   */
  async renderFrameOffscreen(
    width: number,
    height: number,
    pose: CameraPose,
    debug?: { frame?: number },
  ): Promise<Blob> {
    const renderer = this.viewer?.renderer as WebGLRenderer | undefined
    if (!renderer) throw new Error('Renderer unavailable')

    const camera = this.viewer?.camera
    if (!camera) throw new Error('Camera unavailable')

    // --- Lazy-init / resize export resources ---
    if (
      !this.exportTarget ||
      this.exportTarget.width !== width ||
      this.exportTarget.height !== height
    ) {
      this.exportTarget?.dispose()
      this.exportTarget = new WebGLRenderTarget(width, height)
      this.exportPixelBuf = new Uint8Array(width * height * 4)
      this.exportCanvas = new OffscreenCanvas(width, height)
    }

    // --- Save current state ---
    const savedPos = camera.position.clone()
    const savedQuat = camera.quaternion.clone()
    const savedFov: number | undefined = 'fov' in camera ? (camera as any).fov : undefined
    const savedAspect: number | undefined = 'aspect' in camera ? (camera as any).aspect : undefined
    const prevSize = renderer.getSize(new Vector2())
    const prevPixelRatio = renderer.getPixelRatio()

    // --- Set renderer to export dimensions (critical for correct splat projection) ---
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false) // false → CSS style untouched

    // --- Apply export pose ---
    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    camera.quaternion.set(
      pose.quaternion[0],
      pose.quaternion[1],
      pose.quaternion[2],
      pose.quaternion[3],
    )
    if ('fov' in camera && typeof pose.fov === 'number') {
      ;(camera as any).fov = pose.fov
    }
    if ('aspect' in camera) {
      ;(camera as any).aspect = width / height
    }
    if (typeof camera.updateProjectionMatrix === 'function') {
      ;(camera as any).updateProjectionMatrix()
    }
    camera.updateMatrixWorld?.(true)

    // Ensure internal splat sort + culling uses the updated camera pose.
    const viewerAny = this.viewer as any
    const originalGather = typeof viewerAny?.gatherSceneNodesForSort === 'function'
      ? viewerAny.gatherSceneNodesForSort
      : null
    if (originalGather) {
      viewerAny.gatherSceneNodesForSort = function (_gatherAllNodes?: boolean) {
        return originalGather.call(this, true)
      }
    }
    try {
      if (typeof viewerAny?.update === 'function') {
        viewerAny.update()
      }
      if (typeof viewerAny?.runSplatSort === 'function') {
        await viewerAny.runSplatSort(true, true)
      }
    } finally {
      if (originalGather) {
        viewerAny.gatherSceneNodesForSort = originalGather
      }
    }
    if (debug) {
      const frame = debug.frame ?? -1
      const total =
        (this.viewer?.splatMesh?.getSplatCount?.() as number | undefined) ??
        this.getPointCount() ??
        0
      const renderCount = Number((this.viewer as any)?.splatRenderCount ?? 0)
      if (frame <= 0 || frame % 10 === 0) {
        console.info('[ExportDebug] splatRenderCount', {
          frame,
          renderCount,
          total,
          ratio: total > 0 ? renderCount / total : 0,
        })
      }
    }

    // --- Render to off-screen target ---
    const prevTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.exportTarget)

    if (typeof this.viewer?.forceRenderNextFrame === 'function') {
      this.viewer.forceRenderNextFrame()
    }
    if (typeof this.viewer?.render === 'function') {
      this.viewer.render()
    }

    // --- Read pixels from GPU ---
    renderer.readRenderTargetPixels(
      this.exportTarget,
      0,
      0,
      width,
      height,
      this.exportPixelBuf!,
    )

    // --- Restore renderer & camera ---
    renderer.setRenderTarget(prevTarget)
    renderer.setPixelRatio(prevPixelRatio)
    renderer.setSize(prevSize.x, prevSize.y, false)

    camera.position.copy(savedPos)
    camera.quaternion.copy(savedQuat)
    if ('fov' in camera && savedFov !== undefined) {
      ;(camera as any).fov = savedFov
    }
    if ('aspect' in camera && savedAspect !== undefined) {
      ;(camera as any).aspect = savedAspect
    }
    if (typeof camera.updateProjectionMatrix === 'function') {
      ;(camera as any).updateProjectionMatrix()
    }
    camera.updateMatrixWorld?.(true)

    // --- Convert pixels → PNG Blob ---
    // WebGL returns pixels bottom-to-top; flip vertically for correct orientation.
    const rowSize = width * 4
    const src = this.exportPixelBuf!
    const flipped = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      const srcOff = y * rowSize
      const dstOff = (height - 1 - y) * rowSize
      flipped.set(src.subarray(srcOff, srcOff + rowSize), dstOff)
    }

    const imageData = new ImageData(flipped, width, height)
    const ctx = this.exportCanvas!.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    return this.exportCanvas!.convertToBlob({ type: 'image/png' })
  }

  /** Free GPU + CPU resources used by off-screen export rendering. */
  disposeExportResources() {
    this.exportTarget?.dispose()
    this.exportTarget = null
    this.exportPixelBuf = null
    this.exportCanvas = null
  }

  getCameraPose(): CameraPose | null {
    const camera = this.viewer?.camera
    if (!camera) return null
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      quaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
      fov: typeof camera.fov === 'number' ? camera.fov : 50,
    }
  }

  setCameraPose(pose: CameraPose) {
    const camera = this.viewer?.camera
    if (!camera) return
    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    camera.quaternion.set(pose.quaternion[0], pose.quaternion[1], pose.quaternion[2], pose.quaternion[3])
    if (typeof pose.fov === 'number') {
      camera.fov = pose.fov
      camera.updateProjectionMatrix?.()
    }
    this.resetOrbitTarget()
  }

  private captureCameraPose(): InternalPose | undefined {
    const camera = this.viewer?.camera
    if (!camera) return undefined

    return {
      position: {
        x: camera.position?.x ?? 0,
        y: camera.position?.y ?? 0,
        z: camera.position?.z ?? 0,
      },
      quaternion: {
        x: camera.quaternion?.x ?? 0,
        y: camera.quaternion?.y ?? 0,
        z: camera.quaternion?.z ?? 0,
        w: camera.quaternion?.w ?? 1,
      },
      fov: typeof camera.fov === 'number' ? camera.fov : undefined,
    }
  }

  private tryGetBounds(): { center: { x: number; y: number; z: number }; radius: number } | null {
    const scene = this.viewer?.gaussianSplatScene ?? this.viewer?.scene

    if (scene?.bounds) {
      return {
        center: {
          x: scene.bounds.center?.x ?? 0,
          y: scene.bounds.center?.y ?? 0,
          z: scene.bounds.center?.z ?? 0,
        },
        radius: scene.bounds.radius ?? 1,
      }
    }

    if (typeof scene?.getBounds === 'function') {
      const bounds = scene.getBounds()
      if (bounds?.center && typeof bounds.radius === 'number') {
        return {
          center: {
            x: bounds.center.x,
            y: bounds.center.y,
            z: bounds.center.z,
          },
          radius: bounds.radius,
        }
      }
    }

    return null
  }

  private ensureCanvasInContainer() {
    const canvas = this.viewer?.renderer?.domElement as HTMLCanvasElement | undefined
    if (!canvas || !this.container) return

    if (canvas.parentElement !== this.container) {
      console.info('[GaussianViewer] ensureCanvasInContainer: moving canvas', {
        from: canvas.parentElement?.className ?? canvas.parentElement?.tagName ?? 'unknown',
      })
      this.container.appendChild(canvas)
    }

    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
  }

  private setupControls() {
    const camera = this.viewer?.camera as Camera | undefined
    const renderer = this.viewer?.renderer as WebGLRenderer | undefined
    if (!camera || !renderer || !this.container) return

    this.input = new InputManager()
    this.input.attach(this.container)

    this.orbitControls = new OrbitControlWrapper(camera, renderer)
    this.flyControls = new FlyControls(camera, this.input)
    this.flyControls.setSpeed(this.moveSpeed)
    this.flyControls.setSensitivity(this.lookSensitivity)
    this.orbitControls.setRotateSpeed(Math.max(0.1, Math.min(5, this.lookSensitivity * 500)))

    this.resetOrbitTarget()
    this.setControlMode(this.controlMode)

    this.lastFrameTime = performance.now()
    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - this.lastFrameTime) / 1000)
      this.lastFrameTime = time
      this.flyControls?.update(dt)
      if (this.controlMode === 'orbit') {
        this.orbitControls?.update()
      }
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  private resetOrbitTarget(center?: { x: number; y: number; z: number }) {
    if (!this.orbitControls || !this.viewer?.camera) return

    if (center) {
      this.orbitControls.setTarget(new Vector3(center.x, center.y, center.z))
      return
    }

    const initialLookAt = this.getInitialLookAt()
    if (initialLookAt) {
      this.orbitControls.setTarget(initialLookAt.clone())
      this.initialOrbitTarget = initialLookAt.clone()
      return
    }

    if (this.initialOrbitTarget) {
      this.orbitControls.setTarget(this.initialOrbitTarget)
      return
    }

    const camera = this.viewer.camera
    const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
    const target = new Vector3().copy(camera.position).addScaledVector(forward, 10)
    this.initialOrbitTarget = target.clone()
    this.orbitControls.setTarget(target)
  }

  private getInitialLookAt() {
    const lookAt = this.viewer?.initialCameraLookAt
    if (lookAt && typeof lookAt.x === 'number') {
      return new Vector3(lookAt.x, lookAt.y, lookAt.z)
    }
    return null
  }
}
