/** Keyframes panel: add/clear, presets, timeline with draggable keyframes, per-shot reorder/delete, preview play/stop, seek. */
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

const IconUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)
const IconDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

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
        <div className="panel-title-row">
          <span className="panel-title">Keyframes</span>
          <span className="panel-subtitle">Mode: {controlMode}</span>
        </div>
        <div className="panel-actions">
          <button className="control-button control-button-sm" onClick={onAddKeyframe} title="Add keyframe">
            Add
          </button>
          <button className="control-button control-button-sm danger" onClick={onClearKeyframes} title="Clear all">
            Clear
          </button>
        </div>
      </div>

      <div className="panel-row panel-row-tight">
        <button className={`control-button control-button-sm ${showFrustum ? 'active' : ''}`} onClick={onToggleFrustum} title="Toggle frustum">
          {showFrustum ? 'Frustum on' : 'Frustum off'}
        </button>
        <div className="panel-presets">
          <button className="control-button control-button-sm" onClick={() => onPreset('turntable')} title="Turntable">Turntable</button>
          <button className="control-button control-button-sm" onClick={() => onPreset('dolly-in')} title="Dolly in">Dolly</button>
          <button className="control-button control-button-sm" onClick={() => onPreset('crane-up')} title="Crane up">Crane</button>
          <button className="control-button control-button-sm" onClick={() => onPreset('figure-8')} title="Figure 8">Figure-8</button>
        </div>
      </div>

      {currentPose ? (
        <div className="panel-meta">Camera {formatPoseLabel(currentPose)}</div>
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
                <div className="keyframe-row-main">
                  <span className="keyframe-label">Shot {index + 1}</span>
                  <span className="keyframe-meta">{formatPoseLabel(frame.pose)} · t={frame.t.toFixed(2)}s</span>
                </div>
                <div className="keyframe-actions">
                  <button
                    className="control-icon-btn"
                    title="Move up"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveKeyframe(frame.id, -1)
                    }}
                    disabled={index === 0}
                  >
                    <IconUp />
                  </button>
                  <button
                    className="control-icon-btn"
                    title="Move down"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveKeyframe(frame.id, 1)
                    }}
                    disabled={index === keyframes.length - 1}
                  >
                    <IconDown />
                  </button>
                  <button
                    className="control-icon-btn danger"
                    title="Delete"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteKeyframe(frame.id)
                    }}
                  >
                    <IconTrash />
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
