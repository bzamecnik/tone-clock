import { OCTAVE_SIZE } from '../../music/pitchClassSet.ts'

/**
 * Geometry of the tone circle in SVG user units. The view box is a square
 * centered at the origin with "radius" VIEW_RADIUS; proportions follow the
 * original Android ToneCircleView.
 */
export const VIEW_RADIUS = 100
export const BEAD_RADIUS = 0.19 * VIEW_RADIUS
export const CIRCLE_RADIUS = 0.8 * VIEW_RADIUS
/** Radius of the bead apexes, the vertices of the chord polygon. */
export const APEX_RADIUS = CIRCLE_RADIUS - BEAD_RADIUS

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

/** Angle of a point in radians in [0, 2π), clockwise from the top. */
export function pointAngle({ x, y }: Point): number {
  const angle = Math.atan2(x, -y)
  return angle < 0 ? angle + 2 * Math.PI : angle
}

/** The bead under a point, or null if the point is off the ring of beads. */
export function pitchClassAt(point: Point): number | null {
  const radius = Math.hypot(point.x, point.y)
  if (radius < CIRCLE_RADIUS - BEAD_RADIUS || radius > CIRCLE_RADIUS + BEAD_RADIUS) {
    return null
  }
  return Math.round((pointAngle(point) / (2 * Math.PI)) * OCTAVE_SIZE) % OCTAVE_SIZE
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
