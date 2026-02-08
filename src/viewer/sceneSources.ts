/** Scene preset and .ply URL validation (URL must end with .ply). */
export interface SceneSource {
  id: string
  label: string
  url: string
}

export const scenePresets: SceneSource[] = [
  {
    id: 'preset-1',
    label: 'Preset 1 (paste URL)',
    url: '',
  },
  {
    id: 'preset-2',
    label: 'Preset 2 (paste URL)',
    url: '',
  },
]

const PLY_REGEX = /\.ply(\?|#|$)/i

export const normalizeSceneUrl = (value: string) => value.trim()

export const isValidPlyUrl = (value: string) => PLY_REGEX.test(value)
