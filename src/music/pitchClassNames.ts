import { isDiatonic } from './keyLevel.ts'
import { OCTAVE_SIZE, mod } from './pitchClassSet.ts'

/** Labels for the 12 pitch classes, indexed by pitch class (0 = C). */
export type PitchClassNames = readonly string[]

export const FLAT_NAMES: PitchClassNames = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
]

export const SHARP_NAMES: PitchClassNames = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

/**
 * Names of the major keys by their usual key signature: flats up to Db (5
 * flats rather than C# with 7 sharps), sharps up to B, and F# (6 sharps)
 * rather than Gb (6 flats).
 */
export const KEY_NAMES: PitchClassNames = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
]

const LETTERS = 'CDEFGAB'
const NATURALS = [0, 2, 4, 5, 7, 9, 11]
/**
 * Letter steps above the tonic for each number of semitones above it: the
 * diatonic degrees and the chromatic ones as #1, b3, #4, b6, b7.
 */
const LETTER_STEPS = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6]

/** Name of a pitch class written with the given letter (index in LETTERS), e.g. "E#". */
function spell(letter: number, pitchClass: number): string {
  // -6..5 semitones from the natural letter
  const offset = mod(pitchClass - NATURALS[letter] + 6, OCTAVE_SIZE) - 6
  return LETTERS[letter] + (offset > 0 ? '#' : 'b').repeat(Math.abs(offset))
}

/**
 * Note names spelled in a major key (see docs/music-theory.md): the
 * diatonic tones by the key signature (E# in F#), the chromatic ones as
 * #1, b3, #4, b6 and b7 (in C: C# Eb F# Ab Bb), but natural on white keys
 * (F in E, not E#).
 */
export function keyNoteNames(tonic: number): PitchClassNames {
  const tonicLetter = LETTERS.indexOf(KEY_NAMES[tonic][0])
  return Array.from({ length: OCTAVE_SIZE }, (_, pitchClass) => {
    if (!isDiatonic(pitchClass, tonic) && NATURALS.includes(pitchClass)) {
      return LETTERS[NATURALS.indexOf(pitchClass)]
    }
    const letter = (tonicLetter + LETTER_STEPS[mod(pitchClass - tonic, OCTAVE_SIZE)]) % LETTERS.length
    return spell(letter, pitchClass)
  })
}

/** How to spell the black keys: by the key (C without a key), always flats or always sharps. */
export type Accidentals = 'key' | 'flats' | 'sharps'

/** Note names for the accidentals setting and the key (tonic, or null). */
export function noteNames(accidentals: Accidentals, key: number | null): PitchClassNames {
  if (accidentals === 'flats') {
    return FLAT_NAMES
  }
  return accidentals === 'sharps' ? SHARP_NAMES : keyNoteNames(key ?? 0)
}

/** Names of the keys themselves for the accidentals setting. */
export function keyNames(accidentals: Accidentals): PitchClassNames {
  return accidentals === 'flats' ? FLAT_NAMES : accidentals === 'sharps' ? SHARP_NAMES : KEY_NAMES
}

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
