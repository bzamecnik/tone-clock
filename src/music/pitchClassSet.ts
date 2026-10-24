/**
 * A set of pitch classes in 12-tone equal temperament.
 *
 * Represented as an immutable 12-bit integer mask: bit `i` is set iff pitch
 * class `i` (0 = C, 1 = Db, ..., 11 = B) is in the set. This matches the
 * `index` of the original Java `PitchClassSet`, e.g. C major triad = 145.
 */
export type PitchClassSet = number

export const OCTAVE_SIZE = 12

const FULL_MASK = (1 << OCTAVE_SIZE) - 1

export const EMPTY: PitchClassSet = 0

export function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

function assertPitchClass(pitchClass: number): void {
  if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass >= OCTAVE_SIZE) {
    throw new RangeError(`Pitch class out of range: ${pitchClass}`)
  }
}

function bit(pitchClass: number): number {
  assertPitchClass(pitchClass)
  return 1 << pitchClass
}

export function fromPitchClasses(pitchClasses: Iterable<number>): PitchClassSet {
  let set = EMPTY
  for (const pitchClass of pitchClasses) {
    set |= bit(pitchClass)
  }
  return set
}

/** Pitch classes in ascending order. */
export function toPitchClasses(set: PitchClassSet): number[] {
  const pitchClasses: number[] = []
  for (let pitchClass = 0; pitchClass < OCTAVE_SIZE; pitchClass++) {
    if (set & (1 << pitchClass)) {
      pitchClasses.push(pitchClass)
    }
  }
  return pitchClasses
}

export function has(set: PitchClassSet, pitchClass: number): boolean {
  return (set & bit(pitchClass)) !== 0
}

export function add(set: PitchClassSet, pitchClass: number): PitchClassSet {
  return set | bit(pitchClass)
}

export function remove(set: PitchClassSet, pitchClass: number): PitchClassSet {
  return set & ~bit(pitchClass)
}

export function toggle(set: PitchClassSet, pitchClass: number): PitchClassSet {
  return set ^ bit(pitchClass)
}

export function cardinality(set: PitchClassSet): number {
  let count = 0
  for (let rest = set; rest; rest &= rest - 1) {
    count++
  }
  return count
}

/** Transposes the set up by `offset` semitones (a rotation of the 12 bits). */
export function transpose(set: PitchClassSet, offset: number): PitchClassSet {
  const o = mod(offset, OCTAVE_SIZE)
  return ((set << o) | (set >> (OCTAVE_SIZE - o))) & FULL_MASK
}

/**
 * Canonic form: of all transpositions of the set, the one with the smallest
 * index. All sets equal up to transposition (e.g. all major triads) share it.
 */
export function canonic(set: PitchClassSet): PitchClassSet {
  return canonicWithRoot(set).canonic
}

/**
 * Root: the pitch class `r` such that `transpose(canonic(set), r) === set`.
 * For symmetric sets (e.g. augmented triads) the lowest such `r` is used.
 */
export function root(set: PitchClassSet): number {
  return canonicWithRoot(set).root
}

export function canonicWithRoot(set: PitchClassSet): { canonic: PitchClassSet; root: number } {
  let best = { canonic: set, root: 0 }
  for (let r = 1; r < OCTAVE_SIZE; r++) {
    const candidate = transpose(set, -r)
    if (candidate < best.canonic) {
      best = { canonic: candidate, root: r }
    }
  }
  return best
}
