import type { CameraPose, Keyframe } from '../path/types'
import type { ControlMode } from '../state/types'
import { PlaybackControls } from './PlaybackControls'

interface KeyframePanelProps {
  keyframes: Keyframe[]
  selectedId: string | null
  isPreviewing: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  loop: boolean
  previewError?: string
  onAddKeyframe: () => void
  onPreset: (preset: 'turntable' | 'dolly-in' | 'crane-up' | 'figure-8') => void
  onDeleteKeyframe: (id: string) => void
  onMoveKeyframe: (id: string, dir: -1 | 1) => void
  onSelectKeyframe: (id: string) => void
  onPreviewPlay: () => void
  onPreviewPause: () => void
  onPreviewStop: () => void
  onToggleLoop: () => void
  onSeek: (value: number) => void
  controlMode: ControlMode
  currentPose?: CameraPose | null
}

const formatPoseLabel = (pose: CameraPose) => {
  const [x, y, z] = pose.position
  const magnitude = Math.sqrt(x * x + y * y + z * z)
  return `pos ${magnitude.toFixed(1)}`
}

export function KeyframePanel({
  keyframes,
  selectedId,
  isPreviewing,
  isPaused,
  currentTime,
  duration,
  loop,
  previewError,
  onAddKeyframe,
  onPreset,
  onDeleteKeyframe,
  onMoveKeyframe,
  onSelectKeyframe,
  onPreviewPlay,
  onPreviewPause,
  onPreviewStop,
  onToggleLoop,
  onSeek,
  controlMode,
  currentPose,
}: KeyframePanelProps) {
  return (
    <div className="keyframe-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Keyframes</div>
          <div className="panel-subtitle">Mode: {controlMode}</div>
        </div>
        <button className="control-button" onClick={onAddKeyframe}>
          Add Keyframe
        </button>
      </div>

      <div className="panel-presets">
        <button className="control-button" onClick={() => onPreset('turntable')}>
          Turntable
        </button>
        <button className="control-button" onClick={() => onPreset('dolly-in')}>
          Dolly-In
        </button>
        <button className="control-button" onClick={() => onPreset('crane-up')}>
          Crane-Up
        </button>
        <button className="control-button" onClick={() => onPreset('figure-8')}>
          Figure-8
        </button>
      </div>

      {currentPose ? (
        <div className="panel-meta">Camera: {formatPoseLabel(currentPose)}</div>
      ) : null}

      {keyframes.length === 0 ? (
        <div className="panel-empty">No keyframes yet. Add your first shot.</div>
      ) : (
        <div className="keyframe-list">
          {keyframes.map((frame, index) => {
            const isSelected = frame.id === selectedId
            return (
              <div
                key={frame.id}
                className={`keyframe-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectKeyframe(frame.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSelectKeyframe(frame.id)
                }}
              >
                <div className="keyframe-label">Shot {index + 1}</div>
                <div className="keyframe-meta">{formatPoseLabel(frame.pose)}</div>
                <div className="keyframe-actions">
                  <button
                    className="control-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveKeyframe(frame.id, -1)
                    }}
                    disabled={index === 0}
                  >
                    Up
                  </button>
                  <button
                    className="control-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveKeyframe(frame.id, 1)
                    }}
                    disabled={index === keyframes.length - 1}
                  >
                    Down
                  </button>
                  <button
                    className="control-button danger"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteKeyframe(frame.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="panel-footer">
        <PlaybackControls
          isPlaying={isPreviewing}
          isPaused={isPaused}
          loop={loop}
          currentTime={currentTime}
          duration={duration}
          onPlay={onPreviewPlay}
          onPause={onPreviewPause}
          onStop={onPreviewStop}
          onToggleLoop={onToggleLoop}
          onSeek={onSeek}
        />
        {previewError ? <div className="panel-error">{previewError}</div> : null}
      </div>
    </div>
  )
}
