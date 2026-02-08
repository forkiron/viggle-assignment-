/**
 * Drives preview playback: advances time, samples pose via sampler, applies to viewer.
 * Supports play/pause/stop, seek, and loop.
 */
import type { Keyframe } from '../types'
import { samplePoseAtTime } from './sampler'
import type { GaussianViewer } from '../../viewer/gaussianViewer'

export class PathPlayer {
  private viewer: GaussianViewer
  private keyframes: Keyframe[] = []
  private rafId = 0
  private startTime = 0
  private currentTime = 0
  private duration = 0
  private isPlaying = false
  private isPaused = false
  private loop = false

  constructor(viewer: GaussianViewer) {
    this.viewer = viewer
  }

  setKeyframes(keyframes: Keyframe[]) {
    this.keyframes = keyframes
    this.duration = this.computeDuration(keyframes)
    if (this.currentTime > this.duration) {
      this.currentTime = this.duration
    }
  }

  setLoop(loop: boolean) {
    this.loop = loop
  }

  getDuration() {
    return this.duration
  }

  getCurrentTime() {
    return this.currentTime
  }

  play() {
    if (this.keyframes.length < 2) return false
    this.isPlaying = true
    this.isPaused = false
    this.viewer.setControlsEnabled(false)
    this.startTime = performance.now() - this.currentTime * 1000
    this.schedule()
    return true
  }

  pause() {
    if (!this.isPlaying) return
    this.isPaused = true
    this.isPlaying = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  stop() {
    this.isPaused = false
    this.isPlaying = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
    this.currentTime = 0
    const first = this.keyframes[0]?.pose
    if (first) {
      this.viewer.setCameraPose(first)
    }
    this.viewer.setControlsEnabled(true)
  }

  seek(time: number) {
    this.currentTime = Math.max(0, Math.min(this.duration, time))
    const pose = samplePoseAtTime(this.keyframes, this.currentTime)
    if (pose) {
      this.viewer.setCameraPose(pose)
    }
  }

  getIsPlaying() {
    return this.isPlaying
  }

  getIsPaused() {
    return this.isPaused
  }

  private schedule() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = requestAnimationFrame(this.tick)
  }

  private tick = (time: number) => {
    if (!this.isPlaying) return
    this.currentTime = (time - this.startTime) / 1000

    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.currentTime = 0
        this.startTime = time
      } else {
        this.stop()
        return
      }
    }

    const pose = samplePoseAtTime(this.keyframes, this.currentTime)
    if (pose) {
      this.viewer.setCameraPose(pose)
    }

    this.rafId = requestAnimationFrame(this.tick)
  }

  private computeDuration(keyframes: Keyframe[]) {
    if (keyframes.length < 2) return 0
    const start = keyframes[0].t
    const end = keyframes[keyframes.length - 1].t
    return Math.max(0, end - start)
  }
}
