import { CHORD_TEMPLATES, SCALE_TEMPLATES, type NameTemplate } from './chordNames.ts'
import { FLAT_NAMES, type PitchClassNames } from './pitchClassNames.ts'
import { OCTAVE_SIZE, canonicWithRoot, mod, toPitchClasses, type PitchClassSet } from './pitchClassSet.ts'

export interface SetName {
  /** Chord name, e.g. "Am7", or "" if unknown. */
  chord: string
  /** Scale name, e.g. "C diatonic (major)", or "" if unknown. */
  scale: string
}

/** Names a pitch class set as a chord and/or a scale (as in PitchClassSetNamer). */
export function nameSet(set: PitchClassSet, names: PitchClassNames = FLAT_NAMES): SetName {
  const { canonic, root } = canonicWithRoot(set)
  const fill = (template: NameTemplate | undefined) =>
    template ? template.name.replace('X', names[mod(template.root + root, OCTAVE_SIZE)]) : ''
  return {
    chord: fill(CHORD_TEMPLATES[canonic]),
    scale: fill(SCALE_TEMPLATES[canonic]),
  }
}

/** Root pitch class of the chord name of a set, or null if it has none. */
export function chordRoot(set: PitchClassSet): number | null {
  const { canonic, root } = canonicWithRoot(set)
  const template = CHORD_TEMPLATES[canonic]
  return template ? mod(template.root + root, OCTAVE_SIZE) : null
}

/**
 * A sensible tonic for a set when no key is chosen yet: the root of its
 * scale name, else of its chord name, else its lowest tone (C if empty).
 */
export function suggestTonic(set: PitchClassSet): number {
  const { canonic, root } = canonicWithRoot(set)
  const template = SCALE_TEMPLATES[canonic] ?? CHORD_TEMPLATES[canonic]
  if (template) {
    return mod(template.root + root, OCTAVE_SIZE)
  }
  return toPitchClasses(set)[0] ?? 0
}
