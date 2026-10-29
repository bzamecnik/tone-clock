import { describe, expect, it } from 'vitest'
import { EMPTY, fromPitchClasses } from './pitchClassSet.ts'
import { parseSequence } from './parseSequence.ts'

const C = fromPitchClasses([0, 4, 7])
const AM = fromPitchClasses([9, 0, 4])
const F = fromPitchClasses([5, 9, 0])
const G = fromPitchClasses([7, 11, 2])

describe('parseSequence', () => {
  it('parses chords separated by bar lines', () => {
    expect(parseSequence('C | Am | F | G')).toEqual([C, AM, F, G])
    expect(parseSequence('C|Am|F|G')).toEqual([C, AM, F, G])
  })

  it('ignores the bar lines at the ends and empty bars', () => {
    expect(parseSequence('| C | Am ||')).toEqual([C, AM])
  })

  it('parses any tones in a bar: notes, scales, Roman numerals in a key', () => {
    expect(parseSequence('C E G | D dorian')).toEqual([C, fromPitchClasses([2, 4, 5, 7, 9, 11, 0])])
    expect(parseSequence('I | VIm | IV | V', 0)).toEqual([C, AM, F, G])
  })

  it('parses N.C. (no chord) as an empty step', () => {
    expect(parseSequence('C | N.C. | G')).toEqual([C, EMPTY, G])
    expect(parseSequence('C | NC | G')).toEqual([C, EMPTY, G])
  })

  it('parses chords separated by spaces when they are not a list of notes', () => {
    expect(parseSequence('C Am F G')).toEqual([C, AM, F, G])
    expect(parseSequence('I VIm IV V', 0)).toEqual([C, AM, F, G])
    // a list of notes is one chord
    expect(parseSequence('C F G')).toBeNull()
  })

  it('rejects text with an unknown chord or a single chord', () => {
    expect(parseSequence('C | Xyz')).toBeNull()
    expect(parseSequence('C Xyz')).toBeNull()
    expect(parseSequence('Am7')).toBeNull()
    expect(parseSequence('')).toBeNull()
  })
})
