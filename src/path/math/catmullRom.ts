/** Catmull-Rom spline and linear vec3 lerp for position interpolation between keyframes. */
export type Vec3 = [number, number, number]

export const catmullRom = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 => {
  const t2 = t * t
  const t3 = t2 * t

  const x =
    0.5 *
    ((2 * p1[0]) +
      (-p0[0] + p2[0]) * t +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)

  const y =
    0.5 *
    ((2 * p1[1]) +
      (-p0[1] + p2[1]) * t +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)

  const z =
    0.5 *
    ((2 * p1[2]) +
      (-p0[2] + p2[2]) * t +
      (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
      (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3)

  return [x, y, z]
}

export const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
