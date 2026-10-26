import { parseNote } from './music/parseTones.ts'
import { FLAT_NAMES } from './music/pitchClassNames.ts'
import { fromPitchClasses, type PitchClassSet } from './music/pitchClassSet.ts'

/**
 * The tones and key in the URL fragment, so that a link shows the same
 * clock: `#tones=G,B,D,F&key=C`. Names rather than numbers, to be readable.
 */
export interface UrlState {
  tones: PitchClassSet
  /** Tonic pitch class, or null for no key. */
  key: number | null
}

/** The fragment for the tones (pitch classes, listed in this order) and key. */
export function formatUrlState(tones: readonly number[], key: number | null): string {
  const names = tones.map((pc) => FLAT_NAMES[pc]).join(',')
  return key === null ? `#tones=${names}` : `#tones=${names}&key=${FLAT_NAMES[key]}`
}

/** Reads a fragment written by formatUrlState (also with sharps), or null if it is not one. */
export function parseUrlState(hash: string): UrlState | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const names = params.get('tones')
  if (names === null) {
    return null
  }
  const pitchClasses = names === '' ? [] : names.split(',').map(parseNote)
  const keyName = params.get('key')
  const key = keyName === null ? null : parseNote(keyName)
  if (pitchClasses.includes(null) || (keyName !== null && key === null)) {
    return null
  }
  return { tones: fromPitchClasses(pitchClasses as number[]), key }
}
