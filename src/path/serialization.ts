/** Serialize/deserialize path keyframes (e.g. for path.json). */
import type { Keyframe } from './types'

export const exportPath = (keyframes: Keyframe[]) => {
  return JSON.stringify({ version: 1, keyframes }, null, 2)
}

export const importPath = (raw: string): Keyframe[] => {
  const parsed = JSON.parse(raw) as { version?: number; keyframes?: Keyframe[] }
  if (!parsed.keyframes || !Array.isArray(parsed.keyframes)) {
    throw new Error('Invalid path data')
  }
  return parsed.keyframes
}
