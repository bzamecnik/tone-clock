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
