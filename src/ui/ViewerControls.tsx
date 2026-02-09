/** Right panel: navigation mode (orbit/fly), move speed, look sensitivity, scene preset/URL, Load, Frame Scene, Reset View, Export. */
import { useEffect, useMemo, useState } from 'react'
import type { ViewerStatus } from '../state/types'
import type { SceneSource } from '../viewer/sceneSources'
import type { ControlMode } from '../state/types'
import { ExportPanel } from './ExportPanel'

interface ViewerControlsProps {
  presets: SceneSource[]
  sceneUrl: string
  status: ViewerStatus
  controlMode: ControlMode
  moveSpeed: number
  lookSensitivity: number
  isPreviewing: boolean
  onSceneUrlChange: (next: string) => void
  onLoad: (url: string) => void
  onFrameScene: () => void
  onResetView: () => void
  onControlModeChange: (mode: ControlMode) => void
  onMoveSpeedChange: (value: number) => void
  onLookSensitivityChange: (value: number) => void
  // Export props
  isExporting: boolean
  exportProgress: number
  exportStatus: string
  onExport: () => void
  onCancelExport: () => void
  exportOutputUrl?: string
}

export function ViewerControls({
  presets,
  sceneUrl,
  status,
  controlMode,
  moveSpeed,
  lookSensitivity,
  isPreviewing,
  onSceneUrlChange,
  onLoad,
  onFrameScene,
  onResetView,
  onControlModeChange,
  onMoveSpeedChange,
  onLookSensitivityChange,
  isExporting,
  exportProgress,
  exportStatus,
  onExport,
  onCancelExport,
  exportOutputUrl,
}: ViewerControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState(presets[0]?.id ?? '')

  const presetMap = useMemo(() => {
    const map = new Map<string, SceneSource>()
    presets.forEach((preset) => map.set(preset.id, preset))
    return map
  }, [presets])

  const handlePresetChange = (id: string) => {
    setSelectedPreset(id)
    const preset = presetMap.get(id)
    if (preset?.url) {
      onSceneUrlChange(preset.url)
    }
  }

  const handleLoadClick = () => {
    onLoad(sceneUrl)
  }

  const handleModeToggle = () => {
    if (isPreviewing) return
    onControlModeChange(controlMode === 'orbit' ? 'fly' : 'orbit')
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f') return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault()
      handleModeToggle()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [controlMode, isPreviewing])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) return
      if (event.key.toLowerCase() !== 'r') return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault()
      onResetView()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onResetView])

  return (
    <div className="viewer-controls">
      <label className="control-label">Navigation Mode</label>
      <button className="control-button" onClick={handleModeToggle} disabled={isPreviewing}>
        {controlMode === 'orbit' ? 'Orbit Mode' : 'Fly Mode'}
      </button>
      {controlMode === 'fly' ? (
        <div className="control-hint">Click canvas to capture mouse. WASD to move, ESC to release.</div>
      ) : null}

      <label className="control-label" htmlFor="speed">
        Move Speed
      </label>
      <input
        id="speed"
        className="control-range"
        type="range"
        min="0.5"
        max="10"
        step="0.1"
        value={moveSpeed}
        onChange={(event) => onMoveSpeedChange(Number(event.target.value))}
      />

      <label className="control-label" htmlFor="sensitivity">
        Look Sensitivity
      </label>
      <input
        id="sensitivity"
        className="control-range"
        type="range"
        min="0.0005"
        max="0.01"
        step="0.0005"
        value={lookSensitivity}
        onChange={(event) => onLookSensitivityChange(Number(event.target.value))}
      />

      <label className="control-label" htmlFor="preset">
        Scene Preset
      </label>
      <select
        id="preset"
        className="control-select"
        value={selectedPreset}
        onChange={(event) => handlePresetChange(event.target.value)}
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>

      <label className="control-label" htmlFor="scene-url">
        Scene URL
      </label>
      <input
        id="scene-url"
        className="control-input"
        type="url"
        placeholder="https://example.com/scene.ply"
        value={sceneUrl}
        onChange={(event) => onSceneUrlChange(event.target.value)}
      />

      <button className="control-button primary" onClick={handleLoadClick} disabled={status === 'loading'}>
        {status === 'loading' ? 'Loading…' : 'Load'}
      </button>

      <div className="control-row">
        <button className="control-button" onClick={onFrameScene}>
          Frame Scene
        </button>
        <button className="control-button" onClick={onResetView}>
          Reset View
        </button>
      </div>

      <ExportPanel
        isExporting={isExporting}
        progress={exportProgress}
        status={exportStatus}
        onExport={onExport}
        onCancel={onCancelExport}
        outputUrl={exportOutputUrl}
      />
    </div>
  )
}
