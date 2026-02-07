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
      console.info('[SplatViewer] init: mounting viewer')
      viewer.init(container)
      setViewerStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize viewer.'
      setViewerStatus('error')
      setViewerError(message)
    }

    const logLayout = (label: string) => {
      const rect = container.getBoundingClientRect()
      const localCanvas = container.querySelector('canvas')
      const bodyCanvas = document.body.querySelector('canvas')
      const localRect = localCanvas?.getBoundingClientRect()
      const bodyRect = bodyCanvas?.getBoundingClientRect()
      console.info(`[SplatViewer] ${label}`, {
        containerRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        localCanvasRect: localRect
          ? {
              x: localRect.x,
              y: localRect.y,
              width: localRect.width,
              height: localRect.height,
            }
          : null,
        bodyCanvasRect: bodyRect
          ? {
              x: bodyRect.x,
              y: bodyRect.y,
              width: bodyRect.width,
              height: bodyRect.height,
            }
          : null,
        localCanvasParent: localCanvas?.parentElement?.className ?? null,
        bodyCanvasParent: bodyCanvas?.parentElement?.className ?? bodyCanvas?.parentElement?.tagName ?? null,
        bodyCanvasIsLocal: bodyCanvas === localCanvas,
        childCount: container.childElementCount,
      })
    }

    logLayout('post-init layout')

    const observer = new MutationObserver(() => logLayout('mutation layout'))
    observer.observe(container, { childList: true, subtree: true })

    return () => viewer.dispose()
  }, [viewer])

  return <div className="viewer-canvas" ref={containerRef} />
}
