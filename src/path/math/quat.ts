/** Quaternion SLERP for smooth rotation interpolation between keyframes. */
export type Quat = [number, number, number, number]

const dot = (a: Quat, b: Quat) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]

const normalize = (q: Quat): Quat => {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len]
}

export const slerpQuat = (a: Quat, b: Quat, t: number): Quat => {
  let q1: Quat = a
  let q2: Quat = b
  let cosTheta = dot(q1, q2)

  if (cosTheta < 0) {
    q2 = [-q2[0], -q2[1], -q2[2], -q2[3]]
    cosTheta = -cosTheta
  }

  if (cosTheta > 0.9995) {
    const out: Quat = [
      q1[0] + (q2[0] - q1[0]) * t,
      q1[1] + (q2[1] - q1[1]) * t,
      q1[2] + (q2[2] - q1[2]) * t,
      q1[3] + (q2[3] - q1[3]) * t,
    ]
    return normalize(out)
  }

  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)))
  const sinTheta = Math.sin(theta)
  const w1 = Math.sin((1 - t) * theta) / sinTheta
  const w2 = Math.sin(t * theta) / sinTheta

  const out: Quat = [
    q1[0] * w1 + q2[0] * w2,
    q1[1] * w1 + q2[1] * w2,
    q1[2] * w1 + q2[2] * w2,
    q1[3] * w1 + q2[3] * w2,
  ]

  return normalize(out)
}
