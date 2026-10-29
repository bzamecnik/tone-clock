import { describe, expect, it } from 'vitest'
import { fromPitchClasses } from './music/pitchClassSet.ts'
import { formatUrlState, parseUrlState } from './urlState.ts'

const C = fromPitchClasses([0, 4, 7])
const AM = fromPitchClasses([9, 0, 4])
const G7 = fromPitchClasses([7, 11, 2, 5])

describe('formatUrlState', () => {
  it('lists the tones in the given order and the key as pitch classes (0 = C)', () => {
    expect(formatUrlState([[7, 11, 2, 5]], 0)).toBe('#tones=7,11,2,5&key=0')
    expect(formatUrlState([[1, 6]], 10)).toBe('#tones=1,6&key=10')
  })

  it('leaves out the key or tones when there are none', () => {
    expect(formatUrlState([[0, 4, 7]], null)).toBe('#tones=0,4,7')
    expect(formatUrlState([[]], 0)).toBe('#key=0')
    expect(formatUrlState([[]], null)).toBe('')
  })

  it('lists the steps of a sequence separated by bar lines', () => {
    expect(formatUrlState([[0, 4, 7], [9, 0, 4]], 0)).toBe('#seq=0,4,7|9,0,4&key=0')
    expect(formatUrlState([[0, 4, 7], [], [7, 11, 2]], null)).toBe('#seq=0,4,7||7,11,2')
  })
})

describe('parseUrlState', () => {
  it('reads back what formatUrlState writes', () => {
    expect(parseUrlState('#tones=7,11,2,5&key=0')).toEqual({ steps: [G7], key: 0 })
    expect(parseUrlState('#tones=0,4,7')).toEqual({ steps: [C], key: null })
    expect(parseUrlState('#key=11')).toEqual({ steps: [0], key: 11 })
    expect(parseUrlState('#tones=')).toEqual({ steps: [0], key: null })
    expect(parseUrlState('#seq=0,4,7|9,0,4&key=0')).toEqual({ steps: [C, AM], key: 0 })
    expect(parseUrlState('#seq=0,4,7||9,0,4')).toEqual({ steps: [C, 0, AM], key: null })
  })

  it('reads note names too, as written by older versions', () => {
    expect(parseUrlState('#tones=G,B,D,F&key=C')).toEqual({ steps: [G7], key: 0 })
    expect(parseUrlState('#tones=G,11,D,5&key=0')).toEqual({ steps: [G7], key: 0 })
    expect(parseUrlState('#seq=C,E,G|g,b,d,f')).toEqual({ steps: [C, G7], key: null })
  })

  it('accepts sharps, any case, any order, duplicates and an encoded bar line', () => {
    expect(parseUrlState('#key=e&tones=f%23,a,c%23,F#')).toEqual({
      steps: [fromPitchClasses([6, 9, 1])],
      key: 4,
    })
    expect(parseUrlState('#seq=0,4,7%7C9,0,4')).toEqual({ steps: [C, AM], key: null })
  })

  it('rejects fragments without tones and key or with unknown names', () => {
    expect(parseUrlState('')).toBeNull()
    expect(parseUrlState('#')).toBeNull()
    expect(parseUrlState('#foo=bar')).toBeNull()
    expect(parseUrlState('#tones=C,X')).toBeNull()
    expect(parseUrlState('#tones=C&key=Cm')).toBeNull()
    expect(parseUrlState('#tones=0,12')).toBeNull()
    expect(parseUrlState('#tones=0,-1')).toBeNull()
    expect(parseUrlState('#tones=0,1.5')).toBeNull()
    expect(parseUrlState('#key=')).toBeNull()
    expect(parseUrlState('#seq=0,4,7|X')).toBeNull()
  })
})
