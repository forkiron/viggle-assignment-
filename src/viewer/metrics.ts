export interface FpsTracker {
  start: () => void
  stop: () => void
}

export const createFpsTracker = (onUpdate: (fps: number) => void): FpsTracker => {
  let rafId = 0
  let frameCount = 0
  let lastTime = 0
  let running = false

  const tick = (time: number) => {
    if (!running) return

    frameCount += 1
    if (!lastTime) {
      lastTime = time
    }

    const delta = time - lastTime
    if (delta >= 1000) {
      const fps = Math.round((frameCount * 1000) / delta)
      onUpdate(fps)
      frameCount = 0
      lastTime = time
    }

    rafId = requestAnimationFrame(tick)
  }

  return {
    start: () => {
      if (running) return
      running = true
      rafId = requestAnimationFrame(tick)
    },
    stop: () => {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
      frameCount = 0
      lastTime = 0
    },
  }
}
