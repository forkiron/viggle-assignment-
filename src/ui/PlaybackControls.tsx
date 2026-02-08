/** Play / Pause / Stop, loop toggle, seek slider, time display. */

interface PlaybackControlsProps {
  isPlaying: boolean
  isPaused: boolean
  loop: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onToggleLoop: () => void
  onSeek: (value: number) => void
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return '0.0s'
  return `${value.toFixed(1)}s`
}

export function PlaybackControls({
  isPlaying,
  isPaused,
  loop,
  currentTime,
  duration,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
  onSeek,
}: PlaybackControlsProps) {
  return (
    <div className="playback-controls">
      <div className="playback-row">
        <button className="control-button primary" onClick={isPlaying ? onPause : onPlay}>
          {isPlaying ? 'Pause' : 'Preview Play'}
        </button>
        <button className="control-button" onClick={onStop}>
          Stop
        </button>
        <button className={`control-button ${loop ? 'active' : ''}`} onClick={onToggleLoop}>
          {loop ? 'Loop On' : 'Loop Off'}
        </button>
      </div>
      <div className="playback-row">
        <input
          className="control-range"
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <div className="playback-time">
          {formatTime(currentTime)} / {formatTime(duration)}
          {isPaused ? ' (paused)' : ''}
        </div>
      </div>
    </div>
  )
}
