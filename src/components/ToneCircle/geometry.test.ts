import { describe, expect, it } from 'vitest'
import {
  BEAD_RADIUS,
  CIRCLE_RADIUS,
  VIEW_RADIUS,
  beadLayout,
  clientToView,
  pitchClassAt,
  pointAngle,
} from './geometry.ts'

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

describe('pitchClassAt (hit testing)', () => {
  const beads = beadLayout()

  it('finds the bead at its center', () => {
    for (const bead of beads) {
      expect(pitchClassAt(bead.center)).toBe(bead.pitchClass)
    }
  })

  it('finds the nearest bead within the ring of beads', () => {
    // slightly clockwise from C, at the outer edge of the ring
    expect(pitchClassAt({ x: 10, y: -95 })).toBe(0)
    // between C and Db, closer to Db
    const angle = (-90 + 20) * (Math.PI / 180)
    expect(pitchClassAt({ x: 80 * Math.cos(angle), y: 80 * Math.sin(angle) })).toBe(1)
  })

  it('returns null inside or outside the ring', () => {
    expect(pitchClassAt({ x: 0, y: 0 })).toBeNull()
    expect(pitchClassAt({ x: 0, y: -50 })).toBeNull()
    expect(pitchClassAt({ x: 0, y: -100 })).toBeNull()
    expect(pitchClassAt({ x: 100, y: 100 })).toBeNull()
  })
})

describe('pointAngle', () => {
  it('is measured clockwise from the top in radians', () => {
    expect(pointAngle({ x: 0, y: -1 })).toBeCloseTo(0)
    expect(pointAngle({ x: 1, y: 0 })).toBeCloseTo(Math.PI / 2)
    expect(pointAngle({ x: 0, y: 1 })).toBeCloseTo(Math.PI)
    expect(pointAngle({ x: -1, y: 0 })).toBeCloseTo((3 * Math.PI) / 2)
  })
})

describe('clientToView', () => {
  it('maps client coordinates to view box coordinates', () => {
    const rect = { left: 10, top: 20, width: 400, height: 400 }
    expect(clientToView(rect, 210, 220)).toEqual({ x: 0, y: 0 })
    expect(clientToView(rect, 10, 20)).toEqual({ x: -100, y: -100 })
    expect(clientToView(rect, 410, 420)).toEqual({ x: 100, y: 100 })
  })

  it('keeps the view box centered in non-square elements', () => {
    const rect = { left: 0, top: 0, width: 400, height: 200 }
    expect(clientToView(rect, 200, 100)).toEqual({ x: 0, y: 0 })
    expect(clientToView(rect, 300, 100)).toEqual({ x: 100, y: 0 })
  })

  it('returns null for an element without size', () => {
    expect(clientToView({ left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull()
  })
})
