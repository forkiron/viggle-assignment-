/** HUD: status, loading progress %, FPS, point count, error. */
import type { ViewerStatus } from '../state/types'
import { useState } from 'react'

interface ViewerHUDProps {
  status: ViewerStatus
  progress: number
  fps: number
  pointCount: number | null
  error?: string
}

export function ViewerHUD({ status, progress, fps, pointCount, error }: ViewerHUDProps) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
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
        <button className="control-button control-button-sm" onClick={() => setShowHelp(true)}>
          Keybinds
        </button>
        {error ? <div className="hud-error">{error}</div> : null}
      </div>

      {showHelp ? (
        <div className="overlay">
          <div className="overlay-card">
            <button className="overlay-close" onClick={() => setShowHelp(false)} aria-label="Close">
              ×
            </button>
            <div className="overlay-title">Keybinds</div>
            <ul className="overlay-list">
              <li><strong>F</strong> — Toggle Orbit/Fly</li>
              <li><strong>R</strong> — Reset View</li>
              <li><strong>E</strong> — Add Keyframe</li>
              <li><strong>Enter</strong> — Preview Play</li>
              <li><strong>↑/↓</strong> — Select previous/next keyframe</li>
              <li><strong>WASD</strong> — Move (Fly)</li>
              <li><strong>Mouse</strong> — Look (Fly)</li>
              <li><strong>Shift</strong> — Sprint (Fly)</li>
              <li><strong>Space</strong> — Up (Fly)</li>
              <li><strong>Ctrl</strong> — Down (Fly)</li>
              <li><strong>ESC</strong> — Release mouse lock</li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
