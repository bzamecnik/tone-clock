import { OCTAVE_SIZE, add, has, remove, toggle, type PitchClassSet } from '../../music/pitchClassSet.ts'

/**
 * Result of dragging the bead `source` and dropping it onto the bead
 * `target` (null = off the circle), as in the original app:
 * - onto itself: toggle (a plain tap/click),
 * - an active tone onto another bead: move the tone there,
 * - off the circle: clear the tone.
 */
export function applyDrop(tones: PitchClassSet, source: number, target: number | null): PitchClassSet {
  if (target === null) {
    return remove(tones, source)
  }
  if (target === source) {
    return toggle(tones, source)
  }
  if (has(tones, source)) {
    return add(remove(tones, source), target)
  }
  return tones
}

/**
 * Number of semitones to transpose by when rotating from `startAngle` to
 * `angle` (radians, clockwise), snapped to the nearest semitone.
 */
export function rotationSteps(startAngle: number, angle: number): number {
  let delta = (angle - startAngle) % (2 * Math.PI)
  if (delta > Math.PI) {
    delta -= 2 * Math.PI
  } else if (delta < -Math.PI) {
    delta += 2 * Math.PI
  }
  return Math.round((delta / (2 * Math.PI)) * OCTAVE_SIZE) + 0
}
