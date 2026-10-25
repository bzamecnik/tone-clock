import { OCTAVE_SIZE, mod } from '../../music/pitchClassSet.ts'

/**
 * Geometry of the tone circle in SVG user units. The beads follow the
 * proportions of the original Android ToneCircleView, scaled to a circle of
 * "radius" 100. The view box is a square centered at the origin with "radius"
 * VIEW_RADIUS, leaving room for the key markers outside the beads.
 */
const UNIT = 100
export const BEAD_RADIUS = 0.19 * UNIT
export const CIRCLE_RADIUS = 0.8 * UNIT
/** Radius of the bead apexes, the vertices of the chord polygon. */
export const APEX_RADIUS = CIRCLE_RADIUS - BEAD_RADIUS

/**
 * Scale arc: a band just inside the beads marking the diatonic scale of the
 * key (like the white keys of a piano), with gaps between separate runs.
 */
export const SCALE_ARC_WIDTH = 6
export const SCALE_ARC_RADIUS = APEX_RADIUS - 3 - SCALE_ARC_WIDTH / 2
export const SCALE_ARC_GAP_DEGREES = 1.5

/** Key marker: a small triangle outside each bead, pointing inwards. */
const MARKER_TIP_RADIUS = CIRCLE_RADIUS + BEAD_RADIUS + 3
const MARKER_LENGTH = 6
const MARKER_HALF_WIDTH = 6
/** Invisible hit area around a marker, larger than the triangle (touch). */
const MARKER_HIT_RADIUS = 8

export const VIEW_RADIUS = Math.ceil(MARKER_TIP_RADIUS + MARKER_LENGTH / 2 + MARKER_HIT_RADIUS)

export interface Point {
  x: number
  y: number
}

/**
 * Order of the pitch classes around the circle: chromatic (in semitones) or
 * the circle of fifths, where diatonic scales form clusters of neighbors.
 */
export type CircleOrder = 'semitones' | 'fifths'

const ORDER_STEPS: Record<CircleOrder, number> = { semitones: 1, fifths: 7 }

/** Semitones between neighboring beads, clockwise. */
export function orderStep(order: CircleOrder): number {
  return ORDER_STEPS[order]
}

/**
 * Position of a pitch class around the circle (0 = top, clockwise). The
 * mapping is its own inverse (7 * 7 = 49 = 1 mod 12), so it also gives the
 * pitch class at a position.
 */
export function positionOf(pitchClass: number, order: CircleOrder): number {
  return mod(pitchClass * ORDER_STEPS[order], OCTAVE_SIZE)
}

export interface Bead {
  pitchClass: number
  /** Position around the circle (0 = top, clockwise). */
  position: number
  center: Point
  /** Inner edge of the bead, where chord polygon edges connect. */
  apex: Point
}

/** Angle of a position in radians, clockwise from the top (y down). */
function positionAngle(position: number): number {
  return (position / OCTAVE_SIZE) * 2 * Math.PI - Math.PI / 2
}

/** Beads indexed by pitch class. */
export function beadLayout(order: CircleOrder = 'semitones'): Bead[] {
  return Array.from({ length: OCTAVE_SIZE }, (_, pitchClass) => {
    const position = positionOf(pitchClass, order)
    const angle = positionAngle(position)
    const x = Math.cos(angle)
    const y = Math.sin(angle)
    return {
      pitchClass,
      position,
      center: { x: CIRCLE_RADIUS * x, y: CIRCLE_RADIUS * y },
      apex: { x: APEX_RADIUS * x, y: APEX_RADIUS * y },
    }
  })
}

export interface Marker {
  pitchClass: number
  tip: Point
  base: [Point, Point]
  hitCenter: Point
  hitRadius: number
}

/** Key markers indexed by pitch class. */
export function markerLayout(order: CircleOrder = 'semitones'): Marker[] {
  return Array.from({ length: OCTAVE_SIZE }, (_, pitchClass) => {
    const angle = positionAngle(positionOf(pitchClass, order))
    // radial (outwards) and tangential unit vectors
    const r = { x: Math.cos(angle), y: Math.sin(angle) }
    const t = { x: -r.y, y: r.x }
    const at = (radius: number, side: number) => ({
      x: radius * r.x + side * t.x,
      y: radius * r.y + side * t.y,
    })
    const baseRadius = MARKER_TIP_RADIUS + MARKER_LENGTH
    return {
      pitchClass,
      tip: at(MARKER_TIP_RADIUS, 0),
      base: [at(baseRadius, -MARKER_HALF_WIDTH), at(baseRadius, MARKER_HALF_WIDTH)],
      hitCenter: at(MARKER_TIP_RADIUS + MARKER_LENGTH / 2, 0),
      hitRadius: MARKER_HIT_RADIUS,
    }
  })
}

/** Angle of a point in radians in [0, 2π), clockwise from the top. */
export function pointAngle({ x, y }: Point): number {
  const angle = Math.atan2(x, -y)
  return angle < 0 ? angle + 2 * Math.PI : angle
}

/** The pitch class in the direction of a point from the center. */
export function nearestPitchClass(point: Point, order: CircleOrder = 'semitones'): number {
  const position = Math.round((pointAngle(point) / (2 * Math.PI)) * OCTAVE_SIZE) % OCTAVE_SIZE
  return positionOf(position, order)
}

/** The bead under a point, or null if the point is off the ring of beads. */
export function pitchClassAt(point: Point, order: CircleOrder = 'semitones'): number | null {
  const radius = Math.hypot(point.x, point.y)
  if (radius < CIRCLE_RADIUS - BEAD_RADIUS || radius > CIRCLE_RADIUS + BEAD_RADIUS) {
    return null
  }
  return nearestPitchClass(point, order)
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Converts client (screen) coordinates to view box coordinates, given the
 * bounding rectangle of the SVG element. The square view box is scaled to fit
 * and centered (the default `preserveAspectRatio="xMidYMid meet"`).
 */
export function clientToView(rect: Rect, clientX: number, clientY: number): Point | null {
  const size = Math.min(rect.width, rect.height)
  if (size <= 0) {
    return null
  }
  const scale = (2 * VIEW_RADIUS) / size
  return {
    x: (clientX - (rect.left + rect.width / 2)) * scale,
    y: (clientY - (rect.top + rect.height / 2)) * scale,
  }
}

/** A run of `length` neighboring positions around the circle, from `start` clockwise. */
export interface ArcRun {
  start: number
  length: number
}

/** Groups positions (0..11) into runs of neighbors, wrapping around the circle. */
export function arcRuns(positions: number[]): ArcRun[] {
  const included = new Set(positions)
  if (included.size === OCTAVE_SIZE) {
    return [{ start: 0, length: OCTAVE_SIZE }]
  }
  const runs: ArcRun[] = []
  for (let start = 0; start < OCTAVE_SIZE; start++) {
    // a run starts where the previous position is not included
    if (!included.has(start) || included.has(mod(start - 1, OCTAVE_SIZE))) {
      continue
    }
    let length = 1
    while (included.has(mod(start + length, OCTAVE_SIZE))) {
      length++
    }
    runs.push({ start, length })
  }
  return runs
}

/**
 * SVG path of an arc of the given radius over the beads of a run (each bead
 * spans 30°), clockwise, shortened by `gapDegrees` at both ends so that
 * neighboring runs stay apart.
 */
export function arcPath({ start, length }: ArcRun, radius: number, gapDegrees: number): string {
  const point = (position: number) => {
    const angle = positionAngle(position)
    return `${format(radius * Math.cos(angle))} ${format(radius * Math.sin(angle))}`
  }
  if (length >= OCTAVE_SIZE) {
    // a full circle, as two half arcs
    return `M ${point(0)} A ${radius} ${radius} 0 0 1 ${point(6)} A ${radius} ${radius} 0 0 1 ${point(0)}`
  }
  const gap = (gapDegrees / 360) * OCTAVE_SIZE
  const from = start - 0.5 + gap
  const to = start + length - 0.5 - gap
  const large = (to - from) / OCTAVE_SIZE > 0.5 ? 1 : 0
  return `M ${point(from)} A ${radius} ${radius} 0 ${large} 1 ${point(to)}`
}

/** Rounds to 3 decimals and avoids printing "-0". */
function format(n: number): string {
  return String(Math.round(n * 1000) / 1000 + 0)
}
