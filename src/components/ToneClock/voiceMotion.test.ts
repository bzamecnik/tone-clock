import { describe, expect, it } from 'vitest'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
import { voiceLeading } from '../../music/voiceLeading.ts'
import { chordPath } from './chordPath.ts'
import { APEX_RADIUS, CIRCLE_RADIUS, beadLayout, circlePoint } from './geometry.ts'
import { easeInOut, transitionFrame, voicePoint } from './voiceMotion.ts'

const C = fromPitchClasses([0, 4, 7])
const AM = fromPitchClasses([9, 0, 4])
const G7 = fromPitchClasses([7, 11, 2, 5])

function expectClose(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x)
  expect(actual.y).toBeCloseTo(expected.y)
}

describe('circlePoint', () => {
  it('places fractional positions between the beads', () => {
    expectClose(circlePoint(0, 10), { x: 0, y: -10 })
    expectClose(circlePoint(3, 10), { x: 10, y: 0 })
    expectClose(circlePoint(1.5, 10), { x: 10 * Math.SQRT1_2, y: -10 * Math.SQRT1_2 })
  })
})

describe('easeInOut', () => {
  it('starts and ends slowly', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.1)).toBeLessThan(0.1)
    expect(easeInOut(0.9)).toBeGreaterThan(0.9)
  })
})

describe('voicePoint', () => {
  const voice = { from: 11, to: 1, motion: 2 }

  it('moves along the circle in the semitone order, across C', () => {
    expectClose(voicePoint(voice, 0, 'semitones', 10), circlePoint(11, 10))
    expectClose(voicePoint(voice, 0.5, 'semitones', 10), circlePoint(0, 10))
    expectClose(voicePoint(voice, 1, 'semitones', 10), circlePoint(1, 10))
  })

  it('skips straight across the circle in the order of fifths', () => {
    const start = beadLayout('fifths')[11].center
    const end = beadLayout('fifths')[1].center
    expectClose(voicePoint(voice, 0, 'fifths', CIRCLE_RADIUS), start)
    expectClose(voicePoint(voice, 0.5, 'fifths', CIRCLE_RADIUS), {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    })
    expectClose(voicePoint(voice, 1, 'fifths', CIRCLE_RADIUS), end)
  })
})

describe('transitionFrame', () => {
  it('holds the common tones and moves the other voices', () => {
    const frame = transitionFrame(voiceLeading(C, AM), 0.5, 'semitones')
    expect(frame.lit).toEqual([0, 4])
    expect(frame.moving).toHaveLength(1)
    expectClose(frame.moving[0].center, circlePoint(8, CIRCLE_RADIUS))
    expect(frame.moving[0].to).toBe(9)
  })

  it('lights the targets before the voices arrive, crossfading', () => {
    expect(transitionFrame(voiceLeading(C, AM), 0.9, 'semitones').lit).toEqual([0, 4, 9])
  })

  it('fades the moving voices in as they leave and out as they arrive', () => {
    const opacity = (t: number) => transitionFrame(voiceLeading(C, AM), t, 'semitones').opacity
    expect(opacity(0)).toBe(0)
    expect(opacity(0.1)).toBeCloseTo(0.5)
    expect(opacity(0.5)).toBe(1)
    expect(opacity(0.875)).toBeCloseTo(0.5)
    expect(opacity(1)).toBe(0)
  })

  it('morphs the chord path from one chord to the next', () => {
    for (const order of ['semitones', 'fifths'] as const) {
      expect(transitionFrame(voiceLeading(C, AM), 0, order).path).toEqual(chordPath(C, order))
      expect(transitionFrame(voiceLeading(C, AM), 1, order).path).toEqual(chordPath(AM, order))
    }
    const half = transitionFrame(voiceLeading(C, AM), 0.5, 'semitones').path
    expect(half?.d.startsWith(`M 0 ${-APEX_RADIUS}`)).toBe(true)
  })

  it('keeps a vertex per voice when voices merge', () => {
    // G7 -> C: four voices, two of them end on C
    const path = transitionFrame(voiceLeading(G7, C), 1, 'semitones').path
    expect(path?.d.match(/Q/g)).toHaveLength(4)
  })
})
