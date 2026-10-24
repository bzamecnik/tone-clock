import { OCTAVE_SIZE } from './pitchClassSet.ts'

/** Labels for the 12 pitch classes, indexed by pitch class (0 = C). */
export type PitchClassNames = readonly string[]

export const FLAT_NAMES: PitchClassNames = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
]

export const SHARP_NAMES: PitchClassNames = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

export function pitchClassName(pitchClass: number, names: PitchClassNames = FLAT_NAMES): string {
  if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass >= OCTAVE_SIZE) {
    throw new RangeError(`Pitch class out of range: ${pitchClass}`)
  }
  return names[pitchClass]
}
