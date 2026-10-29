import { OCTAVE_SIZE, mod, toPitchClasses, type PitchClassSet } from './pitchClassSet.ts'

/** One voice moving from a tone of a chord to a tone of the next one. */
export interface Voice {
  readonly from: number
  readonly to: number
  /** Signed semitones, `to ≡ from + motion (mod 12)`; 0 for a common tone. */
  readonly motion: number
}

/**
 * Cost of a voice leading, compared lexicographically: the number of voices
 * (no needless doubling: as many voices as the larger chord has tones), the
 * total motion, the sum of squares (spread the motion, avoid large leaps),
 * the signed sum (ties go downwards).
 */
type Cost = [number, number, number, number]

function voiceCost(motion: number): Cost {
  return [1, Math.abs(motion), motion * motion, motion]
}

function addCost(a: Cost, b: Cost): Cost {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]]
}

function less(a: Cost, b: Cost): boolean {
  for (let k = 0; k < a.length; k++) {
    if (a[k] !== b[k]) {
      return a[k] < b[k]
    }
  }
  return false
}

type Path = { cost: Cost; pairs: [number, number][] }

/**
 * The voice leading from one chord to the next one, guessed from the pitch
 * classes alone: the voices do not cross (the order around the circle is
 * kept) and move as little as possible in total. Chords of different sizes
 * split or merge voices, as few as needed; every tone of both chords takes
 * part. Voices are
 * sorted by their starting tone and motion. No voices from or to silence.
 *
 * Method: the tones are lifted to the line of pitches (repeated in every
 * octave). A crossing-free voice leading pairs the sorted tones in a
 * monotone path, like dynamic time warping, closed into a cycle around the
 * octave. An optimal cycle has a step where both chords move on to their
 * next tone, so it is found as the best path between the pairs around such
 * a step, for each pair of a tone and a lifted tone at most a tritone apart.
 */
export function voiceLeading(fromSet: PitchClassSet, toSet: PitchClassSet): Voice[] {
  const a = liftedTones(fromSet)
  const b = liftedTones(toSet)
  const m = toPitchClasses(fromSet).length
  const n = toPitchClasses(toSet).length
  if (m === 0 || n === 0) {
    return []
  }
  let best: Path | null = null
  for (let r = 0; r < m; r++) {
    for (let s = -2 * n; s <= 2 * n; s++) {
      if (Math.abs(b(s) - a(r)) <= OCTAVE_SIZE / 2) {
        const path = warp(a, b, [r, s], [r + m - 1, s + n - 1])
        if (best === null || less(path.cost, best.cost)) {
          best = path
        }
      }
    }
  }
  return best!.pairs
    .map(([i, j]) => ({ from: mod(a(i), OCTAVE_SIZE), to: mod(b(j), OCTAVE_SIZE), motion: b(j) - a(i) }))
    .sort((x, y) => x.from - y.from || x.motion - y.motion)
}

/** The `i`-th tone of the set lifted to pitches: index `i + size` is an octave higher. */
function liftedTones(set: PitchClassSet): (i: number) => number {
  const tones = toPitchClasses(set)
  return (i) => tones[mod(i, tones.length)] + OCTAVE_SIZE * Math.floor(i / tones.length)
}

/** The cheapest monotone path of pairs from `start` to `end` (inclusive). */
function warp(
  a: (i: number) => number,
  b: (j: number) => number,
  [r, s]: [number, number],
  [lastI, lastJ]: [number, number],
): Path {
  // best[i][k]: the cheapest path from (r, s) to (r + i, s + k)
  const best: Path[][] = []
  for (let i = 0; i <= lastI - r; i++) {
    best.push([])
    for (let k = 0; k <= lastJ - s; k++) {
      const pair: [number, number] = [r + i, s + k]
      const own = voiceCost(b(pair[1]) - a(pair[0]))
      let before: Path | undefined
      for (const path of [best[i - 1]?.[k - 1], best[i - 1]?.[k], best[i]?.[k - 1]]) {
        if (path && (!before || less(path.cost, before.cost))) {
          before = path
        }
      }
      best[i][k] = before
        ? { cost: addCost(before.cost, own), pairs: [...before.pairs, pair] }
        : { cost: own, pairs: [pair] }
    }
  }
  return best[lastI - r][lastJ - s]
}

/** Total motion of the voices in semitones. */
export function totalMotion(voices: readonly Voice[]): number {
  return voices.reduce((sum, voice) => sum + Math.abs(voice.motion), 0)
}
