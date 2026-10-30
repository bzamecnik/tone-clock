import { parseNote } from './music/parseTones.ts'
import { OCTAVE_SIZE, fromPitchClasses, type PitchClassSet } from './music/pitchClassSet.ts'

/**
 * The tones and key in the URL fragment, so that a link shows the same
 * clock: `#tones=7,11,2,5&key=0` (G7 in C), or a chord sequence with its
 * steps separated by bar lines: `#seq=0,4,7|7,11,2,5&key=0`. Pitch classes
 * rather than names, which would depend on the spelling of accidentals.
 */
export interface UrlState {
  /** One step for plain tones, at least one. */
  steps: PitchClassSet[]
  /** Tonic pitch class, or null for no key. */
  key: number | null
}

/**
 * The fragment for the steps (each with pitch classes listed in this order)
 * and key. A single step is written as `tones`, left out when empty, like
 * the key; no tones and no key give no fragment at all.
 */
export function formatUrlState(steps: readonly (readonly number[])[], key: number | null): string {
  const tones = steps.length === 1 ? steps[0] : []
  const params = [
    steps.length > 1 && `seq=${steps.map((step) => step.join(',')).join('|')}`,
    tones.length > 0 && `tones=${tones.join(',')}`,
    key !== null && `key=${key}`,
  ].filter(Boolean)
  return params.length > 0 ? `#${params.join('&')}` : ''
}

/** A pitch class (0..11) or a note name ("Bb", "f#"), or null. */
function parseTone(text: string): number | null {
  if (/^\d+$/.test(text)) {
    const pitchClass = Number(text)
    return pitchClass < OCTAVE_SIZE ? pitchClass : null
  }
  return parseNote(text)
}

/** The tones of a step: pitch classes or note names separated by commas, or null. */
function parseStep(text: string): PitchClassSet | null {
  const pitchClasses = text ? text.split(',').map(parseTone) : []
  return pitchClasses.includes(null) ? null : fromPitchClasses(pitchClasses as number[])
}

/**
 * Reads a fragment written by formatUrlState (also with note names, as
 * written by older versions), or null if it is not one, e.g. empty.
 */
export function parseUrlState(hash: string): UrlState | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const sequence = params.get('seq')
  const tones = params.get('tones')
  const keyName = params.get('key')
  if (sequence === null && tones === null && keyName === null) {
    return null
  }
  const steps = (sequence === null ? [tones ?? ''] : sequence.split('|')).map(parseStep)
  const key = keyName === null ? null : parseTone(keyName)
  if (steps.includes(null) || (keyName !== null && key === null)) {
    return null
  }
  return { steps: steps as PitchClassSet[], key }
}
