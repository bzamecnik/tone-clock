import type { Voice } from '../../music/voiceLeading.ts'
import { curvedPolygon, type ChordPath } from './chordPath.ts'
import {
  APEX_RADIUS,
  CIRCLE_RADIUS,
  circlePoint,
  pointAngle,
  positionOf,
  type CircleOrder,
  type Point,
} from './geometry.ts'

/** Cubic easing: starts and ends slowly. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2
}

/**
 * Where a voice is at time `t` (0..1) of its motion, at the radius. In the
 * semitone order it moves along the circle by its motion; in the order of
 * fifths, where its neighbors in semitones are far apart, it skips straight
 * across the circle.
 */
export function voicePoint(voice: Voice, t: number, order: CircleOrder, radius: number): Point {
  if (order === 'semitones') {
    return circlePoint(voice.from + voice.motion * t, radius)
  }
  const start = circlePoint(positionOf(voice.from, order), radius)
  const end = circlePoint(positionOf(voice.to, order), radius)
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }
}

/**
 * Time (0..1) from which the moving voices light their target beads, so
 * that the beads fade in while the voices fade out on arrival.
 */
export const ARRIVAL = 0.75
/** Time over which the moving voices fade in as they leave. */
const DEPARTURE = 0.2

export interface TransitionFrame {
  /** Pitch classes of the lit beads: the held voices (common tones), and the targets on arrival. */
  lit: number[]
  /** The moving voices: where they are and the pitch class they move to. */
  moving: { center: Point; to: number }[]
  /** Opacity of the moving voices (0..1): fading in as they leave, out as they arrive. */
  opacity: number
  /** Chord path through the voices, ordered around the circle. */
  path: ChordPath | null
}

/** A frame of the motion of the voices from one chord to the next at time `t` (0..1). */
export function transitionFrame(voices: readonly Voice[], t: number, order: CircleOrder): TransitionFrame {
  const lit = voices
    .filter((voice) => voice.motion === 0 || t >= ARRIVAL)
    .map((voice) => voice.to)
  const opacity = Math.min(t / DEPARTURE, (1 - t) / (1 - ARRIVAL), 1)
  const moving = voices
    .filter((voice) => voice.motion !== 0)
    .map((voice) => ({ center: voicePoint(voice, t, order, CIRCLE_RADIUS), to: voice.to }))
  const vertices = voices
    .map((voice) => voicePoint(voice, t, order, APEX_RADIUS))
    .sort((a, b) => angleKey(a) - angleKey(b))
  return { lit: [...new Set(lit)].sort((a, b) => a - b), moving, opacity, path: curvedPolygon(vertices) }
}

/** Angle of a point for sorting, rounded so that noise does not move a point at the top to the end. */
function angleKey(point: Point): number {
  return Math.round(pointAngle(point) * 1e6) % Math.round(2 * Math.PI * 1e6)
}
