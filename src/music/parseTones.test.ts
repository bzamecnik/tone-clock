import { describe, expect, it } from 'vitest'
import { CHORD_TEMPLATES, SCALE_TEMPLATES } from './chordNames.ts'
import { ROMAN_NAMES, relativeNames } from './pitchClassNames.ts'
import { fromPitchClasses, transpose } from './pitchClassSet.ts'
import { nameSet } from './pitchClassSetNamer.ts'
import { parseTones } from './parseTones.ts'

const set = fromPitchClasses

describe('parseTones', () => {
  describe('chord names', () => {
    it('parses root notes with accidentals', () => {
      expect(parseTones('C')).toBe(set([0, 4, 7]))
      expect(parseTones('Eb')).toBe(set([3, 7, 10]))
      expect(parseTones('F#')).toBe(set([6, 10, 1]))
      expect(parseTones('C♯')).toBe(set([1, 5, 8]))
      expect(parseTones('Bbb')).toBe(set([9, 1, 4]))
    })

    it('parses chord qualities used by the namer', () => {
      expect(parseTones('Am7')).toBe(set([9, 0, 4, 7]))
      expect(parseTones('Ebm')).toBe(set([3, 6, 10]))
      expect(parseTones('GM7')).toBe(set([7, 11, 2, 6]))
      expect(parseTones('Bm7b5')).toBe(set([11, 2, 5, 9]))
      expect(parseTones('C7#9')).toBe(set([0, 4, 7, 10, 3]))
      expect(parseTones('C6,9')).toBe(set([0, 2, 4, 7, 9]))
      expect(parseTones('Cdim')).toBe(set([0, 3, 6, 9]))
    })

    it('parses common aliases', () => {
      expect(parseTones('Cmaj7')).toBe(set([0, 4, 7, 11]))
      expect(parseTones('CΔ7')).toBe(set([0, 4, 7, 11]))
      expect(parseTones('Cmin')).toBe(set([0, 3, 7]))
      expect(parseTones('C-7')).toBe(set([0, 3, 7, 10]))
      expect(parseTones('Cø')).toBe(set([0, 3, 6, 10]))
      expect(parseTones('C°')).toBe(set([0, 3, 6]))
      expect(parseTones('C+')).toBe(set([0, 4, 8]))
      expect(parseTones('Csus4')).toBe(set([0, 5, 7]))
      expect(parseTones('C7sus4')).toBe(set([0, 5, 7, 10]))
      expect(parseTones('C6')).toBe(set([0, 4, 7, 9]))
      expect(parseTones('Cm6')).toBe(set([0, 3, 7, 9]))
      expect(parseTones('Cadd9')).toBe(set([0, 2, 4, 7]))
      expect(parseTones('C5')).toBe(set([0, 7]))
    })

    it('ignores surrounding whitespace and accepts lowercase roots', () => {
      expect(parseTones('  am7 ')).toBe(set([9, 0, 4, 7]))
      expect(parseTones('bb')).toBe(set([10, 2, 5]))
    })

    it('parses back every chord name produced by the namer', () => {
      for (const [index, template] of Object.entries(CHORD_TEMPLATES)) {
        for (let r = 0; r < 12; r++) {
          const tones = transpose(Number(index), r)
          const name = nameSet(tones).chord
          expect(parseTones(name), `${template.name} -> ${name}`).toBe(tones)
        }
      }
    })
  })

  describe('scales', () => {
    it('parses scale names', () => {
      expect(parseTones('C major')).toBe(set([0, 2, 4, 5, 7, 9, 11]))
      expect(parseTones('D dorian')).toBe(set([2, 4, 5, 7, 9, 11, 0]))
      expect(parseTones('A minor')).toBe(set([9, 11, 0, 2, 4, 5, 7]))
      expect(parseTones('E Phrygian')).toBe(set([4, 5, 7, 9, 11, 0, 2]))
      expect(parseTones('A minor pentatonic')).toBe(set([9, 0, 2, 4, 7]))
      expect(parseTones('C blues')).toBe(set([0, 3, 5, 6, 7, 10]))
      expect(parseTones('C whole tone')).toBe(set([0, 2, 4, 6, 8, 10]))
    })

    it('parses back every scale name produced by the namer', () => {
      for (const [index, template] of Object.entries(SCALE_TEMPLATES)) {
        if (!template.name.startsWith('X ')) {
          continue
        }
        for (let r = 0; r < 12; r++) {
          const tones = transpose(Number(index), r)
          const name = nameSet(tones).scale
          expect(parseTones(name), `${template.name} -> ${name}`).toBe(tones)
        }
      }
    })
  })

  describe('note lists', () => {
    it('parses notes separated by spaces or commas', () => {
      expect(parseTones('C E G')).toBe(set([0, 4, 7]))
      expect(parseTones('d, f#, a,c')).toBe(set([2, 6, 9, 0]))
    })
  })

  describe('in a key', () => {
    it('parses chords with Roman numeral roots', () => {
      expect(parseTones('V7', 0)).toBe(set([7, 11, 2, 5]))
      expect(parseTones('IIm7', 0)).toBe(set([2, 5, 9, 0]))
      expect(parseTones('bVII', 9)).toBe(set([7, 11, 2]))
      expect(parseTones('IV', 7)).toBe(set([0, 4, 7]))
    })

    it('parses back every Roman numeral name produced by the namer', () => {
      const key = 9
      for (const index of Object.keys(CHORD_TEMPLATES)) {
        for (let r = 0; r < 12; r++) {
          const tones = transpose(Number(index), r)
          const name = nameSet(tones, relativeNames(ROMAN_NAMES, key)).chord
          expect(parseTones(name, key), name).toBe(tones)
        }
      }
    })

    it('parses lists of scale degrees', () => {
      expect(parseTones('1 b3 5', 9)).toBe(set([9, 0, 4]))
      expect(parseTones('1 3 5 b7 9', 0)).toBe(set([0, 4, 7, 10, 2]))
      expect(parseTones('#4', 0)).toBe(set([6]))
    })

    it('still parses absolute chord names', () => {
      expect(parseTones('Bb', 0)).toBe(set([10, 2, 5]))
    })

    it('does not parse Roman numerals or degrees without a key', () => {
      expect(parseTones('V7')).toBeNull()
      expect(parseTones('1 3 5')).toBeNull()
    })
  })

  it('returns null for unknown input', () => {
    expect(parseTones('')).toBeNull()
    expect(parseTones('   ')).toBeNull()
    expect(parseTones('H')).toBeNull()
    expect(parseTones('Cxyz')).toBeNull()
    expect(parseTones('C foo scale')).toBeNull()
    expect(parseTones('C E X')).toBeNull()
  })
})
