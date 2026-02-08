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
  setShowFrustum,
  useViewerStore,
} from './state/viewerStore'
import { createFpsTracker } from './viewer/metrics'
import { isValidPlyUrl, normalizeSceneUrl, scenePresets } from './viewer/sceneSources'
import { samplePoseAtTime } from './path/player/sampler'
import { generateCraneUp, generateDollyIn, generateFigure8, generateTurntable } from './path/presets'
import { Quaternion, Vector3 } from 'three'
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
  setKeyframes,
  setKeyframeTime,
  usePathStore,
} from './path/pathStore'

const DEFAULT_SCENE_URL = ''
const EXPORT_SERVER_URL = import.meta.env.VITE_EXPORT_SERVER_URL || 'http://localhost:5174'
const DEFAULT_EXPORT = { width: 1280, height: 720, fps: 30 }

function App() {
  const viewer = useMemo(() => new GaussianViewer(), [])
  const { status, progress, fps, pointCount, sceneUrl, error, controlMode, moveSpeed, lookSensitivity, showFrustum } =
    useViewerStore((state) => state)
  const { keyframes, selectedId, isPreviewing, isPaused, currentTime, duration, loop, previewError } =
    usePathStore((state) => state)
  const playerRef = useMemo(() => new PathPlayer(viewer), [viewer])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('Idle')
  const [exportOutputUrl, setExportOutputUrl] = useState<string | undefined>(undefined)
  const exportCancelRef = useRef(false)

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
    viewer.setFrustumVisible(showFrustum)
  }, [showFrustum, viewer])

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

  const handleAddKeyframe = () => {
    const pose = viewer.getCameraPose()
    if (!pose) {
      setPreviewError('Camera pose unavailable.')
      return
    }
    addKeyframe(pose)
  }

  const handlePreset = (preset: 'turntable' | 'dolly-in' | 'crane-up' | 'figure-8') => {
    const cameraPose = viewer.getCameraPose()
    if (!cameraPose) {
      setPreviewError('Camera pose unavailable.')
      return
    }

    const camPos = new Vector3(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2])
    const orbitTarget = viewer.getOrbitTarget()
    let target = orbitTarget ?? new Vector3(0, 0, 0)
    const radius = Math.max(1, camPos.distanceTo(target))
    if (!orbitTarget) {
      const quat = new Quaternion(
        cameraPose.quaternion[0],
        cameraPose.quaternion[1],
        cameraPose.quaternion[2],
        cameraPose.quaternion[3],
      )
      const forward = new Vector3(0, 0, -1).applyQuaternion(quat).normalize()
      target = camPos.clone().addScaledVector(forward, radius)
    }
    const height = camPos.y - target.y
    const options = { target, radius, height, fov: cameraPose.fov, duration: 8 }

    let frames
    switch (preset) {
      case 'turntable':
        frames = generateTurntable(options)
        break
      case 'dolly-in':
        frames = generateDollyIn(options)
        break
      case 'crane-up':
        frames = generateCraneUp(options)
        break
      case 'figure-8':
        frames = generateFigure8(options)
        break
      default:
        return
    }

    setKeyframes(frames)
    clearPreviewError()
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

    exportCancelRef.current = false
    setIsExporting(true)
    setExportProgress(0)
    setExportOutputUrl(undefined)
    setExportStatus('Starting export…')
    viewer.setControlsEnabled(false)

    try {
      const frameCount = Math.ceil(totalDuration * DEFAULT_EXPORT.fps)
      const settings = {
        version: 1,
        sceneUrl,
        keyframes,
        render: { ...DEFAULT_EXPORT, duration: totalDuration, frameCount },
      }

      const startRes = await fetch(`${EXPORT_SERVER_URL}/export/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!startRes.ok) throw new Error('Failed to start export')
      const { id } = await startRes.json()

      const startT = keyframes[0].t

      for (let frame = 0; frame < frameCount; frame += 1) {
        if (exportCancelRef.current) {
          await fetch(`${EXPORT_SERVER_URL}/export/${id}/cancel`, { method: 'POST' })
          setExportStatus('Export cancelled.')
          setIsExporting(false)
          viewer.setControlsEnabled(true)
          return
        }

        const t = startT + frame / DEFAULT_EXPORT.fps
        const pose = samplePoseAtTime(keyframes, t)
        if (!pose) continue

        viewer.setCameraPose(pose)
        const blob = await viewer.renderToBlob(DEFAULT_EXPORT.width, DEFAULT_EXPORT.height)

        const form = new FormData()
        form.append('index', String(frame))
        form.append('frame', blob, `frame_${String(frame).padStart(6, '0')}.png`)

        const frameRes = await fetch(`${EXPORT_SERVER_URL}/export/${id}/frame`, {
          method: 'POST',
          body: form,
        })
        if (!frameRes.ok) throw new Error('Failed to upload frame')

        setExportProgress((frame + 1) / frameCount)
        setExportStatus(`Rendering frames: ${frame + 1}/${frameCount}`)
      }

      setExportStatus('Encoding video…')
      const finishRes = await fetch(`${EXPORT_SERVER_URL}/export/${id}/finish`, { method: 'POST' })
      if (!finishRes.ok) throw new Error('Failed to start encoding')
      const { output } = await finishRes.json()

      setExportOutputUrl(`${EXPORT_SERVER_URL}${output}`)
      setExportStatus('Export complete.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setExportStatus(message)
    } finally {
      setIsExporting(false)
      viewer.setControlsEnabled(true)
    }
  }

  const handleCancelExport = () => {
    if (!isExporting) return
    exportCancelRef.current = true
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
        onPreset={handlePreset}
        onSetKeyframeTime={handleSetKeyframeTime}
        onToggleFrustum={() => setShowFrustum(!showFrustum)}
        showFrustum={showFrustum}
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
      <ExportPanel
        isExporting={isExporting}
        progress={exportProgress}
        status={exportStatus}
        onExport={handleExport}
        onCancel={handleCancelExport}
        outputUrl={exportOutputUrl}
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
      />
    </div>
  )
}

export default App
