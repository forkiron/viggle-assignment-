/**
 * ExportPipeline — background, non-blocking export orchestrator.
 *
 * Renders frames off-screen via GaussianViewer.renderFrameOffscreen()
 * (WebGLRenderTarget) so the visible canvas is never disrupted.
 *
 * Key design choices:
 *  • Time-sliced: yields to the browser (`setTimeout(0)`) after every frame
 *    so the UI stays fully responsive (camera interaction, progress bar, etc.).
 *  • Pipelined: starts uploading frame N while rendering frame N+1 — overlaps
 *    GPU readback + PNG encode with network I/O.
 *  • Cancellable: checked between frames; pending uploads are awaited before
 *    the server-side cancel is issued so the state is always clean.
 *  • Resource-safe: disposes the off-screen render target when done.
 */

import type { GaussianViewer } from '../viewer/gaussianViewer'
import type { Keyframe } from '../path/types'
import { samplePoseAtTime } from '../path/player/sampler'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Yield to the browser so the main-thread event loop can process user
 *  input, paint, rAF callbacks (the viewer's self-driven render loop), etc. */
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

/* ------------------------------------------------------------------ */
/*  Pipeline                                                           */
/* ------------------------------------------------------------------ */

export class ExportPipeline {
  private serverUrl: string
  private cancelled = false

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl
  }

  /** Request cancellation (checked between frames). */
  cancel() {
    this.cancelled = true
  }

  get isCancelled() {
    return this.cancelled
  }

  /**
   * Run the full export pipeline.
   * Resolves with the output video URL on success.
   * Throws on error or cancellation.
   */
  async run(
    viewer: GaussianViewer,
    settings: ExportSettings,
    onProgress: ProgressCallback,
  ): Promise<string> {
    this.cancelled = false

    /* 1. Start export session on the server */
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
        /* ---- Cancellation check ---- */
        if (this.cancelled) {
          if (pendingUpload) await pendingUpload.catch(() => {})
          await fetch(`${this.serverUrl}/export/${id}/cancel`, {
            method: 'POST',
          }).catch(() => {})
          throw new Error('Export cancelled.')
        }

        /* ---- Wait for the previous frame's upload ---- */
        if (pendingUpload) await pendingUpload

        /* ---- Interpolate camera pose ---- */
        const t = startT + frame / fps
        const pose = samplePoseAtTime(keyframes, t, smoothing)
        if (!pose) continue

        /* ---- Render frame off-screen (no visible side-effects) ---- */
        const blob = await viewer.renderFrameOffscreen(width, height, pose, { frame })

        /* ---- Start uploading (pipelined — don't await yet) ---- */
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

        /* ---- Progress ---- */
        onProgress(frame + 1, frameCount, `Rendering: ${frame + 1}/${frameCount}`)

        /* ---- Yield to browser ---- */
        await yieldToMain()
      }

      /* 2. Wait for the last upload to finish */
      if (pendingUpload) await pendingUpload

      /* 3. Tell the server to encode the video */
      onProgress(frameCount, frameCount, 'Encoding video…')
      const finishRes = await fetch(`${this.serverUrl}/export/${id}/finish`, {
        method: 'POST',
      })
      if (!finishRes.ok) throw new Error('Video encoding failed')
      const { output } = await finishRes.json()

      return `${this.serverUrl}${output}`
    } finally {
      /* Always free GPU resources */
      viewer.disposeExportResources()
    }
  }
}
