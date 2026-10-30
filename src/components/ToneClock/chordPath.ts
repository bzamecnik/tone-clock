import { OCTAVE_SIZE, mod, toPitchClasses, type PitchClassSet } from '../../music/pitchClassSet.ts'
import { beadLayout, format, pointAngle, positionOf, type CircleOrder, type Point } from './geometry.ts'

// in the chromatic order, indexed by position
const APEXES = beadLayout().map((bead) => bead.apex)

export interface ChordPath {
  /** SVG path data. */
  d: string
  /** Closed (fillable) polygon for 3+ tones, an open curve for 2 tones. */
  closed: boolean
}

/** Shorter distance between two pitch classes around the circle (0..6). */
export function intervalClass(one: number, other: number): number {
  const interval = mod(one - other, OCTAVE_SIZE)
  return Math.min(interval, OCTAVE_SIZE - interval)
}

function formatPoint(p: Point): string {
  return `${format(p.x)} ${format(p.y)}`
}

/** Angle between the directions of two points from the center, in semitone steps of the circle (0..6). */
function angularSteps(a: Point, b: Point): number {
  const turn = Math.abs(pointAngle(a) - pointAngle(b)) / (2 * Math.PI)
  return Math.min(turn, 1 - turn) * OCTAVE_SIZE
}

/**
 * Quadratic Bézier from `a` to `b` whose control point is their midpoint
 * pulled towards the center by how far apart they are around the circle:
 * tritones bend to the center, semitones stay almost straight (as in the
 * original ChordPath).
 */
function quadSegment(a: Point, b: Point): string {
  const stiffness = 1 - angularSteps(a, b) / 6
  const control = { x: (a.x + b.x) * 0.5 * stiffness, y: (a.y + b.y) * 0.5 * stiffness }
  return `Q ${formatPoint(control)} ${formatPoint(b)}`
}

/**
 * Curved polygon through the points in the given order: closed for 3+
 * points, an open curve for 2 points, none for fewer.
 */
export function curvedPolygon(points: readonly Point[]): ChordPath | null {
  if (points.length < 2) {
    return null
  }
  const closed = points.length >= 3
  const parts = [`M ${formatPoint(points[0])}`]
  for (let i = 1; i < points.length; i++) {
    parts.push(quadSegment(points[i - 1], points[i]))
  }
  if (closed) {
    parts.push(quadSegment(points[points.length - 1], points[0]), 'Z')
  }
  return { d: parts.join(' '), closed }
}

/** Curved polygon connecting the active pitch classes clockwise around the circle. */
export function chordPath(tones: PitchClassSet, order: CircleOrder = 'semitones'): ChordPath | null {
  const positions = toPitchClasses(tones)
    .map((pc) => positionOf(pc, order))
    .sort((a, b) => a - b)
  return curvedPolygon(positions.map((position) => APEXES[position]))
}
