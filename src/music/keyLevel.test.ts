import { describe, expect, it } from 'vitest'
import { DEGREE_NAMES } from './pitchClassNames.ts'
import { isDiatonic, keyLevel } from './keyLevel.ts'

/** Level of each degree name (1, b2, 2, ...) in a key, as a map. */
function levelsByDegree(tonic: number) {
  return Object.fromEntries(DEGREE_NAMES.map((name, interval) => [name, keyLevel(tonic + interval, tonic)]))
}

describe('keyLevel', () => {
  it('is +3 for degree 2, the center of the diatonic scale on the circle of fifths', () => {
    expect(keyLevel(2, 0)).toBe(3)
  })

  it('decreases symmetrically towards the opposite side of the circle of fifths', () => {
    expect(levelsByDegree(0)).toEqual({
      '2': 3,
      '5': 2,
      '6': 2,
      '1': 1,
      '3': 1,
      // the tritone splits the circle into the diatonic and the other half
      '4': 0,
      '7': 0,
      b5: -1,
      b7: -1,
      b2: -2,
      b3: -2,
      b6: -3,
    })
  })

  it('is relative to the tonic', () => {
    expect(levelsByDegree(9)).toEqual(levelsByDegree(0))
    // in A, B is degree 2
    expect(keyLevel(11, 9)).toBe(3)
  })
})

describe('isDiatonic', () => {
  it('is true for the 7 tones of the major scale of the key', () => {
    const diatonic = Array.from({ length: 12 }, (_, pc) => pc).filter((pc) => isDiatonic(pc, 7))
    expect(diatonic).toEqual([0, 2, 4, 6, 7, 9, 11])
  })
})
