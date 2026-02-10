/**
 * App shell: mounts viewer, HUD, controls, keyframe panel, export panel.
 * Wires viewer store, path store, PathPlayer, and export server.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { SplatViewer } from './viewer/SplatViewer'
import { ViewerHUD } from './ui/ViewerHUD'
import { ViewerControls } from './ui/ViewerControls'
import { GaussianViewer } from './viewer/gaussianViewer'
import { KeyframePanel } from './ui/KeyframePanel'
import { ExportPanel } from './ui/ExportPanel'
import { PathPlayer } from './path/player/PathPlayer'
import {
  resetViewerError,
  setViewerProgress,
  setViewerSceneUrl,
  setViewerStatus,
  setViewerPointCount,
  setViewerError,
  setViewerFps,
  setViewerControlMode,
  setViewerMoveSpeed,
  setViewerLookSensitivity,
  setSmoothing,
  useViewerStore,
} from './state/viewerStore'
import { createFpsTracker } from './viewer/metrics'
import { isValidPlyUrl, normalizeSceneUrl, scenePresets } from './viewer/sceneSources'
import { ExportPipeline } from './export/ExportPipeline'
import type { ExportSettings } from './export/ExportPipeline'
import {
  addKeyframe,
  deleteKeyframe,
  moveKeyframe,
  setPreviewError,
  setPreviewing,
  setPaused,
  setCurrentTime,
  setDuration,
  setLoop,
  clearPreviewError,
  setSelected,
  clearKeyframes,
  setKeyframeTime,
  usePathStore,
} from './path/pathStore'

const DEFAULT_SCENE_URL = ''
const EXPORT_SERVER_URL = import.meta.env.VITE_EXPORT_SERVER_URL || 'http://localhost:5174'
const DEFAULT_EXPORT = { width: 1280, height: 720, fps: 30 }

function App() {
  const viewer = useMemo(() => new GaussianViewer(), [])
  const { status, progress, fps, pointCount, sceneUrl, error, controlMode, moveSpeed, lookSensitivity, smoothing } =
    useViewerStore((state) => state)
  const { keyframes, selectedId, isPreviewing, isPaused, currentTime, duration, loop, previewError } =
    usePathStore((state) => state)
  const playerRef = useMemo(() => new PathPlayer(viewer), [viewer])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('Idle')
  const [exportOutputUrl, setExportOutputUrl] = useState<string | undefined>(undefined)
  const pipelineRef = useRef<ExportPipeline | null>(null)
  const [lastExportSettings, setLastExportSettings] = useState<ExportSettings | null>(null)

  // --- Sync path duration; FPS; control mode / speed / sensitivity / frustum ---
  useEffect(() => {
    playerRef.setKeyframes(keyframes)
    setDuration(playerRef.getDuration())
  }, [keyframes, playerRef])

  useEffect(() => {
    const tracker = createFpsTracker((value) => setViewerFps(value))
    tracker.start()
    return () => tracker.stop()
  }, [])

  useEffect(() => {
    viewer.setControlMode(controlMode)
  }, [controlMode, viewer])

  useEffect(() => {
    viewer.setMoveSpeed(moveSpeed)
  }, [moveSpeed, viewer])

  useEffect(() => {
    viewer.setLookSensitivity(lookSensitivity)
  }, [lookSensitivity, viewer])

  useEffect(() => {
    playerRef.setSmoothing(smoothing)
  }, [smoothing, playerRef])

  // --- Scene load ---
  const handleLoad = async (nextUrl: string) => {
    const normalizedUrl = normalizeSceneUrl(nextUrl)

    if (!isValidPlyUrl(normalizedUrl)) {
      setViewerStatus('error')
      setViewerError('Please provide a valid .ply URL')
      return
    }

    resetViewerError()
    setViewerSceneUrl(normalizedUrl)
    setViewerStatus('loading')
    setViewerProgress(0)

    try {
      await viewer.loadScene(normalizedUrl, (value) => {
        const clamped = Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
        setViewerProgress(clamped)
      })
      setViewerStatus('ready')
      setViewerProgress(100)
      setViewerPointCount(viewer.getPointCount())
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load scene.'
      setViewerStatus('error')
      setViewerError(message)
    }
  }

  // --- Keyframes ---
  const handleAddKeyframe = () => {
    const pose = viewer.getCameraPose()
    if (!pose) {
      setPreviewError('Camera pose unavailable.')
      return
    }
    addKeyframe(pose)
  }

  const handleSetKeyframeTime = (id: string, time: number) => {
    if (isPreviewing || isPaused) {
      playerRef.stop()
      setPreviewing(false)
      setPaused(false)
    }
    setKeyframeTime(id, time)
  }

  const handlePreviewPlay = () => {
    if (keyframes.length < 2) {
      setPreviewError('Add at least 2 keyframes to preview.')
      return
    }
    clearPreviewError()
    const started = playerRef.play()
    if (!started) {
      setPreviewError('Unable to start preview.')
      return
    }
    setPreviewing(true)
    setPaused(false)
  }

  const handlePreviewPause = () => {
    playerRef.pause()
    setPaused(true)
    setPreviewing(false)
  }

  const handlePreviewStop = () => {
    playerRef.stop()
    setPreviewing(false)
    setPaused(false)
  }

  // --- Export MP4 (off-screen rendering — viewer stays fully interactive) ---
  const runExport = async (settings: ExportSettings) => {
    const pipeline = new ExportPipeline(EXPORT_SERVER_URL)
    pipelineRef.current = pipeline

    setIsExporting(true)
    setExportProgress(0)
    setExportOutputUrl(undefined)
    setExportStatus('Starting export…')
    // NOTE: controls are NOT disabled — user keeps full interactivity

    try {
      const outputUrl = await pipeline.run(viewer, settings, (frame, total, status) => {
        setExportProgress(frame / total)
        setExportStatus(status)
      })
      setExportOutputUrl(outputUrl)
      setExportStatus('Export complete.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setExportStatus(message)
    } finally {
      setIsExporting(false)
      pipelineRef.current = null
    }
  }

  const handleExport = async () => {
    if (isExporting) return
    if (keyframes.length < 2) {
      setExportStatus('Add at least 2 keyframes to export.')
      return
    }
    const totalDuration = duration || Math.max(0, keyframes[keyframes.length - 1].t - keyframes[0].t)
    if (totalDuration <= 0) {
      setExportStatus('Invalid duration.')
      return
    }

    const frameCount = Math.ceil(totalDuration * DEFAULT_EXPORT.fps)
    const settings: ExportSettings = {
      version: 1,
      sceneUrl: sceneUrl || '',
      keyframes,
      render: { ...DEFAULT_EXPORT, duration: totalDuration, frameCount, smoothing },
    }

    setLastExportSettings(settings)
    await runExport(settings)
  }

  const handleRerunExport = async () => {
    if (isExporting || !lastExportSettings) return
    await runExport(lastExportSettings)
  }

  const handleCancelExport = () => {
    if (!isExporting) return
    pipelineRef.current?.cancel()
    setExportStatus('Cancelling…')
    setExportOutputUrl(undefined)
  }

  const handleToggleLoop = () => {
    const next = !loop
    playerRef.setLoop(next)
    setLoop(next)
  }

  const handleSeek = (value: number) => {
    playerRef.pause()
    playerRef.seek(value)
    setCurrentTime(value)
    setPaused(true)
    setPreviewing(false)
  }

  useEffect(() => {
    if (!isPreviewing) return
    let raf = 0
    const tick = () => {
      const playing = playerRef.getIsPlaying()
      setCurrentTime(playerRef.getCurrentTime())
      if (!playing) {
        setPreviewing(false)
        setPaused(false)
        setCurrentTime(playerRef.getCurrentTime())
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPreviewing, playerRef])

  // --- Render ---
  return (
    <div className="app-shell">
      <SplatViewer viewer={viewer} />
      <ViewerHUD status={status} progress={progress} fps={fps} pointCount={pointCount} error={error} />
      <KeyframePanel
        keyframes={keyframes}
        selectedId={selectedId}
        isPreviewing={isPreviewing}
        isPaused={isPaused}
        currentTime={currentTime}
        duration={duration}
        loop={loop}
        previewError={previewError}
        onAddKeyframe={handleAddKeyframe}
        onSetKeyframeTime={handleSetKeyframeTime}
        smoothing={smoothing}
        onSmoothingChange={(value) => setSmoothing(value)}
        onClearKeyframes={() => {
          playerRef.stop()
          clearKeyframes()
        }}
        onDeleteKeyframe={deleteKeyframe}
        onMoveKeyframe={moveKeyframe}
        onSelectKeyframe={setSelected}
        onPreviewPlay={handlePreviewPlay}
        onPreviewPause={handlePreviewPause}
        onPreviewStop={handlePreviewStop}
        onToggleLoop={handleToggleLoop}
        onSeek={handleSeek}
        controlMode={controlMode}
        currentPose={viewer.getCameraPose()}
      />
      <ViewerControls
        presets={scenePresets}
        sceneUrl={sceneUrl || DEFAULT_SCENE_URL}
        status={status}
        controlMode={controlMode}
        moveSpeed={moveSpeed}
        lookSensitivity={lookSensitivity}
        isPreviewing={isPreviewing}
        onSceneUrlChange={setViewerSceneUrl}
        onLoad={handleLoad}
        onFrameScene={() => viewer.frameScene()}
        onResetView={() => viewer.resetView()}
        onControlModeChange={(mode) => setViewerControlMode(mode)}
        onMoveSpeedChange={(value) => setViewerMoveSpeed(value)}
        onLookSensitivityChange={(value) => setViewerLookSensitivity(value)}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportStatus={exportStatus}
        onExport={handleExport}
        onCancelExport={handleCancelExport}
        onRerunExport={handleRerunExport}
        canRerunExport={!!lastExportSettings}
        exportOutputUrl={exportOutputUrl}
      />
    </div>
  )
}

export default App
