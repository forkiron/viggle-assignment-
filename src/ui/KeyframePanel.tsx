import type { CameraPose, Keyframe } from '../path/types'
import type { ControlMode } from '../state/types'
import { PlaybackControls } from './PlaybackControls'
import { useEffect, useRef, useState } from 'react'

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
  onSetKeyframeTime: (id: string, time: number) => void
  onToggleFrustum: () => void
  showFrustum: boolean
  onClearKeyframes: () => void
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
  onSetKeyframeTime,
  onToggleFrustum,
  showFrustum,
  onClearKeyframes,
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
  const timelineRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const clampTime = (value: number) => Math.max(0, Math.min(duration || 0, value))

  const updateFromPointer = (clientX: number) => {
    if (!timelineRef.current || !draggingId || duration <= 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSetKeyframeTime(draggingId, clampTime(ratio * duration))
  }

  useEffect(() => {
    if (!draggingId) return
    const handleMove = (event: PointerEvent) => updateFromPointer(event.clientX)
    const handleUp = () => setDraggingId(null)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [draggingId, duration])
  return (
    <div className="keyframe-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Keyframes</div>
          <div className="panel-subtitle">Mode: {controlMode}</div>
        </div>
        <div className="panel-actions">
          <button className="control-button" onClick={onAddKeyframe}>
            Add Keyframe
          </button>
          <button className="control-button danger" onClick={onClearKeyframes}>
            Clear All
          </button>
        </div>
      </div>

      <div className="panel-row">
        <button className="control-button" onClick={onToggleFrustum}>
          {showFrustum ? 'Frustum On' : 'Frustum Off'}
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
          <div className="timeline" ref={timelineRef}>
            {keyframes.map((frame) => {
              const left = duration > 0 ? (frame.t / duration) * 100 : 0
              return (
                <div
                  key={frame.id}
                  className={`timeline-dot ${frame.id === selectedId ? 'selected' : ''}`}
                  style={{ left: `${left}%` }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    setDraggingId(frame.id)
                    updateFromPointer(event.clientX)
                  }}
                />
              )
            })}
          </div>
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
                <div className="keyframe-meta">t = {frame.t.toFixed(2)}s</div>
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
