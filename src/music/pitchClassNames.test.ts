import { describe, expect, it } from 'vitest'
import {
  DEGREE_NAMES,
  FLAT_NAMES,
  KEY_NAMES,
  ROMAN_NAMES,
  SHARP_NAMES,
  keyNames,
  keyNoteNames,
  noteNames,
  pitchClassName,
  relativeNames,
} from './pitchClassNames.ts'

describe('pitch class names', () => {
  it('has 12 flat names starting from C', () => {
    expect(FLAT_NAMES).toEqual([
      'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
    ])
  })

  it('has 12 sharp names', () => {
    expect(SHARP_NAMES).toHaveLength(12)
    expect(SHARP_NAMES[6]).toBe('F#')
  })

  it('names a pitch class using flat names by default', () => {
    expect(pitchClassName(0)).toBe('C')
    expect(pitchClassName(10)).toBe('Bb')
    expect(pitchClassName(10, SHARP_NAMES)).toBe('A#')
  })

  it('rejects pitch classes out of range', () => {
    expect(() => pitchClassName(12)).toThrow(RangeError)
  })

  it('has scale degree and Roman numeral names relative to a tonic', () => {
    expect(DEGREE_NAMES).toEqual(['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'])
    expect(ROMAN_NAMES).toEqual([
      'I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII',
    ])
  })

  describe('relativeNames', () => {
    it('names pitch classes relative to a key', () => {
      // in A: A = 1, C = b3, E = 5
      const inA = relativeNames(DEGREE_NAMES, 9)
      expect(inA[9]).toBe('1')
      expect(inA[0]).toBe('b3')
      expect(inA[4]).toBe('5')
      expect(relativeNames(ROMAN_NAMES, 7)[5]).toBe('bVII')
    })

    it('is the identity in C', () => {
      expect(relativeNames(DEGREE_NAMES, 0)).toEqual(DEGREE_NAMES)
    })
  })
})

describe('keyNoteNames', () => {
  const names = (tonic: number) => keyNoteNames(tonic).join(' ')

  it('names each key by its usual major key signature', () => {
    expect(KEY_NAMES).toEqual(['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])
    for (let tonic = 0; tonic < 12; tonic++) {
      expect(keyNoteNames(tonic)[tonic]).toBe(KEY_NAMES[tonic])
    }
  })

  it('spells the diatonic tones by the key signature, each letter once', () => {
    const diatonic = (tonic: number) => [0, 2, 4, 5, 7, 9, 11].map((d) => keyNoteNames(tonic)[(tonic + d) % 12])
    expect(diatonic(2)).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
    expect(diatonic(3)).toEqual(['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'])
    // six sharps need E# rather than F
    expect(diatonic(6)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
  })

  it('spells the chromatic tones as #1, b3, #4, b6 and b7', () => {
    // C# Eb F# Ab Bb
    expect(names(0)).toBe('C C# D Eb E F F# G Ab A Bb B')
    // G# Bb C# Eb F
    expect(names(7)).toBe('C C# D Eb E F F# G G# A Bb B')
    // F# Ab B Db Eb
    expect(names(5)).toBe('C Db D Eb E F F# G Ab A Bb B')
  })

  it('keeps chromatic white keys natural instead of E#, B#, Cb, Fb or doubles', () => {
    // E: #1 = F, not E#
    expect(names(4)).toBe('C C# D D# E F F# G G# A A# B')
    // F#: #1 = G, b3 = A, #4 = C, b6 = D, b7 = E (E# is diatonic)
    expect(names(6)).toBe('C C# D D# E E# F# G G# A A# B')
    // Ab: b3 = B, b6 = E, not Cb and Fb
    expect(names(8)).toBe('C Db D Eb E F Gb G Ab A Bb B')
    // Db: b6 = A, not Bbb
    expect(names(1)).toBe('C Db D Eb E F Gb G Ab A Bb B')
  })

  it('uses at most one accidental, and no B#, Cb or Fb in any key', () => {
    for (let tonic = 0; tonic < 12; tonic++) {
      for (const name of keyNoteNames(tonic)) {
        expect(name, KEY_NAMES[tonic]).toMatch(/^[A-G][b#]?$/)
        expect(['B#', 'Cb', 'Fb'], KEY_NAMES[tonic]).not.toContain(name)
      }
    }
  })
})

describe('noteNames', () => {
  it('spells by the key, in C without a key, or always with flats or sharps', () => {
    expect(noteNames('key', 2)).toEqual(keyNoteNames(2))
    expect(noteNames('key', null)).toEqual(keyNoteNames(0))
    expect(noteNames('flats', 2)).toEqual(FLAT_NAMES)
    expect(noteNames('sharps', 3)).toEqual(SHARP_NAMES)
  })

  it('names the keys themselves likewise', () => {
    expect(keyNames('key')).toEqual(KEY_NAMES)
    expect(keyNames('flats')).toEqual(FLAT_NAMES)
    expect(keyNames('sharps')).toEqual(SHARP_NAMES)
  })
})
