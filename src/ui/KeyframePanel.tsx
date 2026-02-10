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
  onSetKeyframeTime: (id: string, time: number) => void
  smoothing: number
  onSmoothingChange: (value: number) => void
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
  onSetKeyframeTime,
  smoothing,
  onSmoothingChange,
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
  const updateFromPointer = (clientX: number) => {
    if (!timelineRef.current || !draggingId) return
    const rect = timelineRef.current.getBoundingClientRect()
    const baseDuration = Math.max(duration, 0.1)
    const rawRatio = (clientX - rect.left) / rect.width
    const ratio = Math.max(0, Math.min(1, rawRatio))
    const nextTime = ratio * baseDuration
    const index = keyframes.findIndex((frame) => frame.id === draggingId)
    if (index === -1) return
    const prev = keyframes[index - 1]
    const next = keyframes[index + 1]
    const minTime = prev ? prev.t + 0.01 : 0
    const maxTime = next ? next.t - 0.01 : baseDuration
    const clamped = Math.max(minTime, Math.min(maxTime, nextTime))
    onSetKeyframeTime(draggingId, clamped)
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

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!event.key) return
      const key = event.key.toLowerCase()
      if (key !== 'e') return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault()
      onAddKeyframe()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onAddKeyframe])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!event.key) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (event.key === 'Enter') {
        event.preventDefault()
        onPreviewPlay()
        return
      }

      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      event.preventDefault()

      if (keyframes.length === 0) return
      const currentIndex = selectedId
        ? keyframes.findIndex((frame) => frame.id === selectedId)
        : 0
      const nextIndex =
        event.key === 'ArrowUp'
          ? Math.max(0, currentIndex - 1)
          : Math.min(keyframes.length - 1, currentIndex + 1)
      const next = keyframes[nextIndex]
      if (next) onSelectKeyframe(next.id)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [keyframes, selectedId, onPreviewPlay, onSelectKeyframe])
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

      <div className="panel-row">
        <label className="control-label" htmlFor="path-smoothing">
          Smoothing
        </label>
        <input
          id="path-smoothing"
          className="control-range"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={smoothing}
          onChange={(event) => onSmoothingChange(Number(event.target.value))}
        />
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
