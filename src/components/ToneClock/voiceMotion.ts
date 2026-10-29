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

export interface TransitionFrame {
  /** Pitch classes of the voices staying in place (common tones). */
  held: number[]
  /** Centers of the moving voices. */
  moving: Point[]
  /** Chord path through the voices, ordered around the circle. */
  path: ChordPath | null
}

/** A frame of the motion of the voices from one chord to the next at time `t` (0..1). */
export function transitionFrame(voices: readonly Voice[], t: number, order: CircleOrder): TransitionFrame {
  const held = [...new Set(voices.filter((voice) => voice.motion === 0).map((voice) => voice.from))]
  const moving = voices
    .filter((voice) => voice.motion !== 0)
    .map((voice) => voicePoint(voice, t, order, CIRCLE_RADIUS))
  const vertices = voices
    .map((voice) => voicePoint(voice, t, order, APEX_RADIUS))
    .sort((a, b) => angleKey(a) - angleKey(b))
  return { held, moving, path: curvedPolygon(vertices) }
}

/** Angle of a point for sorting, rounded so that noise does not move a point at the top to the end. */
function angleKey(point: Point): number {
  return Math.round(pointAngle(point) * 1e6) % Math.round(2 * Math.PI * 1e6)
}
