import { describe, expect, it } from 'vitest'
import { fromPitchClasses } from './music/pitchClassSet.ts'
import { formatUrlState, parseUrlState } from './urlState.ts'

const G7 = fromPitchClasses([7, 11, 2, 5])

describe('formatUrlState', () => {
  it('lists the tones in the given order and the key by their flat names', () => {
    expect(formatUrlState([7, 11, 2, 5], 0)).toBe('#tones=G,B,D,F&key=C')
    expect(formatUrlState([1, 6], 10)).toBe('#tones=Db,Gb&key=Bb')
  })

  it('leaves out the key when there is none', () => {
    expect(formatUrlState([0, 4, 7], null)).toBe('#tones=C,E,G')
    expect(formatUrlState([], null)).toBe('#tones=')
  })
})

describe('parseUrlState', () => {
  it('reads back what formatUrlState writes', () => {
    expect(parseUrlState('#tones=G,B,D,F&key=C')).toEqual({ tones: G7, key: 0 })
    expect(parseUrlState('#tones=C,E,G')).toEqual({ tones: fromPitchClasses([0, 4, 7]), key: null })
    expect(parseUrlState('#tones=')).toEqual({ tones: 0, key: null })
  })

  it('accepts sharps, any case, any order and duplicates', () => {
    expect(parseUrlState('#key=e&tones=f%23,a,c%23,F#')).toEqual({
      tones: fromPitchClasses([6, 9, 1]),
      key: 4,
    })
  })

  it('rejects fragments without tones or with unknown names', () => {
    expect(parseUrlState('')).toBeNull()
    expect(parseUrlState('#')).toBeNull()
    expect(parseUrlState('#key=C')).toBeNull()
    expect(parseUrlState('#tones=C,X')).toBeNull()
    expect(parseUrlState('#tones=C&key=Cm')).toBeNull()
  })
})
