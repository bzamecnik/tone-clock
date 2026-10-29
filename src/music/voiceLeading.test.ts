import { describe, expect, it } from 'vitest'
import { EMPTY, cardinality, fromPitchClasses, toPitchClasses, transpose } from './pitchClassSet.ts'
import { totalMotion, voiceLeading, type Voice } from './voiceLeading.ts'

const C = fromPitchClasses([0, 4, 7])
const CM = fromPitchClasses([0, 3, 7])
const AM = fromPitchClasses([9, 0, 4])
const F = fromPitchClasses([5, 9, 0])
const G7 = fromPitchClasses([7, 11, 2, 5])
const CAUG = fromPitchClasses([0, 4, 8])

const voice = (from: number, motion: number): Voice => ({ from, to: (from + motion + 12) % 12, motion })

describe('voice leading', () => {
  it('holds all tones of the same chord', () => {
    expect(voiceLeading(C, C)).toEqual([voice(0, 0), voice(4, 0), voice(7, 0)])
  })

  it('keeps the common tones and moves the others by the smallest steps', () => {
    expect(voiceLeading(C, AM)).toEqual([voice(0, 0), voice(4, 0), voice(7, 2)])
    expect(voiceLeading(C, F)).toEqual([voice(0, 0), voice(4, 1), voice(7, 2)])
    expect(voiceLeading(C, CM)).toEqual([voice(0, 0), voice(4, -1), voice(7, 0)])
    expect(voiceLeading(C, CAUG)).toEqual([voice(0, 0), voice(4, 0), voice(7, 1)])
  })

  it('moves across C (B to C is a semitone up)', () => {
    const b = fromPitchClasses([11])
    expect(voiceLeading(b, fromPitchClasses([0]))).toEqual([voice(11, 1)])
    expect(voiceLeading(fromPitchClasses([0]), b)).toEqual([voice(0, -1)])
  })

  it('moves all voices of a transposed chord in parallel when that is the shortest', () => {
    expect(voiceLeading(C, transpose(C, 1))).toEqual([voice(0, 1), voice(4, 1), voice(7, 1)])
  })

  it('does not cross the voices', () => {
    // C E G -> Db F Ab: all up a semitone, not C -> Ab (crossing E and G)
    for (const target of [AM, F, G7, CM, transpose(C, 5), transpose(C, 6)]) {
      const voices = voiceLeading(C, target)
      const ends = voices.map((v) => v.from + v.motion)
      expect(ends).toEqual([...ends].sort((a, b) => a - b))
    }
  })

  it('merges voices into fewer tones', () => {
    // G7 -> C: B -> C, D -> C, F -> E, G holds (ties go downwards)
    expect(voiceLeading(G7, C)).toEqual([voice(2, -2), voice(5, -1), voice(7, 0), voice(11, 1)])
  })

  it('splits voices into more tones', () => {
    // C -> G7: C -> B, E -> D and E -> F, G holds
    expect(voiceLeading(C, G7)).toEqual([voice(0, -1), voice(4, -2), voice(4, 1), voice(7, 0)])
  })

  it('keeps the number of voices of chords of the same size', () => {
    // C Db F -> C E F: Db -> E, not Db merging into C and F splitting into E and F
    expect(voiceLeading(fromPitchClasses([0, 1, 5]), fromPitchClasses([0, 4, 5]))).toEqual([
      voice(0, 0),
      voice(1, 3),
      voice(5, 0),
    ])
  })

  it('splits a single tone into a chord', () => {
    expect(voiceLeading(fromPitchClasses([0]), C)).toEqual([voice(0, -5), voice(0, 0), voice(0, 4)])
  })

  it('breaks a tie of symmetric chords downwards', () => {
    // C E G# -> D F# A#: all up or all down a whole tone
    expect(voiceLeading(CAUG, transpose(CAUG, 2))).toEqual([voice(0, -2), voice(4, -2), voice(8, -2)])
  })

  it('breaks a tritone tie downwards', () => {
    expect(voiceLeading(fromPitchClasses([0]), fromPitchClasses([6]))).toEqual([voice(0, -6)])
  })

  it('has no voices from or to an empty step', () => {
    expect(voiceLeading(EMPTY, C)).toEqual([])
    expect(voiceLeading(C, EMPTY)).toEqual([])
    expect(voiceLeading(EMPTY, EMPTY)).toEqual([])
  })

  it('measures the total motion in semitones', () => {
    expect(totalMotion(voiceLeading(C, F))).toBe(3)
    expect(totalMotion(voiceLeading(G7, C))).toBe(4)
  })

  it('moves as little as the best matching of the tones (equal sizes)', () => {
    const distance = (x: number, y: number) => Math.min((x - y + 12) % 12, (y - x + 12) % 12)
    const permutations = (items: number[]): number[][] =>
      items.length <= 1
        ? [items]
        : items.flatMap((item, index) =>
            permutations(items.filter((_, other) => other !== index)).map((rest) => [item, ...rest]),
          )
    const triads = Array.from({ length: 4096 }, (_, set) => set).filter((set) => cardinality(set) === 3)
    for (const x of triads.filter((_, index) => index % 7 === 0)) {
      for (const y of triads) {
        const a = toPitchClasses(x)
        const best = Math.min(
          ...permutations(toPitchClasses(y)).map((b) => a.reduce((sum, pc, i) => sum + distance(pc, b[i]), 0)),
        )
        expect(totalMotion(voiceLeading(x, y))).toBe(best)
      }
    }
  })
})
