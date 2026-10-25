import { describe, expect, it } from 'vitest'
import { CHORD_TEMPLATES, SCALE_TEMPLATES } from './chordNames.ts'
import { SHARP_NAMES } from './pitchClassNames.ts'
import { EMPTY, canonic, fromPitchClasses, transpose } from './pitchClassSet.ts'
import { chordRoot, nameSet, suggestTonic } from './pitchClassSetNamer.ts'

const chord = (pitchClasses: number[]) => nameSet(fromPitchClasses(pitchClasses)).chord
const scale = (pitchClasses: number[]) => nameSet(fromPitchClasses(pitchClasses)).scale

describe('name templates', () => {
  it('are keyed by canonic sets', () => {
    for (const index of [...Object.keys(CHORD_TEMPLATES), ...Object.keys(SCALE_TEMPLATES)]) {
      expect(canonic(Number(index))).toBe(Number(index))
    }
  })
})

describe('nameSet', () => {
  it('names triads', () => {
    expect(chord([0, 4, 7])).toBe('C')
    expect(chord([0, 3, 7])).toBe('Cm')
    expect(chord([0, 3, 6])).toBe('Cmb5')
    expect(chord([0, 4, 6])).toBe('C(b5)')
    expect(chord([0, 4, 8])).toBe('Caug')
    expect(chord([0, 2, 7])).toBe('C2')
  })

  it('names seventh chords', () => {
    expect(chord([0, 4, 7, 10])).toBe('C7')
    expect(chord([0, 3, 7, 10])).toBe('Cm7')
    expect(chord([0, 4, 7, 11])).toBe('CM7')
    expect(chord([0, 3, 7, 11])).toBe('CmM7')
    expect(chord([0, 3, 6, 10])).toBe('Cm7b5')
    expect(chord([0, 3, 6, 9])).toBe('Cdim')
    expect(chord([0, 4, 10])).toBe('C7-5')
    // symmetric by a tritone: C7b5 = Gb7b5
    expect(chord([0, 4, 6, 10])).toMatch(/^(C|Gb)7b5$/)
  })

  it('names extended chords', () => {
    expect(chord([0, 2, 4, 7, 10])).toBe('C9')
    expect(chord([0, 2, 3, 7, 10])).toBe('Cm9')
    expect(chord([0, 1, 4, 7, 10])).toBe('C7b9')
    expect(chord([0, 1, 3, 7, 10])).toBe('Cm7b9')
    expect(chord([0, 3, 4, 7, 10])).toBe('C7#9')
    expect(chord([0, 2, 4, 5, 7, 10])).toBe('C11')
    expect(chord([0, 2, 3, 5, 7, 10])).toBe('Cm11')
    expect(chord([0, 2, 4, 5, 7, 9, 10])).toBe('C13')
    expect(chord([0, 2, 4, 7, 9])).toBe('C6,9')
    expect(chord([0, 2, 5, 7])).toBe('C2,4')
  })

  it('names incomplete chords (dyads)', () => {
    expect(chord([0, 4])).toBe('C-5')
    expect(chord([0, 7])).toBe('C-3')
  })

  it('names scales', () => {
    expect(scale([0, 2, 4, 5, 7, 9, 11])).toBe('C diatonic (major)')
    expect(scale([0, 2, 3, 5, 7, 9, 11])).toBe('C melodic minor')
    expect(scale([0, 2, 3, 5, 7, 8, 11])).toBe('C harmonic minor')
    expect(scale([0, 2, 4, 5, 7, 8, 11])).toBe('C harmonic major')
    expect(scale([0, 1, 4, 5, 7, 8, 11])).toBe('C double harmonic major')
    expect(scale([0, 2, 4, 5, 6, 8, 10])).toBe('C major locrian')
    expect(scale([0, 2, 4, 6, 8, 10])).toBe('C symmetric hexatonic')
    expect(scale([0, 1, 3, 4, 6, 7, 9, 10])).toBe('C symmetric octatonic')
    expect(scale([0, 2, 4, 7, 9])).toBe('C major pentatonic')
    expect(scale([0, 3, 6, 9])).toBe('C symmetric 4-tone')
    expect(scale([0, 4, 8])).toBe('C symmetric 3-tone')
  })

  it('can name a set both as a chord and as a scale', () => {
    // the C major scale contains exactly the tones of G13
    expect(nameSet(fromPitchClasses([0, 2, 4, 5, 7, 9, 11]))).toEqual({
      chord: 'G13',
      scale: 'C diatonic (major)',
    })
  })

  it('names every transposition consistently', () => {
    expect(nameSet(transpose(fromPitchClasses([0, 3, 7, 10]), 9)).chord).toBe('Am7')
    expect(nameSet(transpose(fromPitchClasses([0, 2, 4, 5, 7, 9, 11]), 10)).scale).toBe(
      'Bb diatonic (major)',
    )
  })

  it('uses the given pitch class names', () => {
    expect(nameSet(fromPitchClasses([6, 10, 1]), SHARP_NAMES).chord).toBe('F#')
  })

  it('returns empty names for unknown sets', () => {
    expect(nameSet(EMPTY)).toEqual({ chord: '', scale: '' })
    expect(nameSet(fromPitchClasses([0]))).toEqual({ chord: '', scale: '' })
    expect(nameSet(fromPitchClasses([0, 1, 2]))).toEqual({ chord: '', scale: '' })
  })
})

describe('suggestTonic', () => {
  it('is the root of a named scale', () => {
    expect(suggestTonic(fromPitchClasses([0, 2, 4, 5, 7, 9, 11]))).toBe(0)
  })

  it('is the root of a named chord otherwise', () => {
    expect(suggestTonic(fromPitchClasses([9, 0, 4, 7]))).toBe(9)
    expect(suggestTonic(fromPitchClasses([7, 11, 2, 5]))).toBe(7)
  })

  it('is the lowest tone of an unnamed set, or C for the empty set', () => {
    expect(suggestTonic(fromPitchClasses([2, 3, 4, 5]))).toBe(2)
    expect(suggestTonic(EMPTY)).toBe(0)
  })
})

describe('chordRoot', () => {
  it('is the root of the chord name', () => {
    expect(chordRoot(fromPitchClasses([0, 4, 7]))).toBe(0)
    expect(chordRoot(fromPitchClasses([9, 0, 4, 7]))).toBe(9)
    // C diatonic is named G13
    expect(chordRoot(fromPitchClasses([0, 2, 4, 5, 7, 9, 11]))).toBe(7)
  })

  it('is null for sets without a chord name', () => {
    expect(chordRoot(EMPTY)).toBeNull()
    expect(chordRoot(fromPitchClasses([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toBeNull()
  })
})
