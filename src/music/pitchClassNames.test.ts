import { describe, expect, it } from 'vitest'
import { FLAT_NAMES, SHARP_NAMES, pitchClassName } from './pitchClassNames.ts'

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
})
