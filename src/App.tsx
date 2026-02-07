import { useEffect, useMemo } from 'react'
import { SplatViewer } from './viewer/SplatViewer'
import { ViewerHUD } from './ui/ViewerHUD'
import { ViewerControls } from './ui/ViewerControls'
import { GaussianViewer } from './viewer/gaussianViewer'
import { KeyframePanel } from './ui/KeyframePanel'
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
  useViewerStore,
} from './state/viewerStore'
import { createFpsTracker } from './viewer/metrics'
import { isValidPlyUrl, normalizeSceneUrl, scenePresets } from './viewer/sceneSources'
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
  usePathStore,
} from './path/pathStore'

const DEFAULT_SCENE_URL = ''

function App() {
  const viewer = useMemo(() => new GaussianViewer(), [])
  const { status, progress, fps, pointCount, sceneUrl, error, controlMode, moveSpeed, lookSensitivity } =
    useViewerStore((state) => state)
  const { keyframes, selectedId, isPreviewing, isPaused, currentTime, duration, loop, previewError } =
    usePathStore((state) => state)
  const playerRef = useMemo(() => new PathPlayer(viewer), [viewer])

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
      setCurrentTime(playerRef.getCurrentTime())
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
