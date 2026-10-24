import { OCTAVE_SIZE, mod } from './pitchClassSet.ts'

/** Labels for the 12 pitch classes, indexed by pitch class (0 = C). */
export type PitchClassNames = readonly string[]

export const FLAT_NAMES: PitchClassNames = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
]

export const SHARP_NAMES: PitchClassNames = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

/** Scale degrees relative to the tonic (index 0 = tonic). */
export const DEGREE_NAMES: PitchClassNames = [
  '1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7',
]

/** Roman numerals of chord roots relative to the tonic (index 0 = tonic). */
export const ROMAN_NAMES: PitchClassNames = [
  'I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII',
]

/**
 * Re-indexes tonic-relative names (degrees, Roman numerals) by absolute
 * pitch class for the given key, e.g. in A (9) pitch class 0 (C) is "b3".
 */
export function relativeNames(names: PitchClassNames, key: number): PitchClassNames {
  return Array.from({ length: OCTAVE_SIZE }, (_, pitchClass) => names[mod(pitchClass - key, OCTAVE_SIZE)])
}

export function pitchClassName(pitchClass: number, names: PitchClassNames = FLAT_NAMES): string {
  if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass >= OCTAVE_SIZE) {
    throw new RangeError(`Pitch class out of range: ${pitchClass}`)
  }
  return names[pitchClass]
}
