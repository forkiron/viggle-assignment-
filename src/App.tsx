import { useEffect, useMemo } from 'react'
import { SplatViewer } from './viewer/SplatViewer'
import { ViewerHUD } from './ui/ViewerHUD'
import { ViewerControls } from './ui/ViewerControls'
import { GaussianViewer } from './viewer/gaussianViewer'
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

const DEFAULT_SCENE_URL = ''

function App() {
  const viewer = useMemo(() => new GaussianViewer(), [])
  const { status, progress, fps, pointCount, sceneUrl, error, controlMode, moveSpeed, lookSensitivity } =
    useViewerStore((state) => state)

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

  return (
    <div className="app-shell">
      <SplatViewer viewer={viewer} />
      <ViewerHUD status={status} progress={progress} fps={fps} pointCount={pointCount} error={error} />
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
