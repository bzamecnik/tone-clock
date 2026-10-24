import { describe, expect, it } from 'vitest'
import {
  DEGREE_NAMES,
  FLAT_NAMES,
  ROMAN_NAMES,
  SHARP_NAMES,
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
