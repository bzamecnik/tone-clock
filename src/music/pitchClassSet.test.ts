import { describe, expect, it } from 'vitest'
import {
  EMPTY,
  add,
  cardinality,
  fromPitchClasses,
  has,
  remove,
  toPitchClasses,
  toggle,
  transpose,
} from './pitchClassSet.ts'

const C_MAJOR = fromPitchClasses([0, 4, 7])

describe('pitch class set', () => {
  it('encodes pitch classes as a 12-bit mask like the Java PitchClassSet', () => {
    expect(EMPTY).toBe(0)
    expect(fromPitchClasses([0])).toBe(1)
    expect(fromPitchClasses([11])).toBe(2048)
    // C major triad has index 145 in chord_names.json
    expect(C_MAJOR).toBe(145)
    expect(fromPitchClasses([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe(4095)
  })

  it('ignores duplicates', () => {
    expect(fromPitchClasses([4, 4, 0, 7, 0])).toBe(C_MAJOR)
  })

  it('lists pitch classes in ascending order', () => {
    expect(toPitchClasses(EMPTY)).toEqual([])
    expect(toPitchClasses(fromPitchClasses([7, 0, 4]))).toEqual([0, 4, 7])
  })

  it('tests membership', () => {
    expect(has(C_MAJOR, 4)).toBe(true)
    expect(has(C_MAJOR, 3)).toBe(false)
  })

  it('adds, removes and toggles pitch classes', () => {
    expect(add(C_MAJOR, 10)).toBe(fromPitchClasses([0, 4, 7, 10]))
    expect(add(C_MAJOR, 4)).toBe(C_MAJOR)
    expect(remove(C_MAJOR, 4)).toBe(fromPitchClasses([0, 7]))
    expect(remove(C_MAJOR, 5)).toBe(C_MAJOR)
    expect(toggle(C_MAJOR, 4)).toBe(fromPitchClasses([0, 7]))
    expect(toggle(C_MAJOR, 3)).toBe(fromPitchClasses([0, 3, 4, 7]))
  })

  it('counts pitch classes', () => {
    expect(cardinality(EMPTY)).toBe(0)
    expect(cardinality(C_MAJOR)).toBe(3)
    expect(cardinality(4095)).toBe(12)
  })

  it('rejects pitch classes out of range', () => {
    expect(() => fromPitchClasses([12])).toThrow(RangeError)
    expect(() => has(C_MAJOR, -1)).toThrow(RangeError)
    expect(() => toggle(C_MAJOR, 1.5)).toThrow(RangeError)
  })

  describe('transpose', () => {
    it('shifts every pitch class by the offset', () => {
      // C major -> D major
      expect(transpose(C_MAJOR, 2)).toBe(fromPitchClasses([2, 6, 9]))
    })

    it('wraps around the octave', () => {
      // C major -> A major {9, 1, 4}
      expect(transpose(C_MAJOR, 9)).toBe(fromPitchClasses([1, 4, 9]))
    })

    it('works with negative and large offsets (mod 12)', () => {
      expect(transpose(C_MAJOR, -3)).toBe(transpose(C_MAJOR, 9))
      expect(transpose(C_MAJOR, 14)).toBe(transpose(C_MAJOR, 2))
      expect(transpose(C_MAJOR, 12)).toBe(C_MAJOR)
    })

    it('preserves the empty and full sets', () => {
      expect(transpose(EMPTY, 5)).toBe(EMPTY)
      expect(transpose(4095, 5)).toBe(4095)
    })
  })
})
