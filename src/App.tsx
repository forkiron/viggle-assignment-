import { useEffect, useMemo } from 'react'
import { SplatViewer } from './viewer/SplatViewer'
import { ViewerHUD } from './ui/ViewerHUD'
import { ViewerControls } from './ui/ViewerControls'
import { GaussianViewer } from './viewer/gaussianViewer'
import { KeyframePanel } from './ui/KeyframePanel'
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
  setSelected,
  usePathStore,
} from './path/pathStore'

const DEFAULT_SCENE_URL = ''

function App() {
  const viewer = useMemo(() => new GaussianViewer(), [])
  const { status, progress, fps, pointCount, sceneUrl, error, controlMode, moveSpeed, lookSensitivity } =
    useViewerStore((state) => state)
  const { keyframes, selectedId, isPreviewing, previewError } = usePathStore((state) => state)

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
    console.info('[PathPreview] start', { count: keyframes.length })
    setPreviewing(true)
    const first = keyframes[0]
    if (first) {
      viewer.setCameraPose(first.pose)
      setSelected(first.id)
    }
    // TODO(step-4): play path with spline/slerp + easing at 30 FPS.
  }

  const handlePreviewStop = () => {
    console.info('[PathPreview] stop')
    setPreviewing(false)
  }

  return (
    <div className="app-shell">
      <SplatViewer viewer={viewer} />
      <ViewerHUD status={status} progress={progress} fps={fps} pointCount={pointCount} error={error} />
      <KeyframePanel
        keyframes={keyframes}
        selectedId={selectedId}
        isPreviewing={isPreviewing}
        previewError={previewError}
        onAddKeyframe={handleAddKeyframe}
        onDeleteKeyframe={deleteKeyframe}
        onMoveKeyframe={moveKeyframe}
        onSelectKeyframe={setSelected}
        onPreviewPlay={handlePreviewPlay}
        onPreviewStop={handlePreviewStop}
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
