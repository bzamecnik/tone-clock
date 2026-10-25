import { describe, expect, it } from 'vitest'
import { EMPTY, fromPitchClasses } from '../../music/pitchClassSet.ts'
import { chordPath, intervalClass } from './chordPath.ts'

describe('intervalClass', () => {
  it('is the shorter distance around the circle (0..6)', () => {
    expect(intervalClass(0, 0)).toBe(0)
    expect(intervalClass(0, 1)).toBe(1)
    expect(intervalClass(1, 0)).toBe(1)
    expect(intervalClass(0, 7)).toBe(5)
    expect(intervalClass(0, 6)).toBe(6)
    expect(intervalClass(11, 2)).toBe(3)
  })
})

describe('chordPath', () => {
  it('is empty for fewer than two tones', () => {
    expect(chordPath(EMPTY)).toBeNull()
    expect(chordPath(fromPitchClasses([3]))).toBeNull()
  })

  it('draws an open curve for two tones', () => {
    // a tritone bends all the way to the center
    expect(chordPath(fromPitchClasses([0, 6]))).toEqual({
      d: 'M 0 -61 Q 0 0 0 61',
      closed: false,
    })
  })

  it('bends edges less for smaller intervals', () => {
    // C-Eb (minor third, ic 3): control point = midpoint * (1 - 3/6)
    // apex C = (0, -61), apex Eb = (61, 0) -> midpoint (30.5, -30.5)
    expect(chordPath(fromPitchClasses([0, 3]))?.d).toBe('M 0 -61 Q 15.25 -15.25 61 0')
  })

  it('connects the tones in the order of their positions on the circle of fifths', () => {
    // C major (C E G) on the circle of fifths is drawn like C Db E (positions 0, 1, 4)
    expect(chordPath(fromPitchClasses([0, 4, 7]), 'fifths')).toEqual(chordPath(fromPitchClasses([0, 1, 4])))
  })

  it('draws a closed curved polygon for three or more tones', () => {
    const path = chordPath(fromPitchClasses([0, 4, 8]))
    expect(path?.closed).toBe(true)
    const segments = path!.d.match(/Q [^QZ]+/g)!
    expect(path!.d.startsWith('M 0 -61 ')).toBe(true)
    expect(segments).toHaveLength(3)
    // the last segment returns to C
    expect(segments[2].trim().endsWith('0 -61')).toBe(true)
    expect(path!.d.endsWith('Z')).toBe(true)
  })
})
