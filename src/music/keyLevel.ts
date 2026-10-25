import { OCTAVE_SIZE, mod } from './pitchClassSet.ts'

/** Position of degree 2, the center of the diatonic scale, on the circle of fifths. */
const DIATONIC_CENTER = 2
const MAX_LEVEL = 3

/**
 * How "inside" a key a pitch class is, from +3 to -3, based on the circle of
 * fifths (see docs/music-theory.md):
 *
 *   +3: 2  |  +2: 5 6  |  +1: 1 3  |  0: 4 7  |  -1: b5 b7  |  -2: b2 b3  |  -3: b6
 *
 * On the circle of fifths, the diatonic scale is a contiguous arc of 7 tones
 * (4 1 5 2 6 3 7) centered at degree 2. The level is 3 minus the distance
 * from that center around the circle. The tritone 4-7 (level 0) splits the
 * circle into the diatonic half (inner pentatonic, levels 1..3) and the
 * complementary pentatonic (levels -1..-3).
 */
export function keyLevel(pitchClass: number, tonic: number): number {
  // position on the circle of fifths relative to the tonic (7 * 7 = 1 mod 12)
  const position = mod((pitchClass - tonic) * 7, OCTAVE_SIZE)
  const distance = mod(position - DIATONIC_CENTER, OCTAVE_SIZE)
  return MAX_LEVEL - Math.min(distance, OCTAVE_SIZE - distance)
}

/** Whether a pitch class belongs to the (major) diatonic scale of a key. */
export function isDiatonic(pitchClass: number, tonic: number): boolean {
  return keyLevel(pitchClass, tonic) >= 0
}
