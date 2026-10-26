import { parseNote } from './music/parseTones.ts'
import { OCTAVE_SIZE, fromPitchClasses, type PitchClassSet } from './music/pitchClassSet.ts'

/**
 * The tones and key in the URL fragment, so that a link shows the same
 * clock: `#tones=7,11,2,5&key=0` (G7 in C). Pitch classes rather than
 * names, which would depend on the spelling of accidentals.
 */
export interface UrlState {
  tones: PitchClassSet
  /** Tonic pitch class, or null for no key. */
  key: number | null
}

/**
 * The fragment for the tones (pitch classes, listed in this order) and key,
 * each left out when empty; no tones and no key give no fragment at all.
 */
export function formatUrlState(tones: readonly number[], key: number | null): string {
  const params = [
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

/**
 * Reads a fragment written by formatUrlState (also with note names, as
 * written by older versions), or null if it is not one, e.g. empty.
 */
export function parseUrlState(hash: string): UrlState | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const names = params.get('tones')
  const keyName = params.get('key')
  if (names === null && keyName === null) {
    return null
  }
  const pitchClasses = names ? names.split(',').map(parseTone) : []
  const key = keyName === null ? null : parseTone(keyName)
  if (pitchClasses.includes(null) || (keyName !== null && key === null)) {
    return null
  }
  return { tones: fromPitchClasses(pitchClasses as number[]), key }
}
