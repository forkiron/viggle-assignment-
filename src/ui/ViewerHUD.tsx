/** HUD: status, loading progress %, FPS, point count, error. */
import type { ViewerStatus } from '../state/types'

interface ViewerHUDProps {
  status: ViewerStatus
  progress: number
  fps: number
  pointCount: number | null
  error?: string
}

export function ViewerHUD({ status, progress, fps, pointCount, error }: ViewerHUDProps) {
  return (
    <div className="viewer-hud">
      <div className="hud-row">
        <span className="hud-label">Status</span>
        <span>{status}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">FPS</span>
        <span>{fps}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Points</span>
        <span>{pointCount ?? 'unknown'}</span>
      </div>
      {error ? <div className="hud-error">{error}</div> : null}
    </div>
  )
}
