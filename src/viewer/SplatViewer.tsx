/**
 * Mounts the GaussianViewer into a full-size container and disposes on unmount.
 */
import { useEffect, useRef } from 'react'
import type { GaussianViewer } from './gaussianViewer'
import { setViewerError, setViewerStatus } from '../state/viewerStore'

interface SplatViewerProps {
  viewer: GaussianViewer
}

export function SplatViewer({ viewer }: SplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    try {
      viewer.init(container)
      setViewerStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize viewer.'
      setViewerStatus('error')
      setViewerError(message)
    }

    return () => viewer.dispose()
  }, [viewer])

  return <div className="viewer-canvas" ref={containerRef} />
}
