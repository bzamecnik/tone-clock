import { OCTAVE_SIZE, mod, toPitchClasses, type PitchClassSet } from '../../music/pitchClassSet.ts'
import { beadLayout, type Point } from './geometry.ts'

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

/** Rounds to 3 decimals and avoids printing "-0". */
function format(n: number): string {
  return String(Math.round(n * 1000) / 1000 + 0)
}

function formatPoint(p: Point): string {
  return `${format(p.x)} ${format(p.y)}`
}

/**
 * Quadratic Bézier from `from` to `to` whose control point is the midpoint of
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

/** Curved polygon connecting the active pitch classes in ascending order. */
export function chordPath(tones: PitchClassSet): ChordPath | null {
  const pitchClasses = toPitchClasses(tones)
  if (pitchClasses.length < 2) {
    return null
  }
  const closed = pitchClasses.length >= 3
  const parts = [`M ${formatPoint(APEXES[pitchClasses[0]])}`]
  for (let i = 1; i < pitchClasses.length; i++) {
    parts.push(quadSegment(pitchClasses[i - 1], pitchClasses[i]))
  }
  if (closed) {
    parts.push(quadSegment(pitchClasses[pitchClasses.length - 1], pitchClasses[0]), 'Z')
  }
  return { d: parts.join(' '), closed }
}
