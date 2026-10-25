import { OCTAVE_SIZE } from '../../music/pitchClassSet.ts'

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

export interface Bead {
  pitchClass: number
  center: Point
  /** Inner edge of the bead, where chord polygon edges connect. */
  apex: Point
}

/** Angle of a pitch class in radians, clockwise from the top (y down). */
export function pitchClassAngle(pitchClass: number): number {
  return (pitchClass / OCTAVE_SIZE) * 2 * Math.PI - Math.PI / 2
}

export function beadLayout(): Bead[] {
  return Array.from({ length: OCTAVE_SIZE }, (_, pitchClass) => {
    const angle = pitchClassAngle(pitchClass)
    const x = Math.cos(angle)
    const y = Math.sin(angle)
    return {
      pitchClass,
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

export function markerLayout(): Marker[] {
  return Array.from({ length: OCTAVE_SIZE }, (_, pitchClass) => {
    const angle = pitchClassAngle(pitchClass)
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
export function nearestPitchClass(point: Point): number {
  return Math.round((pointAngle(point) / (2 * Math.PI)) * OCTAVE_SIZE) % OCTAVE_SIZE
}

/** The bead under a point, or null if the point is off the ring of beads. */
export function pitchClassAt(point: Point): number | null {
  const radius = Math.hypot(point.x, point.y)
  if (radius < CIRCLE_RADIUS - BEAD_RADIUS || radius > CIRCLE_RADIUS + BEAD_RADIUS) {
    return null
  }
  return nearestPitchClass(point)
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
