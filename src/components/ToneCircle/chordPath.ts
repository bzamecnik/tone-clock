import { OCTAVE_SIZE, mod, toPitchClasses, type PitchClassSet } from '../../music/pitchClassSet.ts'
import { beadLayout, format, positionOf, type CircleOrder, type Point } from './geometry.ts'

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

/**
 * Quadratic Bézier between the beads at positions `from` and `to` whose control point is the midpoint of
 * the apexes pulled towards the center: tritones bend to the center,
 * semitones stay almost straight (as in the original ChordPath).
 */
function quadSegment(from: number, to: number): string {
  const stiffness = 1 - intervalClass(from, to) / 6
  const a = APEXES[from]
  const b = APEXES[to]
  const control = { x: (a.x + b.x) * 0.5 * stiffness, y: (a.y + b.y) * 0.5 * stiffness }
  return `Q ${formatPoint(control)} ${formatPoint(b)}`
}

/** Curved polygon connecting the active pitch classes clockwise around the circle. */
export function chordPath(tones: PitchClassSet, order: CircleOrder = 'semitones'): ChordPath | null {
  const positions = toPitchClasses(tones)
    .map((pc) => positionOf(pc, order))
    .sort((a, b) => a - b)
  if (positions.length < 2) {
    return null
  }
  const closed = positions.length >= 3
  const parts = [`M ${formatPoint(APEXES[positions[0]])}`]
  for (let i = 1; i < positions.length; i++) {
    parts.push(quadSegment(positions[i - 1], positions[i]))
  }
  if (closed) {
    parts.push(quadSegment(positions[positions.length - 1], positions[0]), 'Z')
  }
  return { d: parts.join(' '), closed }
}
