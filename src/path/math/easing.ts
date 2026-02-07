export const easeInOutCubic = (t: number) => {
  // TODO(step-4): apply easing to time parameter.
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
