import { describe, expect, it } from 'vitest'
import { BEAD_RADIUS, CIRCLE_RADIUS, VIEW_RADIUS, beadLayout } from './geometry.ts'

describe('bead layout', () => {
  const beads = beadLayout()

  it('uses the proportions of the original Android view', () => {
    expect(VIEW_RADIUS).toBe(100)
    expect(BEAD_RADIUS).toBeCloseTo(19)
    expect(CIRCLE_RADIUS).toBeCloseTo(80)
  })

  it('has one bead per pitch class', () => {
    expect(beads).toHaveLength(12)
    expect(beads.map((b) => b.pitchClass)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('places C at the top and goes clockwise (y axis points down)', () => {
    const at = (i: number) => beads[i].center
    expect(at(0).x).toBeCloseTo(0)
    expect(at(0).y).toBeCloseTo(-80)
    expect(at(3).x).toBeCloseTo(80)
    expect(at(3).y).toBeCloseTo(0)
    expect(at(6).x).toBeCloseTo(0)
    expect(at(6).y).toBeCloseTo(80)
    expect(at(9).x).toBeCloseTo(-80)
    expect(at(9).y).toBeCloseTo(0)
  })

  it('puts the apex (polygon vertex) at the inner edge of each bead', () => {
    for (const bead of beads) {
      expect(Math.hypot(bead.apex.x, bead.apex.y)).toBeCloseTo(80 - 19)
      // apex lies on the same ray as the center
      expect(bead.apex.x * bead.center.y - bead.apex.y * bead.center.x).toBeCloseTo(0)
    }
  })
})
