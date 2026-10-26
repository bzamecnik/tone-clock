import { CHORD_TEMPLATES, SCALE_TEMPLATES } from './chordNames.ts'
import {
  OCTAVE_SIZE,
  fromPitchClasses,
  mod,
  transpose,
  type PitchClassSet,
} from './pitchClassSet.ts'

/** Semitones of the major scale degrees 1..7 above the tonic. */
const MAJOR_DEGREES = [0, 2, 4, 5, 7, 9, 11]
/** Extended degrees (9, 11, 13) are the 2nd, 4th and 6th an octave up. */
const EXTENDED_DEGREES: Record<number, number> = { 9: 2, 11: 5, 13: 9 }
const NOTE_LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

const ACCIDENTALS = '[b#♭♯]*'
const NOTE = new RegExp(`^([A-Ga-g])(${ACCIDENTALS})$`)
const NOTE_ROOT = new RegExp(`^([A-Ga-g])(${ACCIDENTALS})(.*)$`, 's')
// longer numerals first so that e.g. "VII" is not read as "V" + "II"
const ROMAN_ROOT = new RegExp(`^(${ACCIDENTALS})(VII|VI|IV|V|III|II|I)(.*)$`, 's')
const DEGREE = new RegExp(`^(${ACCIDENTALS})(\\d+)$`)

/** Chord qualities beyond the namer's templates, as intervals above the root. */
const CHORD_ALIASES: Record<string, number[]> = {
  M: [0, 4, 7],
  maj: [0, 4, 7],
  major: [0, 4, 7],
  min: [0, 3, 7],
  minor: [0, 3, 7],
  '-': [0, 3, 7],
  '5': [0, 7],
  maj7: [0, 4, 7, 11],
  Maj7: [0, 4, 7, 11],
  Δ: [0, 4, 7, 11],
  Δ7: [0, 4, 7, 11],
  '-7': [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11],
  mmaj7: [0, 3, 7, 11],
  'm(maj7)': [0, 3, 7, 11],
  ø: [0, 3, 6, 10],
  ø7: [0, 3, 6, 10],
  'm7-5': [0, 3, 6, 10],
  '°': [0, 3, 6],
  o: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  '°7': [0, 3, 6, 9],
  o7: [0, 3, 6, 9],
  '+': [0, 4, 8],
  '#5': [0, 4, 8],
  '7#5': [0, 4, 8, 10],
  '+7': [0, 4, 8, 10],
  sus2: [0, 2, 7],
  sus: [0, 5, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  '7sus': [0, 5, 7, 10],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '6/9': [0, 2, 4, 7, 9],
  '69': [0, 2, 4, 7, 9],
  add9: [0, 2, 4, 7],
  add2: [0, 2, 4, 7],
  madd9: [0, 2, 3, 7],
  maj9: [0, 2, 4, 7, 11],
  M9: [0, 2, 4, 7, 11],
}

/** Scales beyond the namer's templates (lowercase names). */
const SCALE_ALIASES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'major scale': [0, 2, 4, 5, 7, 9, 11],
  diatonic: [0, 2, 4, 5, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  'natural minor': [0, 2, 3, 5, 7, 8, 10],
  'minor scale': [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  'whole tone': [0, 2, 4, 6, 8, 10],
  octatonic: [0, 1, 3, 4, 6, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

/** Chord qualities (suffix after the root) -> set rooted at C. */
const CHORDS = new Map<string, PitchClassSet>([
  ...Object.entries(CHORD_TEMPLATES).map(
    ([index, { name, root }]) => [name.replace('X', ''), transpose(Number(index), -root)] as const,
  ),
  ...Object.entries(CHORD_ALIASES).map(([suffix, intervals]) => [suffix, fromPitchClasses(intervals)] as const),
])

/**
 * Lowercase chord qualities -> set, for case-insensitive lookup. Qualities
 * whose spellings differ in meaning by case (e.g. "m7" vs. "M7") map to null.
 */
const CHORDS_LOWERCASE = new Map<string, PitchClassSet | null>()
for (const [suffix, chord] of CHORDS) {
  const key = suffix.toLowerCase()
  const existing = CHORDS_LOWERCASE.get(key)
  CHORDS_LOWERCASE.set(key, existing === undefined || existing === chord ? chord : null)
}

function lookupChord(suffix: string): PitchClassSet | undefined {
  return CHORDS.get(suffix) ?? CHORDS_LOWERCASE.get(suffix.toLowerCase()) ?? undefined
}

/** Scale names (lowercase, after the root) -> set rooted at C. */
const SCALES = new Map<string, PitchClassSet>([
  ...Object.entries(SCALE_TEMPLATES)
    .filter(([, { name }]) => name.startsWith('X '))
    .map(([index, { name, root }]) => [name.slice(2).toLowerCase(), transpose(Number(index), -root)] as const),
  ...Object.entries(SCALE_ALIASES).map(([name, intervals]) => [name, fromPitchClasses(intervals)] as const),
])

function accidentalOffset(accidentals: string): number {
  let offset = 0
  for (const accidental of accidentals) {
    offset += accidental === '#' || accidental === '♯' ? 1 : -1
  }
  return offset
}

function noteToPitchClass(letter: string, accidentals: string): number {
  return mod(NOTE_LETTERS[letter.toUpperCase()] + accidentalOffset(accidentals), OCTAVE_SIZE)
}

/**
 * The quality after a root, as a set rooted at C. Text separated from the
 * root by whitespace is preferably a scale ("C major" = the scale), otherwise
 * a chord ("Cmajor" = the triad).
 */
function parseQuality(rest: string): PitchClassSet | undefined {
  const chord = lookupChord(rest.trim())
  if (/^\s/.test(rest)) {
    return SCALES.get(rest.trim().toLowerCase().replace(/\s+/g, ' ')) ?? chord
  }
  return chord
}

function parseNoteRooted(text: string): PitchClassSet | null {
  const match = NOTE_ROOT.exec(text)
  if (!match) {
    return null
  }
  const [, letter, accidentals, tail] = match
  // "Cb5" may be C(b5)-like or Cb + 5: try the longest accidental first
  for (let n = accidentals.length; n >= 0; n--) {
    const quality = parseQuality(accidentals.slice(n) + tail)
    if (quality !== undefined) {
      return transpose(quality, noteToPitchClass(letter, accidentals.slice(0, n)))
    }
  }
  return null
}

function parseRomanRooted(text: string, key: number): PitchClassSet | null {
  const match = ROMAN_ROOT.exec(text)
  if (!match) {
    return null
  }
  const [, accidentals, numeral, tail] = match
  const quality = parseQuality(tail)
  if (quality === undefined) {
    return null
  }
  const degree = MAJOR_DEGREES[ROMAN_NUMERALS.indexOf(numeral)]
  return transpose(quality, key + degree + accidentalOffset(accidentals))
}

function parseDegreeList(tokens: string[], key: number): PitchClassSet | null {
  const pitchClasses: number[] = []
  for (const token of tokens) {
    const match = DEGREE.exec(token)
    const degree = match ? Number(match[2]) : NaN
    const semitones = degree >= 1 && degree <= 7 ? MAJOR_DEGREES[degree - 1] : EXTENDED_DEGREES[degree]
    if (!match || semitones === undefined) {
      return null
    }
    pitchClasses.push(mod(key + semitones + accidentalOffset(match[1]), OCTAVE_SIZE))
  }
  return fromPitchClasses(pitchClasses)
}

/** Pitch class of a single note name ("C", "Bb", "f#"), or null. */
export function parseNote(text: string): number | null {
  const match = NOTE.exec(text)
  return match ? noteToPitchClass(match[1], match[2]) : null
}

function parseNoteList(tokens: string[]): PitchClassSet | null {
  const pitchClasses: number[] = []
  for (const token of tokens) {
    const match = NOTE.exec(token)
    if (!match) {
      return null
    }
    pitchClasses.push(noteToPitchClass(match[1], match[2]))
  }
  return fromPitchClasses(pitchClasses)
}

/**
 * Parses a textual description of a pitch class set:
 * - a chord name: "Am7", "F#dim", "Bbmaj7", "Csus4",
 * - a scale: "D dorian", "C harmonic minor", "A minor pentatonic",
 * - a list of notes: "C E G", "D, F#, A",
 * - in a key (tonic pitch class): Roman numeral chords ("V7", "bVII") and
 *   lists of scale degrees ("1 b3 5"),
 * - empty text: the empty set.
 * Chord qualities are case-insensitive unless the case matters ("m7" vs.
 * "M7"); Roman numerals are uppercase only.
 * Returns null if the text is not understood.
 */
export function parseTones(text: string, key: number | null = null): PitchClassSet | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  const tokens = trimmed.split(/[\s,]+/)
  return (
    (key !== null ? parseDegreeList(tokens, key) : null) ??
    (tokens.length >= 2 ? parseNoteList(tokens) : null) ??
    parseNoteRooted(trimmed) ??
    (key !== null ? parseRomanRooted(trimmed, key) : null)
  )
}
