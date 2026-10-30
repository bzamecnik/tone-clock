import { EMPTY, type PitchClassSet } from './pitchClassSet.ts'
import { parseTones } from './parseTones.ts'

/** "No chord" in lead sheets: an empty step. */
const NO_CHORD = /^N\.?C\.?$/i

function parseStep(text: string, key: number | null): PitchClassSet | null {
  return NO_CHORD.test(text) ? EMPTY : parseTones(text, key)
}

/**
 * Parses a chord sequence of at least two steps:
 * - steps separated by bar lines: "C | Am | F | G", "C E G | D dorian",
 *   each parsed as by `parseTones` ("N.C." = no chord, an empty step),
 * - chords separated by spaces: "C Am F G", unless the whole text is one
 *   set of tones ("C F G" is a list of notes).
 * Returns null if the text is not such a sequence.
 */
export function parseSequence(text: string, key: number | null = null): PitchClassSet[] | null {
  const bars = text.includes('|')
    ? text.split('|').map((bar) => bar.trim()).filter((bar) => bar !== '')
    : parseTones(text, key) === null
      ? text.trim().split(/\s+/)
      : []
  if (bars.length < 2) {
    return null
  }
  const steps = bars.map((bar) => parseStep(bar, key))
  return steps.every((step) => step !== null) ? steps : null
}
