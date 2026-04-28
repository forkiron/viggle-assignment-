// Off-screen render → upload frames → server FFmpeg. Yields each frame; pipelines uploads; cancel-aware.

import type { GaussianViewer } from '../viewer/gaussianViewer'
import type { Keyframe } from '../path/types'
import { samplePoseAtTime } from '../path/player/sampler'

export interface RenderSettings {
  width: number
  height: number
  fps: number
  duration: number
  frameCount: number
  smoothing: number
}

export interface ExportSettings {
  version: number
  sceneUrl: string
  keyframes: Keyframe[]
  render: RenderSettings
}

export type ProgressCallback = (
  frame: number,
  total: number,
  status: string,
) => void

// Yield so the main viewer / UI can still respond.
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

export class ExportPipeline {
  private serverUrl: string
  private cancelled = false

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl
  }

  cancel() {
    this.cancelled = true
  }

  get isCancelled() {
    return this.cancelled
  }

  async run(
    viewer: GaussianViewer,
    settings: ExportSettings,
    onProgress: ProgressCallback,
  ): Promise<string> {
    this.cancelled = false

    const startRes = await fetch(`${this.serverUrl}/export/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!startRes.ok) throw new Error('Failed to start export session')
    const { id } = await startRes.json()

    const { keyframes, render } = settings
    const { frameCount, fps, smoothing, width, height } = render
    const startT = keyframes[0].t

    try {
      let pendingUpload: Promise<void> | null = null

      for (let frame = 0; frame < frameCount; frame++) {
        if (this.cancelled) {
          if (pendingUpload) await pendingUpload.catch(() => {})
          await fetch(`${this.serverUrl}/export/${id}/cancel`, {
            method: 'POST',
          }).catch(() => {})
          throw new Error('Export cancelled.')
        }

        if (pendingUpload) await pendingUpload

        const t = startT + frame / fps
        const pose = samplePoseAtTime(keyframes, t, smoothing)
        if (!pose) continue

        const blob = await viewer.renderFrameOffscreen(width, height, pose, { frame })

        const form = new FormData()
        form.append('index', String(frame))
        form.append(
          'frame',
          blob,
          `frame_${String(frame).padStart(6, '0')}.png`,
        )

        pendingUpload = fetch(`${this.serverUrl}/export/${id}/frame`, {
          method: 'POST',
          body: form,
        }).then((res) => {
          if (!res.ok) throw new Error(`Frame upload failed (${frame})`)
        })

        onProgress(frame + 1, frameCount, `Rendering: ${frame + 1}/${frameCount}`)

        await yieldToMain()
      }

      if (pendingUpload) await pendingUpload

      onProgress(frameCount, frameCount, 'Encoding video…')
      const finishRes = await fetch(`${this.serverUrl}/export/${id}/finish`, {
        method: 'POST',
      })
      if (!finishRes.ok) throw new Error('Video encoding failed')
      const { output } = await finishRes.json()

      return `${this.serverUrl}${output}`
    } finally {
      viewer.disposeExportResources()
    }
  }
}
